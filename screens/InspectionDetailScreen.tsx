import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { ArrowLeft, MapPin, Wrench, Calendar } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import { MOCK_INSPECTIONS, Priority } from '../data/inspections';
import { RootStackParamList } from '../navigation/AppNavigator';

type DetailRouteProp = RouteProp<RootStackParamList, 'InspectionDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const priorityColors: Record<Priority, string> = {
  Alta: '#E53935',
  Média: '#FFA000',
  Baixa: '#1E88E5',
};

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );
}

export default function InspectionDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  // useRoute lê os parâmetros passados pela tela anterior (inspectionId)
  const route = useRoute<DetailRouteProp>();
  const { inspectionId } = route.params;

  // Busca a inspeção pelo id recebido
  const inspection = MOCK_INSPECTIONS.find((i) => i.id === inspectionId);

  // Segurança: se por algum motivo o id não existir, mostra mensagem
  if (!inspection) {
    return (
      <View style={styles.notFound}>
        <AppText style={styles.notFoundText}>Inspeção não encontrada.</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AppText style={styles.backLink}>Voltar</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const badgeColor = priorityColors[inspection.priority];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#132539" />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Detalhe da Inspeção</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identificação ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.codeRow}>
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <AppText style={styles.badgeText}>{inspection.priority}</AppText>
            </View>
            <AppText style={styles.code}>{inspection.code}</AppText>
          </View>

          <AppText style={styles.title}>{inspection.title}</AppText>

          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <AppText style={styles.statusText}>{inspection.status}</AppText>
            </View>
          </View>
        </View>

        {/* ── Progresso ──────────────────────────────────── */}
        <View style={styles.card}>
          <AppText style={styles.sectionTitle}>Progresso</AppText>
          <View style={styles.progressRow}>
            <ProgressBar progress={inspection.progress} />
            <AppText style={styles.progressLabel}>{inspection.progress}%</AppText>
          </View>
        </View>

        {/* ── Informações ────────────────────────────────── */}
        <View style={styles.card}>
          <AppText style={styles.sectionTitle}>Informações</AppText>

          <View style={styles.infoRow}>
            <Calendar size={16} color="#555" />
            <View style={styles.infoTextGroup}>
              <AppText style={styles.infoLabel}>Prazo</AppText>
              <AppText
                style={[
                  styles.infoValue,
                  inspection.deadlineOverdue && styles.overdueText,
                ]}
              >
                {inspection.deadline}
                {inspection.deadlineOverdue ? '  ⚠ Atrasada' : ''}
              </AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Wrench size={16} color="#555" />
            <View style={styles.infoTextGroup}>
              <AppText style={styles.infoLabel}>Equipamento</AppText>
              <AppText style={styles.infoValue}>{inspection.equipment}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MapPin size={16} color="#555" />
            <View style={styles.infoTextGroup}>
              <AppText style={styles.infoLabel}>Local</AppText>
              <AppText style={styles.infoValue}>{inspection.location}</AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },

  // Header
  header: {
    backgroundColor: '#132539',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
  },
  backButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  headerSpacer: { width: 30 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Identification
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_700Bold' },
  code: { fontSize: 13, color: '#555', fontFamily: 'Inter_400Regular' },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#132539', marginBottom: 12 },
  statusRow: { flexDirection: 'row' },
  statusChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, color: '#2E7D32', fontFamily: 'Inter_700Bold' },

  // Progress
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#132539', borderRadius: 5 },
  progressLabel: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'Inter_700Bold',
    width: 38,
    textAlign: 'right',
  },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  infoTextGroup: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, color: '#132539', fontFamily: 'Inter_700Bold', marginTop: 2 },
  overdueText: { color: '#E53935' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },

  // Not found
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 15, color: '#555' },
  backLink: { fontSize: 14, color: '#1E88E5', fontFamily: 'Inter_700Bold' },
});
