import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, MapPin } from 'lucide-react-native';

import AppText from './AppText';
import { LocationError } from '../services/location';

interface Props {
  /** Momento em que a localização será coletada. */
  mode: 'start' | 'finish';
  /** Coleta em andamento (desabilita os botões). */
  busy: boolean;
  /** Falha da última tentativa; mostra a orientação correspondente. */
  error: LocationError | Error | null;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * Pedido de consentimento de localização (RN-058/RN-059).
 * A localização é lida uma vez ao iniciar e uma vez ao finalizar a
 * inspeção. Não há rastreamento contínuo (RN-060).
 */
export default function LocationConsent({
  mode,
  busy,
  error,
  onAccept,
  onCancel,
}: Props) {
  const denied = error instanceof LocationError && error.reason === 'denied';
  const blocked = denied && error.canAskAgain === false;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <MapPin size={34} color="#132539" />
      </View>

      <AppText style={styles.title}>
        {mode === 'start'
          ? 'Compartilhar localização'
          : 'Confirmar localização para finalizar'}
      </AppText>

      <AppText style={styles.text}>
        {mode === 'start'
          ? 'Para abrir e iniciar esta inspeção, o FieldOps precisa registrar a ' +
            'sua localização neste momento. Ela também será registrada ao ' +
            'finalizar a inspeção.'
          : 'Para finalizar esta inspeção, o FieldOps precisa registrar a sua ' +
            'localização neste momento.'}
      </AppText>
      <AppText style={styles.textSmall}>
        A localização é coletada uma única vez em cada etapa. O app não faz
        rastreamento contínuo.
      </AppText>

      <View style={styles.attention}>
        <AlertTriangle size={18} color="#E65100" />
        <AppText style={styles.attentionText}>
          <AppText style={styles.attentionBold}>ATENÇÃO: </AppText>
          se a localização não for compartilhada, a inspeção não poderá ser
          iniciada nem finalizada.
        </AppText>
      </View>

      {error && (
        <View style={styles.error}>
          <AppText style={styles.errorText}>
            {denied
              ? blocked
                ? 'A permissão está bloqueada. Abra as configurações do ' +
                  'aparelho, permita o acesso à localização para o app e ' +
                  'volte aqui.'
                : 'A permissão foi negada. Toque em "Permitir localização" ' +
                  'e aceite o pedido do aparelho para continuar.'
              : error.message}
          </AppText>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primary, busy && styles.disabled]}
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel="Permitir localização"
        disabled={busy}
        activeOpacity={0.8}
      >
        <AppText style={styles.primaryText}>
          {busy
            ? 'Obtendo localização…'
            : error
              ? 'Tentar novamente'
              : 'Permitir localização'}
        </AppText>
      </TouchableOpacity>

      {blocked && (
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => Linking.openSettings()}
          accessibilityRole="button"
          accessibilityLabel="Abrir configurações do aparelho"
          activeOpacity={0.8}
        >
          <AppText style={styles.secondaryText}>Abrir configurações</AppText>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onCancel} disabled={busy}>
        <AppText style={styles.cancel}>Cancelar</AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    justifyContent: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8EEF4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    color: '#132539',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  text: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  textSmall: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  attention: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  attentionText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    fontFamily: 'Inter_400Regular',
  },
  attentionBold: { fontFamily: 'Inter_700Bold' },
  error: {
    backgroundColor: '#FDECEA',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    fontFamily: 'Inter_400Regular',
  },
  primary: {
    backgroundColor: '#132539',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  secondary: {
    borderColor: '#132539',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#132539',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  cancel: {
    textAlign: 'center',
    color: '#1E88E5',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 6,
  },
});
