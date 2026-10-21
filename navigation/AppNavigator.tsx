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

  // initialRouteName direciona automaticamente para a tela correta.
  // O React Navigation ignora rotas não definidas no historial de navegação,
  // portanto Login nunca aparece no back-stack quando o usuário já está logado.
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? 'Main' : 'Login'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="InspectionDetail" component={InspectionDetailScreen} />
        <Stack.Screen name="InspectionForm" component={InspectionFormScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
