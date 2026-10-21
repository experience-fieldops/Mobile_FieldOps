import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import {
  WifiOff,
  ClipboardList,
  RefreshCw,
  User,
  Building2,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AppText from '../components/AppText';
import { MainTabParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type ProfileNavProp = BottomTabNavigationProp<MainTabParamList, 'Perfil'>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Gera as iniciais a partir do nome completo (ex: "João Silva" → "JS"). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────────
// Componente: item do menu
// ─────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  isFirst?: boolean;
}

function MenuItem({ icon, label, subtitle, isFirst }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isFirst && styles.menuItemBorder]}
      activeOpacity={0.6}
    >
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuText}>
        <AppText style={styles.menuLabel}>{label}</AppText>
        {subtitle ? (
          <AppText style={styles.menuSubtitle}>{subtitle}</AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, logout } = useAuth();

  // Fallback para quando o usuário ainda não estiver carregado
  const displayName = user?.name ?? '—';
  const displayRole = user?.role ?? '';
  const displayOrg = user?.organization ?? '—';
  const initials = user?.name ? getInitials(user.name) : '?';

  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#132539" />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Topo: logo + modo offline */}
        <View style={styles.headerTop}>
          <AppText style={styles.headerBrand}>
            <AppText style={styles.headerBrandField}>FIELD </AppText>
            <AppText style={styles.headerBrandOps}>OPS</AppText>
          </AppText>
          <View style={styles.offlineContainer}>
            <AppText style={styles.offlineText}>Modo Offline</AppText>
            <WifiOff size={18} color="#E53935" style={styles.offlineIcon} />
          </View>
        </View>

        {/* Avatar + nome + cargo */}
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initials}</AppText>
          </View>
          <AppText style={styles.userName}>{displayName}</AppText>
          {displayRole ? (
            <AppText style={styles.userRole}>{displayRole}</AppText>
          ) : null}
        </View>
      </View>

      {/* ── Conteúdo rolável ────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* Meu desempenho — estatísticas permanecem mock até endpoint dedicado */}
        <AppText style={styles.sectionTitle}>Meu desempenho</AppText>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <AppText style={styles.statValueBlue}>12</AppText>
            <AppText style={styles.statLabel}>
              Inspeções{'\n'}concluídas
            </AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={styles.statValueGreen}>96%</AppText>
            <AppText style={styles.statLabel}>
              Porcentagem de{'\n'}Aprovações
            </AppText>
          </View>
          <View style={styles.statCard}>
            <AppText style={styles.statValueRed}>0</AppText>
            <AppText style={styles.statLabel}>Devolvidas</AppText>
          </View>
        </View>

        {/* Menu de opções */}
        <View style={styles.menuCard}>
          <MenuItem
            icon={<Building2 size={22} color="#555" />}
            label="Organização"
            subtitle={displayOrg}
            isFirst
          />
          <MenuItem
            icon={<Settings size={22} color="#555" />}
            label="Configurações"
          />
          <MenuItem
            icon={<Bell size={22} color="#555" />}
            label="Notificações"
          />
          <MenuItem
            icon={<HelpCircle size={22} color="#555" />}
            label="Ajuda e suporte"
          />
        </View>

        <View style={styles.spacer} />

        {/* Botão sair da conta */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={handleLogout}
        >
          <LogOut size={20} color="#E53935" />
          <AppText style={styles.logoutText}>SAIR DA CONTA</AppText>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Sincronizar')}
        >
          <RefreshCw size={22} color="#888" />
          <AppText style={styles.tabLabel}>SINCRONIZAR</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <User size={22} color="#45A835" />
          <AppText style={styles.tabLabelActive}>PERFIL</AppText>
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

  header: {
    backgroundColor: '#132539',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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

  profileInfo: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 5,
    backgroundColor: '#45A835',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  userRole: {
    color: '#AABBC8',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },

  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 14,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  statValueBlue: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#1E88E5',
  },
  statValueGreen: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#45A835',
  },
  statValueRed: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#E53935',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#666',
    lineHeight: 15,
  },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  menuIcon: { width: 26, alignItems: 'center' },
  menuText: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#132539',
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#888',
    marginTop: 2,
  },

  spacer: { flex: 1, minHeight: 15 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E53935',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#E53935',
    letterSpacing: 0.5,
  },

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
