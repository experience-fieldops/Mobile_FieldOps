
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { User } from '../types/user';
import { authenticate } from '../services/authService';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    persist: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
}

interface StoredSession {
  user: User;
  token: string;
  expiresAt: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'fieldops_session';
const OLD_STORAGE_KEY = '@fieldops:user';

const isNative = Platform.OS !== 'web';

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sessão persistida
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        // Remover sessão antiga que não possuía JWT
        await AsyncStorage.removeItem(OLD_STORAGE_KEY);

        if (!isNative) return;

        const raw = await SecureStore.getItemAsync(
          SESSION_KEY
        );

        if (!raw) return;

        const session = JSON.parse(raw) as StoredSession;

        const valid =
          typeof session.token === 'string' &&
          session.token.length > 0 &&
          typeof session.expiresAt === 'number' &&
          Date.now() < session.expiresAt &&
          session.user != null;

        if (!valid) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
          return;
        }

        if (mounted) {
          setUser(session.user);
          setToken(session.token);
        }
      } catch (error) {
        console.error(
          'Erro ao restaurar sessão:',
          error
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Login pelo backend
  const login = useCallback(
    async (
      email: string,
      password: string,
      persist: boolean
    ) => {
      const response = await authenticate(email, password);

      console.log('JWT recebido:', {
  possuiToken: Boolean(response.token),
  tipo: response.type,
  expiracaoMs: response.expiresIn,
  usuario: response.user.email,
  });

      if (
        !response.token ||
        !Number.isFinite(response.expiresIn) ||
        response.expiresIn <= 0
      ) {
        throw new Error(
          'Resposta de autenticação inválida.'
        );
      }

      const authenticatedUser: User = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role as User['role'],
        organization: 'FieldOps',
      };

      const session: StoredSession = {
        user: authenticatedUser,
        token: response.token,
        expiresAt: Date.now() + response.expiresIn,
      };

      if (isNative) {
        if (persist) {
          await SecureStore.setItemAsync(
            SESSION_KEY,
            JSON.stringify(session)
          );
        } else {
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      }

      setUser(authenticatedUser);
      setToken(response.token);
    },
    []
  );

  // Logout
  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);

    if (isNative) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }

    await AsyncStorage.removeItem(OLD_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth deve ser usado dentro de AuthProvider'
    );
  }

  return ctx;
}
