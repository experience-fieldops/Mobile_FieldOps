import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  WifiOff,
  ClipboardList,
  RefreshCw,
  User,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AppText from '../components/AppText';
import { MainTabParamList } from '../navigation/AppNavigator';

type SyncNavProp = BottomTabNavigationProp<MainTabParamList, 'Sincronizar'>;

// ─────────────────────────────────────────────────────────────
// Tipos de sincronização
// ─────────────────────────────────────────────────────────────

type SyncStatus = 'pending' | 'sent' | 'approved';

interface SyncItem {
  id: string;
  code: string;
  title: string;
  sentAt?: string; // presente em 'sent' e 'approved'
}

// ─────────────────────────────────────────────────────────────
// Dados mockados
// ─────────────────────────────────────────────────────────────

const PENDING_QUEUE: SyncItem[] = [
  { id: 'q1', code: 'INSP-03', title: 'Inspeção estrutural - Lifter do Motor' },
  { id: 'q2', code: 'INSP-02', title: 'Lubrificação dos rolamentos' },
];

const SENT_ITEMS: SyncItem[] = [
  {
    id: 's1',
    code: 'INSP-01',
    title: 'Inspeção estrutural - Lifter do Motor',
    sentAt: '20/07/2026',
  },
  {
    id: 's2',
    code: 'INSP-01',
    title: 'Inspeção estrutural - Lifter do Motor',
    sentAt: '13/05/2026',
  },
];

const APPROVED_ITEMS: SyncItem[] = [
  {
    id: 'a1',
    code: 'INSP-01',
    title: 'Inspeção estrutural - Lifter do Motor',
    sentAt: '20/07/2026',
  },
  {
    id: 'a2',
    code: 'INSP-01',
    title: 'Inspeção estrutural - Lifter do Motor',
    sentAt: '09/03/2026',
  },
];

// ─────────────────────────────────────────────────────────────
// Componente: card da fila pendente
// ─────────────────────────────────────────────────────────────

function PendingCard({ item }: { item: SyncItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardInfo}>
          <AppText style={styles.cardTitle}>{item.title}</AppText>
          <AppText style={styles.cardCode}>{item.code}</AppText>
        </View>
        <UploadCloud size={24} color="#E65100" />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: card de enviadas / aprovadas
// ─────────────────────────────────────────────────────────────

function SentCard({
  item,
  status,
}: {
  item: SyncItem;
  status: 'sent' | 'approved';
}) {
  const isSent = status === 'sent';
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardInfo}>
          <AppText style={styles.cardTitle}>{item.title}</AppText>
          <AppText style={styles.cardCode}>
            {item.code}
            {'   '}
            <AppText style={styles.cardSentDate}>
              Enviado em: {item.sentAt}
            </AppText>
          </AppText>
        </View>
        {isSent ? (
          <RefreshCw size={24} color="#7B6FC4" />
        ) : (
          <CheckCircle2 size={24} color="#45A835" />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente: seção agrupada
// ─────────────────────────────────────────────────────────────

function SectionBlock({
  title,
  subtitle,
  backgroundColor,
  children,
}: {
  title: string;
  subtitle: string;
  backgroundColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor }]}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      <AppText style={styles.sectionSubtitle}>{subtitle}</AppText>
      <View style={styles.sectionCards}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function SyncScreen() {
  const navigation = useNavigation<SyncNavProp>();

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

      {/* ── Título + Subtítulo ──────────────────────────── */}
      <View style={styles.titleSection}>
        <AppText style={styles.screenTitle}>Sincronização</AppText>
        <AppText style={styles.screenSubtitle}>
          Sem conexão - conecte-se a internet para realizar a sincronização dos
          arquivos
        </AppText>
      </View>

      {/* ── Conteúdo rolável ────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* Fila para sincronização */}
        <SectionBlock
          title="Fila para sincronização"
          subtitle="Inspeções pendentes de envio"
          backgroundColor="#FFF8E1"
        >
          {PENDING_QUEUE.map((item) => (
            <PendingCard key={item.id} item={item} />
          ))}
        </SectionBlock>

        {/* Enviadas */}
        <SectionBlock
          title="Enviadas"
          subtitle="Inspeções enviadas aguardando validação"
          backgroundColor="#EDE7F6"
        >
          {SENT_ITEMS.map((item) => (
            <SentCard key={item.id} item={item} status="sent" />
          ))}
        </SectionBlock>

        {/* Aprovadas */}
        <SectionBlock
          title="Aprovadas"
          subtitle="Inspeções sincronizadas e validadas"
          backgroundColor="#E8F5E9"
        >
          {APPROVED_ITEMS.map((item) => (
            <SentCard key={item.id} item={item} status="approved" />
          ))}
        </SectionBlock>
      </ScrollView>

      {/* ── Barra de navegação inferior ─────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Inspeções')}
        >
          <ClipboardList size={22} color="#888" />
          <AppText style={styles.tabLabel}>INSPEÇÕES</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <RefreshCw size={22} color="#45A835" />
          <AppText style={styles.tabLabelActive}>SINCRONIZAR</AppText>
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
    paddingBottom: 25
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

  // Título
  titleSection: {
    backgroundColor: '#132539',
    paddingHorizontal: 20,
    paddingBottom: 26,
    paddingTop: 10,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 6,
  },
  screenSubtitle: {
    color: '#AABBC8',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingTop: 16 },

  // Seção
  section: {
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginBottom: 12,
  },
  sectionCards: { gap: 10 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 3,
  },
  cardCode: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
  },
  cardSentDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#888',
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
});
