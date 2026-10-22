import { useState, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  XCircle,
  Camera,
  Image as ImageIcon,
  AlertCircle,
  X,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import AppText from '../components/AppText';
import {
  MOCK_CHECKLIST,
  ChecklistItem,
  ChecklistAnswer,
  ChecklistEvidence,
} from '../data/inspections';
import { RootStackParamList } from '../navigation/AppNavigator';

// ─────────────────────────────────────────────────────────────
// Tipos de navegação
// ─────────────────────────────────────────────────────────────

type ExecRouteProp = RouteProp<RootStackParamList, 'ChecklistExecution'>;
type ExecNavProp = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Retorna true se o item está respondido (qualquer tipo). */
function isAnswered(item: ChecklistItem): boolean {
  switch (item.type) {
    case 'CONFORMITY':
      return item.answer !== null;
    case 'TEXT':
      return item.textAnswer.trim().length > 0;
    case 'NUMBER':
      return item.numberAnswer.trim().length > 0;
    case 'BOOLEAN':
      return item.booleanAnswer !== null;
    case 'CHOICE':
      return item.choiceAnswer.trim().length > 0;
    case 'DATE':
      return item.dateAnswer.trim().length > 0;
    case 'PHOTO':
      return item.evidences.length > 0;
    default:
      return false;
  }
}

/** Retorna true se o item obrigatório ainda não foi respondido. */
function isMissingRequired(item: ChecklistItem): boolean {
  return item.required && !isAnswered(item);
}

// Cores de destaque por resposta de conformidade
const CONFORMITY_COLORS: Record<NonNullable<ChecklistAnswer>, { border: string; bg: string; label: string }> = {
  Conforme:        { border: '#45A835', bg: '#F0FAF0', label: '#2E7D32' },
  Atenção:         { border: '#FFA000', bg: '#FFFDE7', label: '#E65100' },
  Inconforme:      { border: '#E53935', bg: '#FFEBEE', label: '#B71C1C' },
  'Não verificado':{ border: '#9E9E9E', bg: '#F5F5F5', label: '#555' },
};

// ─────────────────────────────────────────────────────────────
// Sub-componentes de input por tipo
// ─────────────────────────────────────────────────────────────

// ── CONFORMITY ──────────────────────────────────────────────

interface ConformityProps {
  item: ChecklistItem;
  onAnswer: (a: ChecklistAnswer) => void;
}

function ConformityInput({ item, onAnswer }: ConformityProps) {
  const OPTIONS: { value: ChecklistAnswer; label: string; icon: React.ReactNode }[] = [
    { value: 'Conforme',        label: 'Conforme',        icon: <Smile   size={26} color="#132539" strokeWidth={1.5} /> },
    { value: 'Atenção',         label: 'Atenção',         icon: <Meh     size={26} color="#132539" strokeWidth={1.5} /> },
    { value: 'Inconforme',      label: 'Inconforme',      icon: <Frown   size={26} color="#132539" strokeWidth={1.5} /> },
    { value: 'Não verificado',  label: 'Não verificado',  icon: <XCircle size={26} color="#132539" strokeWidth={1.5} /> },
  ];

  return (
    <View style={inputStyles.group}>
      {OPTIONS.map((opt) => {
        const sel = item.answer === opt.value;
        const colors = opt.value ? CONFORMITY_COLORS[opt.value] : null;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              inputStyles.conformityBtn,
              sel && colors
                ? { borderColor: colors.border, backgroundColor: colors.bg }
                : null,
            ]}
            activeOpacity={0.75}
            onPress={() => onAnswer(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
          >
            <View style={inputStyles.optionIcon}>{opt.icon}</View>
            <AppText
              style={[
                inputStyles.optionLabel,
                sel && colors ? { color: colors.label, fontFamily: 'Inter_700Bold' } : null,
              ]}
            >
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── BOOLEAN ─────────────────────────────────────────────────

interface BooleanProps {
  value: boolean | null;
  onChange: (v: boolean) => void;
}

function BooleanInput({ value, onChange }: BooleanProps) {
  return (
    <View style={inputStyles.group}>
      {([true, false] as boolean[]).map((opt) => {
        const sel = value === opt;
        const label = opt ? 'Sim' : 'Não';
        const selColor = opt ? '#45A835' : '#E53935';
        return (
          <TouchableOpacity
            key={String(opt)}
            style={[
              inputStyles.boolBtn,
              sel && { borderColor: selColor, backgroundColor: sel ? (opt ? '#F0FAF0' : '#FFEBEE') : '#FFF' },
            ]}
            activeOpacity={0.75}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
          >
            {sel
              ? <CheckCircle2 size={22} color={selColor} />
              : <Circle size={22} color="#BDBDBD" />}
            <AppText
              style={[
                inputStyles.boolLabel,
                sel && { color: selColor, fontFamily: 'Inter_700Bold' },
              ]}
            >
              {label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── NUMBER ──────────────────────────────────────────────────

interface NumberProps {
  value: string;
  onChange: (v: string) => void;
}

function NumberInput({ value, onChange }: NumberProps) {
  return (
    <TextInput
      style={inputStyles.textBox}
      keyboardType="numeric"
      placeholder="0"
      placeholderTextColor="#BDBDBD"
      value={value}
      onChangeText={onChange}
      accessibilityLabel="Valor numérico"
    />
  );
}

// ── TEXT ────────────────────────────────────────────────────

interface TextProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function TextAreaInput({ value, onChange, placeholder = '' }: TextProps) {
  return (
    <TextInput
      style={[inputStyles.textBox, inputStyles.textArea]}
      multiline
      textAlignVertical="top"
      placeholder={placeholder}
      placeholderTextColor="#BDBDBD"
      value={value}
      onChangeText={onChange}
      accessibilityLabel="Campo de texto livre"
    />
  );
}

// ── DATE ────────────────────────────────────────────────────

interface DateProps {
  value: string;
  onChange: (v: string) => void;
}

function DateInput({ value, onChange }: DateProps) {
  // Máscara simples dd/mm/aaaa
  function mask(raw: string) {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  }
  return (
    <TextInput
      style={inputStyles.textBox}
      keyboardType="numeric"
      placeholder="DD/MM/AAAA"
      placeholderTextColor="#BDBDBD"
      value={value}
      onChangeText={(t) => onChange(mask(t))}
      maxLength={10}
      accessibilityLabel="Data"
    />
  );
}

// ── CHOICE ──────────────────────────────────────────────────

interface ChoiceProps {
  choices: string[];
  value: string;
  onChange: (v: string) => void;
}

function ChoiceInput({ choices, value, onChange }: ChoiceProps) {
  return (
    <View style={inputStyles.group}>
      {choices.map((opt) => {
        const sel = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              inputStyles.choiceBtn,
              sel && inputStyles.choiceBtnSelected,
            ]}
            activeOpacity={0.75}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
          >
            {sel
              ? <CheckCircle2 size={20} color="#45A835" />
              : <Circle size={20} color="#BDBDBD" />}
            <AppText
              style={[inputStyles.choiceLabel, sel && inputStyles.choiceLabelSelected]}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── PHOTO / EVIDENCE ────────────────────────────────────────

interface PhotoProps {
  evidences: ChecklistEvidence[];
  requiresEvidence?: boolean;
  onAdd: (ev: ChecklistEvidence) => void;
  onRemove: (uri: string) => void;
}

function PhotoInput({ evidences, requiresEvidence, onAdd, onRemove }: PhotoProps) {
  async function openCamera() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd({
        uri: result.assets[0].uri,
        source: 'camera',
        capturedAt: new Date().toISOString(),
      });
    }
  }

  async function openGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      onAdd({
        uri: result.assets[0].uri,
        source: 'gallery',
        capturedAt: new Date().toISOString(),
      });
    }
  }

  const missing = requiresEvidence && evidences.length === 0;

  return (
    <View>
      {/* Aviso quando evidência é obrigatória e ausente */}
      {missing && (
        <View style={inputStyles.evidenceWarning}>
          <AlertCircle size={16} color="#E53935" />
          <AppText style={inputStyles.evidenceWarningText}>
            Evidência fotográfica obrigatória para este item.
          </AppText>
        </View>
      )}

      {/* Botões câmera / galeria */}
      <View style={inputStyles.evidenceBtns}>
        <TouchableOpacity
          style={[inputStyles.evidenceBtn, missing && inputStyles.evidenceBtnRequired]}
          activeOpacity={0.75}
          onPress={openCamera}
          accessibilityLabel="Abrir câmera"
        >
          <Camera size={22} color={missing ? '#E53935' : '#132539'} />
          <AppText style={[inputStyles.evidenceBtnLabel, missing && { color: '#E53935' }]}>
            Câmera
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[inputStyles.evidenceBtn, missing && inputStyles.evidenceBtnRequired]}
          activeOpacity={0.75}
          onPress={openGallery}
          accessibilityLabel="Abrir galeria"
        >
          <ImageIcon size={22} color={missing ? '#E53935' : '#132539'} />
          <AppText style={[inputStyles.evidenceBtnLabel, missing && { color: '#E53935' }]}>
            Galeria
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Pré-visualização das evidências anexadas */}
      {evidences.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={inputStyles.previewScroll}
          contentContainerStyle={inputStyles.previewContent}
        >
          {evidences.map((ev) => (
            <View key={ev.uri} style={inputStyles.previewThumb}>
              <Image source={{ uri: ev.uri }} style={inputStyles.previewImg} />
              <TouchableOpacity
                style={inputStyles.previewRemove}
                onPress={() => onRemove(ev.uri)}
                accessibilityLabel="Remover evidência"
              >
                <X size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────────────────────

export default function ChecklistExecutionScreen() {
  const navigation = useNavigation<ExecNavProp>();
  const route = useRoute<ExecRouteProp>();
  const { inspectionId } = route.params;

  const [items, setItems] = useState<ChecklistItem[]>(
    () => MOCK_CHECKLIST[inspectionId] ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  // Exibe aviso de obrigatório se o usuário tentar avançar sem responder
  const [showRequired, setShowRequired] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const total = items.length;
  const item = items[currentIndex];

  // ── Updaters ──────────────────────────────────────────────

  function updateItem(patch: Partial<ChecklistItem>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === currentIndex ? { ...it, ...patch } : it)),
    );
  }

  const handleAnswer    = useCallback((answer: ChecklistAnswer) => updateItem({ answer }), [currentIndex]);
  const handleText      = useCallback((textAnswer: string) => updateItem({ textAnswer }), [currentIndex]);
  const handleNumber    = useCallback((numberAnswer: string) => updateItem({ numberAnswer }), [currentIndex]);
  const handleBoolean   = useCallback((booleanAnswer: boolean) => updateItem({ booleanAnswer }), [currentIndex]);
  const handleChoice    = useCallback((choiceAnswer: string) => updateItem({ choiceAnswer }), [currentIndex]);
  const handleDate      = useCallback((dateAnswer: string) => updateItem({ dateAnswer }), [currentIndex]);
  const handleObs       = useCallback((observation: string) => updateItem({ observation }), [currentIndex]);

  const handleAddEvidence = useCallback((ev: ChecklistEvidence) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === currentIndex
          ? { ...it, evidences: [...it.evidences, ev] }
          : it,
      ),
    );
  }, [currentIndex]);

  const handleRemoveEvidence = useCallback((uri: string) => {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === currentIndex
          ? { ...it, evidences: it.evidences.filter((e) => e.uri !== uri) }
          : it,
      ),
    );
  }, [currentIndex]);

  // ── Navegação ─────────────────────────────────────────────

  function goBack() {
    setShowRequired(false);
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      navigation.goBack();
    }
  }

  function goNext() {
    // Bloqueia se obrigatório não respondido
    if (isMissingRequired(items[currentIndex])) {
      setShowRequired(true);
      return;
    }
    setShowRequired(false);

    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } else {
      // TODO: submeter checklist ao backend
      navigation.goBack();
    }
  }

  // ── Guard ─────────────────────────────────────────────────

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

  // Progresso visual (barra no header)
  const progressPct = Math.round(((currentIndex) / total) * 100);

  // Se Inconforme e requiresEvidence, forçar evidência mesmo que ainda não
  // esteja marcado como requiresEvidence no dado — boa prática do card
  const needsEvidence =
    item.requiresEvidence ||
    (item.type === 'CONFORMITY' && item.answer === 'Inconforme');

  const missingRequired = showRequired && isMissingRequired(item);

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
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <AppText style={styles.headerTitle}>
          <AppText style={styles.headerField}>FIELD </AppText>
          <AppText style={styles.headerOps}>OPS</AppText>
        </AppText>

        <View style={styles.headerSpacer} />
      </View>

      {/* Barra de progresso */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      {/* ── Conteúdo ────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Número + título */}
        <AppText style={styles.itemTitle}>
          {item.order}. {item.title}
          {item.required ? <AppText style={styles.requiredMark}> *</AppText> : null}
        </AppText>

        {/* Descrição */}
        <AppText style={styles.itemDescription}>{item.description}</AppText>

        {/* Aviso de campo obrigatório não preenchido */}
        {missingRequired && (
          <View style={styles.requiredWarning}>
            <AlertCircle size={15} color="#E53935" />
            <AppText style={styles.requiredWarningText}>
              Este item é obrigatório. Responda antes de avançar.
            </AppText>
          </View>
        )}

        {/* ── Input dinâmico por tipo ─────────────────────── */}

        {item.type === 'CONFORMITY' && (
          <ConformityInput item={item} onAnswer={handleAnswer} />
        )}

        {item.type === 'BOOLEAN' && (
          <BooleanInput value={item.booleanAnswer} onChange={handleBoolean} />
        )}

        {item.type === 'NUMBER' && (
          <NumberInput value={item.numberAnswer} onChange={handleNumber} />
        )}

        {item.type === 'TEXT' && (
          <TextAreaInput value={item.textAnswer} onChange={handleText} placeholder="Descreva aqui..." />
        )}

        {item.type === 'DATE' && (
          <DateInput value={item.dateAnswer} onChange={handleDate} />
        )}

        {item.type === 'CHOICE' && (
          <ChoiceInput
            choices={item.choices ?? []}
            value={item.choiceAnswer}
            onChange={handleChoice}
          />
        )}

        {/* PHOTO sozinho, mas qualquer tipo pode ter evidência extra */}
        {(item.type === 'PHOTO' || needsEvidence) && (
          <>
            {item.type !== 'PHOTO' && (
              <AppText style={styles.evidenceTitle}>Evidências:</AppText>
            )}
            <PhotoInput
              evidences={item.evidences}
              requiresEvidence={needsEvidence}
              onAdd={handleAddEvidence}
              onRemove={handleRemoveEvidence}
            />
          </>
        )}

        {/* Campo de observação — presente em todos os tipos */}
        <AppText style={styles.observationLabel}>Campo de observação:</AppText>
        <TextInput
          style={styles.observationInput}
          multiline
          textAlignVertical="top"
          value={item.observation}
          onChangeText={handleObs}
          placeholderTextColor="#BDBDBD"
        />
      </ScrollView>

      {/* ── Rodapé ──────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityLabel="Retornar ao item anterior"
        >
          <ArrowLeft size={16} color="#45A835" />
          <AppText style={styles.footerBtnText}>Retornar</AppText>
        </TouchableOpacity>

        <AppText style={styles.footerCounter}>
          Item {item.order} de {total}
        </AppText>

        <TouchableOpacity
          style={styles.footerBtn}
          onPress={goNext}
          activeOpacity={0.7}
          accessibilityLabel={currentIndex < total - 1 ? 'Avançar para o próximo item' : 'Finalizar inspeção'}
        >
          <AppText style={styles.footerBtnText}>
            {currentIndex < total - 1 ? 'Avançar' : 'Finalizar'}
          </AppText>
          <ArrowRight size={16} color="#45A835" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Estilos dos inputs
// ─────────────────────────────────────────────────────────────

const inputStyles = StyleSheet.create({
  group: { gap: 10, marginBottom: 4 },

  // Conformidade
  conformityBtn: {
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
  optionIcon: { width: 28, alignItems: 'center' },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
  },

  // Boolean
  boolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  boolLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
  },

  // Text / Number / Date
  textBox: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },

  // Choice
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  choiceBtnSelected: {
    borderColor: '#45A835',
    backgroundColor: '#F0FAF0',
  },
  choiceLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
  },
  choiceLabelSelected: {
    fontFamily: 'Inter_700Bold',
    color: '#2E7D32',
  },

  // Evidências
  evidenceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  evidenceWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#E53935',
  },
  evidenceBtns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  evidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  evidenceBtnRequired: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  evidenceBtnLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#132539',
  },
  previewScroll: { marginBottom: 12 },
  previewContent: { gap: 10, paddingVertical: 4 },
  previewThumb: {
    width: 90,
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImg: { width: '100%', height: '100%' },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─────────────────────────────────────────────────────────────
// Estilos da tela
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
  headerTitle: { flex: 1, textAlign: 'center' },
  headerField: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  headerOps:   { color: '#45A835', fontSize: 15, fontFamily: 'Inter_700Bold' },
  headerSpacer: { width: 30 },

  // Progress bar abaixo do header
  progressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#45A835',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 16,
  },

  // Item
  itemTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#132539',
  },
  requiredMark: { color: '#E53935', fontFamily: 'Inter_700Bold' },
  itemDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    lineHeight: 20,
    marginTop: -8,
  },

  // Aviso obrigatório
  requiredWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: 10,
    marginTop: -8,
  },
  requiredWarningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#E53935',
  },

  // Evidência label
  evidenceTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#555',
    marginBottom: -8,
  },

  // Observação
  observationLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#555',
    marginBottom: -8,
  },
  observationInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    height: 120,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
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
    minWidth: 80,
  },
  footerBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#45A835',
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
