import { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import { ArrowLeft, ScanLine } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getEquipmentByQrCode } from '../services/equipmentService';
import { useAuth } from '../context/AuthContext';

type ScannerRouteProp = RouteProp<RootStackParamList, 'QRScanner'>;
type ScannerNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function QRScannerScreen() {
  const navigation = useNavigation<ScannerNavProp>();
  const route = useRoute<ScannerRouteProp>();
  const { inspectionId } = route.params;
  const { token } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Permissão ainda não solicitada ───────────────────────
  if (!permission) {
    return <View style={styles.container} />;
  }

  // ── Permissão negada ─────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#132539" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>
            <AppText style={styles.headerField}>FIELD </AppText>
            <AppText style={styles.headerOps}>OPS</AppText>
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.permissionBox}>
          <ScanLine size={48} color="#132539" />
          <AppText style={styles.permissionTitle}>
            Permissão de câmera necessária
          </AppText>
          <AppText style={styles.permissionDesc}>
            Precisamos acessar a câmera para escanear o QR code do equipamento.
          </AppText>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <AppText style={styles.permissionBtnText}>Permitir câmera</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Leitura do QR code ───────────────────────────────────
  // Resolve o equipamento no backend a partir do conteúdo lido e, se
  // válido e ativo, segue para a execução do checklist da inspeção.
  const handleBarCodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (scanned || resolving) return;
      setScanned(true);
      setScanError(null);

      if (!token) {
        setScanError('Sessão inválida. Faça login novamente.');
        return;
      }

      setResolving(true);
      try {
        const equipment = await getEquipmentByQrCode(token, data);

        if (equipment.status !== 'ACTIVE') {
          setScanError(
            `Equipamento "${equipment.name}" não está ativo (${equipment.status}).`,
          );
          return;
        }

        navigation.replace('ChecklistExecution', { inspectionId });
      } catch {
        setScanError('QR code não reconhecido. Tente novamente.');
      } finally {
        setResolving(false);
      }
    },
    [scanned, resolving, token, inspectionId, navigation],
  );

  // Permite tentar de novo após erro de leitura.
  function rescan() {
    setScanned(false);
    setScanError(null);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#132539" />

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>
          <AppText style={styles.headerField}>FIELD </AppText>
          <AppText style={styles.headerOps}>OPS</AppText>
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Câmera ───────────────────────────────────────── */}
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* ── Overlay com moldura ──────────────────────────── */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Topo escurecido */}
        <View style={styles.overlayTop} />

        <View style={styles.overlayMiddle}>
          {/* Lateral esquerda */}
          <View style={styles.overlaySide} />

          {/* Janela transparente com moldura */}
          <View style={styles.scanWindow}>
            {/* Cantos da moldura */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          {/* Lateral direita */}
          <View style={styles.overlaySide} />
        </View>

        {/* Base escurecida com instrução */}
        <View style={styles.overlayBottom}>
          <ScanLine size={20} color="#FFFFFF" />
          <AppText style={styles.overlayHint}>
            Aponte para o QR code do equipamento
          </AppText>
        </View>
      </View>

      {/* ── Resolvendo o equipamento ───────────────────────── */}
      {resolving && (
        <View style={styles.rescanContainer}>
          <View style={styles.resolvingBox}>
            <ActivityIndicator color="#FFFFFF" />
            <AppText style={styles.rescanText}>
              Verificando equipamento…
            </AppText>
          </View>
        </View>
      )}

      {/* ── Erro de leitura + reescanear ───────────────────── */}
      {scanned && !resolving && scanError && (
        <View style={styles.rescanContainer}>
          <AppText style={styles.scanErrorText}>{scanError}</AppText>
          <TouchableOpacity
            style={styles.rescanBtn}
            onPress={rescan}
            activeOpacity={0.7}
          >
            <AppText style={styles.rescanText}>Escanear novamente</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────

const WINDOW_SIZE = 240;
const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#132539' },

  // Header
  header: {
    backgroundColor: '#132539',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerField: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  headerOps: { color: '#45A835', fontSize: 15, fontFamily: 'Inter_700Bold' },
  headerSpacer: { width: 30 },

  // Câmera — ocupa todo o espaço restante
  camera: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 62 },

  // Overlay escurecido ao redor da janela de scan
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 62,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: WINDOW_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanWindow: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 8,
  },
  overlayHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Cantos da moldura verde
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#45A835',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },

  // Reescanear
  rescanContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanBtn: {
    backgroundColor: '#45A835',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  rescanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  resolvingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanErrorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(229,57,53,0.85)',
    borderRadius: 6,
    paddingVertical: 8,
  },

  // Permissão
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 8,
    backgroundColor: '#45A835',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
