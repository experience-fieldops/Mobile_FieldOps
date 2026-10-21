import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { User } from '../types/user';

// ─── Mock de teste (offline) ────────────────────────────────────────────────
// Credenciais fixas para testar o fluxo de login sem backend.
// Remova este bloco e restaure a chamada a getAllUsers() ao voltar para a API.
const MOCK_USER: User = {
  id: 1,
  name: 'Admin Teste',
  email: 'admin@fieldops.com',
  role: 'inspetor',
  organization: 'FieldOps',
};
const MOCK_PASSWORD = '123456';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Usuário atualmente logado, ou null se não autenticado. */
  user: User | null;
  /** true enquanto verifica a sessão salva no storage na inicialização. */
  loading: boolean;
  /**
   * Autentica pelo e-mail + senha (mock offline para testes).
   * `persist` (Lembrar-me) define se a sessão é gravada no AsyncStorage e
   * restaurada na próxima abertura do app.
   */
  login: (email: string, password: string, persist: boolean) => Promise<void>;
  /** Remove a sessão local e desloga o usuário. */
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = '@fieldops:user';

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaura sessão persistida ao abrir o app
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as User);
      })
      .catch(() => {
        // storage corrompido: ignora e segue sem sessão
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Login mockado para testes offline.
   * Compara e-mail + senha contra credenciais fixas (MOCK_USER / MOCK_PASSWORD).
   * `persist` controla se a sessão é gravada no AsyncStorage (Lembrar-me):
   * quando false, remove qualquer sessão antiga, garantindo que o app abra
   * sempre no login na próxima vez.
   * Troque de volta por getAllUsers() quando o backend estiver disponível.
   */
  const login = useCallback(
    async (email: string, password: string, persist: boolean) => {
      const emailOk =
        email.trim().toLowerCase() === MOCK_USER.email.toLowerCase();
      const passOk = password === MOCK_PASSWORD;

      if (!emailOk || !passOk) {
        throw new Error('E-mail ou senha incorretos.');
      }

      if (persist) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_USER));
      } else {
        // Limpa qualquer sessão anterior para que o app não autologue
        // quando o usuário optou por não "Lembrar-me".
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setUser(MOCK_USER);
    },
    [],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
