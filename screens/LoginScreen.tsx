// Ver onde eu dei o comit e acertar com a paola como iremos subir para o git(branch)

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

import { useState } from 'react';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AppText from '../components/AppText';
import { Eye, EyeOff } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <AppText style={styles.subtitle}>
          PLATAFORMA DE INPEÇÃO EM CAMPO
        </AppText>
      </View>

      <AppText style={styles.title}>Seja Bem-vindo(a)!</AppText>
      <AppText style={styles.text1}>Realize seu login para continuar</AppText>

      <View style={styles.margin}>
        <TextInput
          style={[styles.input, styles.emailInput]}
          placeholder="E-MAIL"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="SENHA"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#777" />
            ) : (
              <Eye size={20} color="#777" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.rememberContainer}>
          <TouchableOpacity style={styles.switch}>
            <View style={styles.switchCircle} />
          </TouchableOpacity>

          <AppText style={styles.rememberText}>Lembrar-me</AppText>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Main')}
        >
          <AppText style={styles.loginButtonText}>LOGAR</AppText>
        </TouchableOpacity>

        <TouchableOpacity>
          <AppText style={styles.forgotPassword}>Esqueci minha senha</AppText>
        </TouchableOpacity>
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
    borderRadius: 10,
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

  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  forgotPassword: {
    textAlign: 'center',
    color: '#24558A',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
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

  eyeText: {
    fontSize: 20,
    color: '#777',
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
    backgroundColor: '#45A835',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },

  switchCircle: {
    width: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
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
