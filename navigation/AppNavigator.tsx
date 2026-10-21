import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InspectionsScreen from '../screens/InspectionsScreen';
import InspectionDetailScreen from '../screens/InspectionDetailScreen';
import InspectionFormScreen from '../screens/InspectionFormScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SyncScreen from '../screens/SyncScreen';
import { useAuth } from '../context/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  InspectionDetail: { inspectionId: string };
  InspectionForm: { inspectionId: string };
  QRScanner: { inspectionId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Inspeções: undefined;
  Sincronizar: undefined;
  Equipamentos: undefined;
  Perfil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Inspeções"
        component={InspectionsScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen
        name="Sincronizar"
        component={SyncScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />

      <Tab.Screen name="Dashboard" component={DashboardScreen} />

      <Tab.Screen name="Equipamentos" component={EquipmentScreen} />

      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Aguarda restaurar sessão do AsyncStorage antes de montar a navegação
  if (loading) return null;

  // Renderização condicional (padrão de auth flow do React Navigation):
  // quando o estado de autenticação muda (login/logout), o conjunto de
  // telas ativo é trocado e o navegador reinicia para a rota inicial certa.
  // - Deslogado: só existe "Login".
  // - Logado: só existem "Main" + telas de inspeção (Login não fica no back-stack).
  // Assim o logout sempre volta para a tela de login, forçando reautenticação,
  // e o login sempre cai na aba principal. Não é necessário initialRouteName.
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="InspectionDetail"
              component={InspectionDetailScreen}
            />
            <Stack.Screen
              name="InspectionForm"
              component={InspectionFormScreen}
            />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
