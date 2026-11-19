import { View, StyleSheet } from 'react-native';
import { Wifi, WifiOff } from 'lucide-react-native';

import AppText from './AppText';
import { useIsOnline } from '../services/network';

/**
 * Indicador de conexão do cabeçalho.
 * Sem internet: "Modo Offline" em vermelho. Com internet: "Online" em verde.
 * Enquanto o estado ainda não é conhecido, não exibe nada.
 */
export default function NetworkStatus() {
  const online = useIsOnline();
  if (online === null) return null;

  const color = online ? '#45A835' : '#E53935';
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={online ? 'Online' : 'Modo Offline'}
    >
      <AppText style={[styles.text, { color }]}>
        {online ? 'Online' : 'Modo Offline'}
      </AppText>
      {online ? (
        <Wifi size={18} color={color} style={styles.icon} />
      ) : (
        <WifiOff size={18} color={color} style={styles.icon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  icon: { marginLeft: 4 },
});
