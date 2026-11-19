import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, EyeOff } from 'lucide-react-native';

import { RootStackParamList } from '../navigation/AppNavigator';
import AppText from '../components/AppText';
import { useAuth } from '../context/AuthContext';
import { getHttpStatus } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Padrão desmarcado: o app abre sempre no login. Marque "Lembrar-me"
  // para ativar o auto-login na próxima abertura.
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  // Mensagem exibida abaixo da senha quando o backend recusa as credenciais.
  const [loginError, setLoginError] = useState<string | null>(null);

  function handleEmailChange(value: string) {
    setEmail(value);
    if (loginError) setLoginError(null);
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (loginError) setLoginError(null);
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Campos obrigatórios', 'Preencha o e-mail e a senha.');
      return;
    }

    setLoginError(null);
    setLoading(true);
    const attemptStart = Date.now();
    if (__DEV__) console.log('[Login] Tentativa iniciada (loading=true).');
    try {
      await login(email, password, rememberMe);
      // A troca de Login -> Main é controlada pelo estado de autenticação
      // no AppNavigator (renderização condicional), então não é preciso
      // navegar manualmente aqui.
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 401 || status === 400) {
        // 401: e-mail inexistente ou senha errada (o backend responde igual
        //      para os dois, sem revelar se a conta existe).
        // 400: e-mail com formato inválido (@Email no LoginRequest). Campos
        //      vazios já são barrados antes da chamada.
        // Em ambos, mostra a mesma mensagem junto aos campos.
        setLoginError('E-mail ou senha incorretos.');
      } else {
        // Rede, timeout, servidor etc. seguem no alerta, com a mensagem real.
        const message =
          err instanceof Error ? err.message : 'Erro ao realizar login.';
        Alert.alert('Falha no login', message);
      }
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log('[Login] Tentativa finalizada (loading=false):', {
          durationMs: Date.now() - attemptStart,
        });
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <AppText style={styles.subtitle}>
          PLATAFORMA DE INSPEÇÃO EM CAMPO
        </AppText>
      </View>

      <AppText style={styles.title}>Seja Bem-vindo(a)!</AppText>
      <AppText style={styles.text1}>Realize seu login para continuar</AppText>

      <View style={styles.margin}>
        <TextInput
          style={[
            styles.input,
            styles.emailInput,
            loginError && styles.inputError,
          ]}
          placeholder="E-MAIL"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={handleEmailChange}
          editable={!loading}
        />

        <View
          style={[
            styles.passwordContainer,
            loginError && styles.passwordContainerError,
          ]}
        >
          <TextInput
            style={styles.passwordInput}
            placeholder="SENHA"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={handlePasswordChange}
            editable={!loading}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? 'Ocultar senha' : 'Mostrar senha'
            }
          >
            {showPassword ? (
              <EyeOff size={20} color="#777" />
            ) : (
              <Eye size={20} color="#777" />
            )}
          </TouchableOpacity>
        </View>

        {loginError ? (
          <AppText
            style={styles.errorText}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {loginError}
          </AppText>
        ) : null}

        <View style={styles.rememberContainer}>
          <TouchableOpacity
            style={[styles.switch, rememberMe && styles.switchActive]}
            onPress={() => setRememberMe((v) => !v)}
            accessibilityRole="switch"
            accessibilityLabel="Lembrar de mim"
            accessibilityState={{ checked: rememberMe }}
          >
            <View
              style={[
                styles.switchCircle,
                rememberMe && styles.switchCircleActive,
              ]}
            />
          </TouchableOpacity>
          <AppText style={styles.rememberText}>Lembrar-me</AppText>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
          accessibilityState={{ disabled: loading, busy: loading }}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <AppText style={styles.loginButtonText}>LOGAR</AppText>
          )}
        </TouchableOpacity>

        <TouchableOpacity>
          <AppText style={styles.forgotPassword}>Esqueci minha senha</AppText>
        </TouchableOpacity>

        <AppText style={styles.version}>v1.0</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  form: {
    width: '100%',
    height: '45%',
    justifyContent: 'center',
    paddingHorizontal: 50,
    backgroundColor: '#132539',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
  },

  logo: {
    width: 200,
    height: 150,
    alignSelf: 'center',
    marginBottom: 30,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 25,
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#ffffff',
  },

  text1: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#B5B5B5',
    borderRadius: 9,
    paddingHorizontal: 15,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginBottom: 20,
  },

  emailInput: {
    marginBottom: 20,
  },

  forgotPassword: {
    textAlign: 'center',
    color: '#24558A',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  version: {
    textAlign: 'center',
    color: '#AAAAAA',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 20,
  },

  passwordContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#B5B5B5',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  // Estado de erro de login. A margem menor do campo de senha (6) somada à
  // altura da mensagem (16) e ao espaço abaixo dela (3) mantém os mesmos 25
  // do estado normal, então o restante da tela não se desloca.
  inputError: {
    borderColor: '#E53935',
  },

  passwordContainerError: {
    borderColor: '#E53935',
    marginBottom: 6,
  },

  errorText: {
    color: '#E53935',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 3,
    marginLeft: 4,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  eyeButton: {
    width: 45,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    marginLeft: 8,
  },

  switch: {
    width: 45,
    height: 22,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },

  switchActive: {
    backgroundColor: '#45A835',
  },

  switchCircle: {
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },

  switchCircleActive: {
    alignSelf: 'flex-end',
  },

  rememberText: {
    fontSize: 12,
    color: '#333',
  },

  loginButton: {
    height: 38,
    borderRadius: 8,
    backgroundColor: '#45A835',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },

  margin: {
    alignSelf: 'center',
    paddingHorizontal: 30,
    width: '100%',
  },
});
