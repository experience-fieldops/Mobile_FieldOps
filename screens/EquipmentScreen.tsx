import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  WifiOff,
  ClipboardList,
  RefreshCw,
  User,
  Wrench,
  MapPin,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AppText from '../components/AppText';
import { MainTabParamList } from '../navigation/AppNavigator';
import { getAssignedInspections } from '../services/inspectionService';
import { getEquipmentsBySite } from '../services/equipmentService';
import { EquipmentResponse } from '../types/inspectionApi';
import { useAuth } from '../context/AuthContext';

type EquipmentNavProp = BottomTabNavigationProp<
  MainTabParamList,
  'Equipamentos'
>;

interface SiteGroup {
  siteId: number;
  siteName: string;
  equipments: EquipmentResponse[];
}

// Rótulo PT do status do equipamento.
const STATUS_LABEL: Record<EquipmentResponse['status'], string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  DECOMMISSIONED: 'Descomissionado',
};

const STATUS_COLOR: Record<EquipmentResponse['status'], string> = {
  ACTIVE: '#2E7D32',
  INACTIVE: '#E65100',
  DECOMMISSIONED: '#9E9E9E',
};

// ─────────────────────────────────────────────────────────────
// Componentes internos
// ─────────────────────────────────────────────────────────────

function EquipmentCard({ item }: { item: EquipmentResponse }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Wrench size={20} color="#132539" />
      </View>
      <View style={styles.cardInfo}>
        <AppText style={styles.cardName}>{item.name}</AppText>
        {item.description ? (
          <AppText style={styles.cardDesc}>{item.description}</AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.statusChip,
          { backgroundColor: `${STATUS_COLOR[item.status]}20` },
        ]}
      >
        <AppText
          style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}
        >
          {STATUS_LABEL[item.status]}
        </AppText>
      </View>
    </View>
  );
}

function SiteSection({ group }: { group: SiteGroup }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MapPin size={16} color="#45A835" />
        <AppText style={styles.sectionTitle}>{group.siteName}</AppText>
      </View>
      {group.equipments.length === 0 ? (
        <AppText style={styles.emptySection}>
          Nenhum equipamento neste local.
        </AppText>
      ) : (
        group.equipments.map((eq) => <EquipmentCard key={eq.id} item={eq} />)
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function EquipmentScreen() {
  const navigation = useNavigation<EquipmentNavProp>();
  const { user, token } = useAuth();

  const [groups, setGroups] = useState<SiteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token || user == null) {
        setError('Sessão inválida. Faça login novamente.');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        // Deriva os sites distintos das inspeções atribuídas ao técnico.
        const page = await getAssignedInspections(token, user.id, 0, 100);
        const sitesMap = new Map<number, string>();
        for (const insp of page.content) {
          if (!sitesMap.has(insp.siteId)) {
            sitesMap.set(insp.siteId, insp.siteName);
          }
        }

        // Para cada site, busca os equipamentos.
        const result: SiteGroup[] = [];
        for (const [siteId, siteName] of sitesMap) {
          const eqPage = await getEquipmentsBySite(token, siteId);
          result.push({ siteId, siteName, equipments: eqPage.content });
        }

        setGroups(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar equipamentos.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, user],
  );

  useFocusEffect(
    useCallback(() => {
      load('initial');
    }, [load]),
  );

  const isEmpty = groups.every((g) => g.equipments.length === 0);

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

      {/* ── Título ──────────────────────────────────────── */}
      <View style={styles.titleSection}>
        <AppText style={styles.screenTitle}>Equipamentos</AppText>
        <AppText style={styles.screenSubtitle}>
          Equipamentos dos locais das suas inspeções
        </AppText>
      </View>

      {/* ── Conteúdo ────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#132539" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <AlertCircle size={44} color="#E53935" />
          <AppText style={styles.errorText}>{error}</AppText>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => load('initial')}
            activeOpacity={0.7}
          >
            <AppText style={styles.retryBtnText}>Tentar novamente</AppText>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 || isEmpty ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
            />
          }
        >
          <View style={styles.centerState}>
            <Wrench size={48} color="#BDBDBD" />
            <AppText style={styles.emptyText}>
              Nenhum equipamento disponível.
            </AppText>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load('refresh')}
            />
          }
        >
          {groups.map((group) => (
            <SiteSection key={group.siteId} group={group} />
          ))}
        </ScrollView>
      )}

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

  // Título
  titleSection: {
    backgroundColor: '#132539',
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  scrollContent: { padding: 16, gap: 16 },
  emptyScroll: { flexGrow: 1 },

  // Seção por site
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
  },
  emptySection: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#888',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0F3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },

  // Estados
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#E53935',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#BDBDBD',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#132539',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
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
});
