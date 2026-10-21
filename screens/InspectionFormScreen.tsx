import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  XCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AppText from '../components/AppText';
import {
  MOCK_CHECKLIST,
  ChecklistItem,
  ChecklistAnswer,
} from '../data/inspections';
import { RootStackParamList } from '../navigation/AppNavigator';

type FormRouteProp = RouteProp<RootStackParamList, 'InspectionForm'>;
type FormNavProp = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────────────────────
// Opções de resposta
// ─────────────────────────────────────────────────────────────

interface AnswerOption {
  value: ChecklistAnswer;
  label: string;
  icon: React.ReactNode;
}

function getOptions(size: number): AnswerOption[] {
  return [
    {
      value: 'Conforme',
      label: 'Conforme',
      icon: <Smile size={size} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Atenção',
      label: 'Atenção',
      icon: <Meh size={size} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Inconforme',
      label: 'Inconforme',
      icon: <Frown size={size} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Não verificado',
      label: 'Não verificado',
      icon: <XCircle size={size} color="#132539" strokeWidth={1.5} />,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function InspectionFormScreen() {
  const navigation = useNavigation<FormNavProp>();
  const route = useRoute<FormRouteProp>();
  const { inspectionId } = route.params;

  // Carrega os itens do checklist — cópia local para permitir edição
  const [items, setItems] = useState<ChecklistItem[]>(
    () => MOCK_CHECKLIST[inspectionId] ?? [],
  );

  // Índice do item atual (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = items.length;
  const item = items[currentIndex];

  // Atualiza a resposta do item atual
  const handleAnswer = useCallback(
    (answer: ChecklistAnswer) => {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex ? { ...it, answer } : it,
        ),
      );
    },
    [currentIndex],
  );

  // Atualiza a observação do item atual
  const handleObservation = useCallback(
    (text: string) => {
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex ? { ...it, observation: text } : it,
        ),
      );
    },
    [currentIndex],
  );

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      navigation.goBack();
    }
  };

  const goNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    }
    // TODO: submeter o formulário quando for o último item
  };

  if (!item) {
    return (
      <View style={styles.notFound}>
        <AppText style={styles.notFoundText}>
          Nenhum item de inspeção encontrado.
        </AppText>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AppText style={styles.backLink}>Voltar</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  const OPTIONS = getOptions(26);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <AppText style={styles.headerTitle}>
          <AppText style={styles.headerField}>FIELD </AppText>
          <AppText style={styles.headerOps}>OPS</AppText>
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Conteúdo rolável ────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Número + título */}
        <AppText style={styles.itemTitle}>
          {item.order}. {item.title}
        </AppText>

        {/* Descrição / critério de aceite */}
        <AppText style={styles.itemDescription}>
          {item.description}
          {item.required ? (
            <AppText style={styles.requiredMark}> *</AppText>
          ) : null}
        </AppText>

        {/* Opções de resposta */}
        <View style={styles.optionsGroup}>
          {OPTIONS.map((opt) => {
            const selected = item.answer === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                activeOpacity={0.7}
                onPress={() => handleAnswer(opt.value)}
              >
                <View style={styles.optionIcon}>{opt.icon}</View>
                <AppText
                  style={[
                    styles.optionLabel,
                    selected && styles.optionLabelSelected,
                  ]}
                >
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Campo de observação */}
        <AppText style={styles.observationLabel}>Campo de observação:</AppText>
        <TextInput
          style={styles.observationInput}
          multiline
          textAlignVertical="top"
          placeholder=""
          value={item.observation}
          onChangeText={handleObservation}
          placeholderTextColor="#BDBDBD"
        />
      </ScrollView>

      {/* ── Rodapé de navegação ─────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color="#45A835" />
          <AppText style={styles.footerBtnText}>Retornar</AppText>
        </TouchableOpacity>

        <AppText style={styles.footerCounter}>
          Item {item.order} de {total}
        </AppText>

        <TouchableOpacity
          style={[
            styles.footerBtn,
            styles.footerBtnRight,
            currentIndex === total - 1 && styles.footerBtnDisabled,
          ]}
          onPress={goNext}
          activeOpacity={0.7}
          disabled={currentIndex === total - 1}
        >
          <AppText
            style={[
              styles.footerBtnText,
              currentIndex === total - 1 && styles.footerBtnTextDisabled,
            ]}
          >
            Avançar
          </AppText>
          <ArrowRight
            size={16}
            color={currentIndex === total - 1 ? '#BDBDBD' : '#45A835'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

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
    textAlign: 'center',
  },
  headerField: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  headerOps: {
    color: '#45A835',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  headerSpacer: { width: 30 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },

  // Item
  itemTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
    marginBottom: 10,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#333',
    lineHeight: 20,
    marginBottom: 24,
  },
  requiredMark: {
    color: '#E53935',
    fontFamily: 'Inter_700Bold',
  },

  // Opções
  optionsGroup: {
    gap: 10,
    marginBottom: 28,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  optionBtnSelected: {
    borderColor: '#132539',
    backgroundColor: '#F0F3F7',
  },
  optionIcon: { width: 28, alignItems: 'center' },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
  },
  optionLabelSelected: {
    fontFamily: 'Inter_700Bold',
  },

  // Observação
  observationLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    marginBottom: 8,
  },
  observationInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    height: 160,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
    backgroundColor: '#FFFFFF',
  },

  // Rodapé
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerBtnRight: {
    flexDirection: 'row',
  },
  footerBtnDisabled: {
    opacity: 0.4,
  },
  footerBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#45A835',
  },
  footerBtnTextDisabled: {
    color: '#BDBDBD',
  },
  footerCounter: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
  },

  // Not found
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundText: { fontSize: 15, color: '#555', fontFamily: 'Inter_400Regular' },
  backLink: { fontSize: 14, color: '#1E88E5', fontFamily: 'Inter_700Bold' },
});
