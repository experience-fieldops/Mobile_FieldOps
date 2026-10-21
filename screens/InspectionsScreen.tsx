import { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import {
  WifiOff,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  User,
  FileX,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import {
  MOCK_INSPECTIONS,
  Inspection,
  InspectionStatus,
  Priority,
} from '../data/inspections';
import { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';

type InspectionsNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Inspeções'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type FilterOption = 'Todas' | InspectionStatus;
const FILTERS: FilterOption[] = [
  'Todas',
  'Atribuída',
  'Em Andamento',
  'Atrasada',
  'Devolvida',
];

const priorityColors: Record<Priority, string> = {
  Alta: '#E53935',
  Médio: '#FFA000',
  Baixo: '#1E88E5',
};

// ─────────────────────────────────────────────────────────────
// Componentes internos
// ─────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <View style={[styles.badge, { backgroundColor: priorityColors[priority] }]}>
      <AppText style={styles.badgeText}>{priority}</AppText>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );
}

function InspectionCard({
  item,
  onPress,
}: {
  item: Inspection;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <PriorityBadge priority={item.priority} />
          <AppText style={styles.cardCode}>{item.code}</AppText>
        </View>
        <ChevronRight size={18} color="#999" />
      </View>

      <AppText style={styles.cardTitle}>{item.title}</AppText>

      <View style={styles.progressRow}>
        <ProgressBar progress={item.progress} />
        <AppText style={styles.progressLabel}>{item.progress}%</AppText>
      </View>

      <AppText
        style={[
          styles.deadline,
          item.deadlineOverdue && styles.deadlineOverdue,
        ]}
      >
        Prazo:{' '}
        <AppText
          style={[
            styles.deadlineValue,
            item.deadlineOverdue && styles.deadlineOverdue,
          ]}
        >
          {item.deadline}
        </AppText>
      </AppText>
    </TouchableOpacity>
  );
}

function EmptyState({ filter }: { filter: FilterOption }) {
  const message =
    filter === 'Todas'
      ? 'Nenhuma inspeção atribuída.'
      : `Nenhuma inspeção com status "${filter}".`;
  return (
    <View style={styles.emptyContainer}>
      <FileX size={48} color="#BDBDBD" />
      <AppText style={styles.emptyText}>{message}</AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal de detalhe da inspeção
// ─────────────────────────────────────────────────────────────

function InspectionModal({
  inspection,
  onClose,
  onScan,
}: {
  inspection: Inspection | null;
  onClose: () => void;
  onScan: () => void;
}) {
  // Modal não visível se não houver inspeção selecionada
  if (!inspection) return null;

  return (
    <Modal
      visible={!!inspection}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Overlay escurecido — toque fora fecha o modal */}
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        {/* O stopPropagation impede que o toque dentro do card feche o modal */}
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Título */}
          <AppText style={styles.modalTitle}>{inspection.title}</AppText>

          {/* Linha: badge de prioridade + código + prazo */}
          <View style={styles.modalSubHeader}>
            <PriorityBadge priority={inspection.priority} />
            <AppText style={styles.modalCode}>{inspection.code}</AppText>
            <View style={styles.modalDeadlineGroup}>
              <AppText style={styles.modalDeadlineLabel}>Prazo: </AppText>
              <AppText
                style={[
                  styles.modalDeadlineValue,
                  inspection.deadlineOverdue && styles.deadlineOverdue,
                ]}
              >
                {inspection.deadline}
              </AppText>
            </View>
          </View>

          {/* Informações */}
          <View style={styles.modalInfoBlock}>
            <AppText style={styles.modalInfoLine}>
              Atribuinte : {inspection.assignee}
            </AppText>
            <AppText style={styles.modalInfoLine}>
              Equipamento : {inspection.equipment}
            </AppText>
            <AppText style={styles.modalInfoLine}>
              Tempo estimado : {inspection.estimatedTime}
            </AppText>
            <AppText style={styles.modalInfoLine}>
              Área : {inspection.area}
            </AppText>
          </View>

          {/* Botões */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <AppText style={styles.btnCancelText}>Cancelar</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnScan}
              onPress={onScan}
              activeOpacity={0.7}
            >
              <AppText style={styles.btnScanText}>Escanear</AppText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function InspectionsScreen() {
  const navigation = useNavigation<InspectionsNavProp>();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todas');

  // Guarda a inspeção selecionada; null = modal fechado
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);

  const filteredInspections = useMemo(() => {
    if (activeFilter === 'Todas') return MOCK_INSPECTIONS;
    return MOCK_INSPECTIONS.filter((i) => i.status === activeFilter);
  }, [activeFilter]);

  const counts = useMemo(
    () => ({
      assigned: MOCK_INSPECTIONS.length,
      inProgress: MOCK_INSPECTIONS.filter((i) => i.status === 'Em Andamento')
        .length,
      overdue: MOCK_INSPECTIONS.filter((i) => i.status === 'Atrasada').length,
      returned: MOCK_INSPECTIONS.filter((i) => i.status === 'Devolvida').length,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#132539" />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <AppText style={styles.headerBrand}>
          <AppText style={styles.headerBrandField}>FIELD </AppText>
          <AppText style={styles.headerBrandOps}>OPS</AppText>
        </AppText>
        <View style={styles.offlineContainer}>
          <AppText style={styles.offlineText}>Modo Offline</AppText>
          <WifiOff size={18} color="#E53935" style={styles.offlineIcon} />
        </View>
      </View>

      {/* ── Título + Contadores ─────────────────────────── */}
      <View style={styles.titleSection}>
        <AppText style={styles.screenTitle}>Minhas Inspeções</AppText>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText style={styles.statNumber}>{counts.assigned}</AppText>
            <AppText style={styles.statLabel}>ATRIBUÍDAS</AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={styles.statNumber}>{counts.inProgress}</AppText>
            <AppText style={styles.statLabel}>EM ANDAMENTO</AppText>
          </View>
          <View style={[styles.statCard, styles.statCardAlert]}>
            <AppText style={[styles.statNumber, styles.statNumberAlert]}>
              {counts.overdue}
            </AppText>
            <AppText style={[styles.statLabel, styles.statLabelAlert]}>
              ATRASADAS
            </AppText>
          </View>
          <View style={[styles.statCard, styles.statCardReturned]}>
            <AppText style={[styles.statNumber, styles.statNumberReturned]}>
              {counts.returned}
            </AppText>
            <AppText style={[styles.statLabel, styles.statLabelReturned]}>
              DEVOLVIDAS
            </AppText>
          </View>
        </View>
      </View>

      {/* ── Filtros por status ──────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <AppText
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Lista ou estado vazio ───────────────────────── */}
      {filteredInspections.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredInspections.map((item) => (
            <InspectionCard
              key={item.id}
              item={item}
              onPress={() => setSelectedInspection(item)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Barra de navegação inferior ─────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <ClipboardList size={22} color="#45A835" />
          <AppText style={styles.tabLabelActive}>INSPEÇÕES</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Sincronizar')}
        >
          <RefreshCw size={22} color="#888" />
          <AppText style={styles.tabLabel}>SINCRONIZAR</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Perfil')}
        >
          <User size={22} color="#888" />
          <AppText style={styles.tabLabel}>PERFIL</AppText>
        </TouchableOpacity>
      </View>

      {/* ── Modal de detalhe ────────────────────────────── */}
      <InspectionModal
        inspection={selectedInspection}
        onClose={() => setSelectedInspection(null)}
        onScan={() => {
          const id = selectedInspection?.id ?? '';
          setSelectedInspection(null);
          navigation.navigate('QRScanner', { inspectionId: id });
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F4' },

  // Header
  header: {
    backgroundColor: '#132539',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
  },
  headerBrand: {},
  headerBrandField: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  headerBrandOps: {
    color: '#45A835',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  offlineContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offlineText: {
    color: '#E53935',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  offlineIcon: { marginLeft: 4 },

  // Title + Stats
  titleSection: {
    backgroundColor: '#132539',
    paddingHorizontal: 15,
    paddingBottom: 24,
    paddingTop: 10,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    paddingHorizontal: 5,
  },
  statsGrid: { gap: 8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statCardAlert: { backgroundColor: '#FFEBEE' },
  statNumber: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#132539' },
  statNumberAlert: { color: '#E53935' },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    marginTop: 2,
  },
  statLabelAlert: { color: '#E53935' },
  statCardReturned: { backgroundColor: '#FFF3E0' },
  statNumberReturned: { color: '#E65100' },
  statLabelReturned: { color: '#E65100' },

  // Filtros
  filtersScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    maxHeight: 52,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: { backgroundColor: '#132539', borderColor: '#132539' },
  filterChipText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'Inter_400Regular',
  },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  // Lista
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardCode: { fontSize: 13, color: '#555', fontFamily: 'Inter_400Regular' },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 12,
  },

  // Badge
  badge: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Inter_700Bold' },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#132539', borderRadius: 4 },
  progressLabel: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'Inter_400Regular',
    width: 34,
    textAlign: 'right',
  },

  // Deadline
  deadline: { fontSize: 13, color: '#555', fontFamily: 'Inter_400Regular' },
  deadlineValue: { fontFamily: 'Inter_400Regular', color: '#555' },
  deadlineOverdue: { color: '#E53935', fontFamily: 'Inter_700Bold' },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#BDBDBD',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 10, color: '#888', fontFamily: 'Inter_400Regular' },
  tabLabelActive: {
    fontSize: 10,
    color: '#45A835',
    fontFamily: 'Inter_700Bold',
  },

  // ── Modal ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 12,
  },
  modalSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  modalCode: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'Inter_400Regular',
  },
  modalDeadlineGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  modalDeadlineLabel: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'Inter_400Regular',
  },
  modalDeadlineValue: {
    fontSize: 13,
    color: '#555',
    fontFamily: 'Inter_700Bold',
  },
  modalInfoBlock: {
    gap: 6,
    marginBottom: 24,
  },
  modalInfoLine: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Inter_400Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#45A835',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    color: '#45A835',
    fontFamily: 'Inter_700Bold',
  },
  btnScan: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#45A835',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnScanText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
});
