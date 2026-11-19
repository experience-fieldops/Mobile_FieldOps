import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  ScrollViewInstance,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
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
  WifiOff,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import AppText from '../components/AppText';
import {
  ChecklistItem,
  ConformityItem,
  ChecklistAnswer,
  ChecklistEvidence,
  Severity,
} from '../data/inspections';
import { mapSnapshotsToChecklist } from '../data/mappers';
import { getInspectionById } from '../services/inspectionService';
import { startExecution, listExecutions } from '../services/executionService';
import { getHttpStatus, isNetworkError } from '../services/api';
import {
  clearDraft,
  getDraft,
  InspectionDraft,
  saveDraft,
} from '../services/draftStore';
import { deletePhoto, persistPhoto } from '../services/photoStore';
import {
  getCachedInspectionDetail,
  isExecutable,
  saveCachedInspectionDetail,
} from '../services/offlineStore';
import {
  enqueueInspection,
  getQueuedInspection,
  syncInspection,
  toLocalDateTime,
} from '../services/syncQueue';
import { BackendInspectionStatus } from '../types/inspectionApi';

// Rótulos para os status em que o backend não permite executar.
const NOT_EXECUTABLE_LABEL: Partial<Record<BackendInspectionStatus, string>> = {
  COMPLETED: 'concluída',
  UNDER_REVIEW: 'em revisão',
  APPROVED: 'aprovada',
  REJECTED: 'devolvida',
  CANCELLED: 'cancelada',
};
import {
  Coordinates,
  getCurrentCoordinates,
  LocationError,
} from '../services/location';
import LocationConsent from '../components/LocationConsent';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';

/**
 * Mensagem ao usuário. No web o Alert do react-native-web não exibe
 * nada, então usa o alert do navegador.
 */
function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

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
const CONFORMITY_COLORS: Record<
  NonNullable<ChecklistAnswer>,
  { border: string; bg: string; label: string }
> = {
  Conforme: { border: '#45A835', bg: '#F0FAF0', label: '#2E7D32' },
  Atenção: { border: '#FFA000', bg: '#FFFDE7', label: '#E65100' },
  Inconforme: { border: '#E53935', bg: '#FFEBEE', label: '#B71C1C' },
  'Não verificado': { border: '#9E9E9E', bg: '#F5F5F5', label: '#555' },
};

// ─────────────────────────────────────────────────────────────
// Sub-componentes de input por tipo
// ─────────────────────────────────────────────────────────────

// ── CONFORMITY ──────────────────────────────────────────────

interface ConformityProps {
  item: ConformityItem;
  onAnswer: (a: ChecklistAnswer) => void;
}

function ConformityInput({ item, onAnswer }: ConformityProps) {
  const OPTIONS: {
    value: ChecklistAnswer;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: 'Conforme',
      label: 'Conforme',
      icon: <Smile size={26} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Atenção',
      label: 'Atenção',
      icon: <Meh size={26} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Inconforme',
      label: 'Inconforme',
      icon: <Frown size={26} color="#132539" strokeWidth={1.5} />,
    },
    {
      value: 'Não verificado',
      label: 'Não verificado',
      icon: <XCircle size={26} color="#132539" strokeWidth={1.5} />,
    },
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
                sel && colors
                  ? { color: colors.label, fontFamily: 'Inter_700Bold' }
                  : null,
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
              sel && {
                borderColor: selColor,
                backgroundColor: sel ? (opt ? '#F0FAF0' : '#FFEBEE') : '#FFF',
              },
            ]}
            activeOpacity={0.75}
            onPress={() => onChange(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: sel }}
          >
            {sel ? (
              <CheckCircle2 size={22} color={selColor} />
            ) : (
              <Circle size={22} color="#BDBDBD" />
            )}
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
            {sel ? (
              <CheckCircle2 size={20} color="#45A835" />
            ) : (
              <Circle size={20} color="#BDBDBD" />
            )}
            <AppText
              style={[
                inputStyles.choiceLabel,
                sel && inputStyles.choiceLabelSelected,
              ]}
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

function PhotoInput({
  evidences,
  requiresEvidence,
  onAdd,
  onRemove,
}: PhotoProps) {
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
          style={[
            inputStyles.evidenceBtn,
            missing && inputStyles.evidenceBtnRequired,
          ]}
          activeOpacity={0.75}
          onPress={openCamera}
          accessibilityLabel="Abrir câmera"
        >
          <Camera size={22} color={missing ? '#E53935' : '#132539'} />
          <AppText
            style={[
              inputStyles.evidenceBtnLabel,
              missing && { color: '#E53935' },
            ]}
          >
            Câmera
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            inputStyles.evidenceBtn,
            missing && inputStyles.evidenceBtnRequired,
          ]}
          activeOpacity={0.75}
          onPress={openGallery}
          accessibilityLabel="Abrir galeria"
        >
          <ImageIcon size={22} color={missing ? '#E53935' : '#132539'} />
          <AppText
            style={[
              inputStyles.evidenceBtnLabel,
              missing && { color: '#E53935' },
            ]}
          >
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
  const { user, token } = useAuth();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modo offline: inspeção aberta a partir da cópia salva no aparelho.
  const [offlineMode, setOfflineMode] = useState(false);
  const [inspectionTitle, setInspectionTitle] = useState('');
  const [startedAt, setStartedAt] = useState<string>(() => toLocalDateTime());
  const [startGps, setStartGps] = useState<Coordinates | null>(null);
  // Motivo do modo offline, exibido no aviso.
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  // Checklist carregado: a partir daqui as respostas vão para o rascunho.
  const [ready, setReady] = useState(false);

  // Localização obrigatória: ao abrir (início) e ao finalizar. Sem ela a
  // inspeção não inicia nem finaliza.
  const [consentGps, setConsentGps] = useState<Coordinates | null>(null);
  const [finishAsk, setFinishAsk] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState<Error | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  // Exibe aviso de obrigatório se o usuário tentar avançar sem responder
  const [showRequired, setShowRequired] = useState(false);

  const scrollRef = useRef<ScrollViewInstance>(null);

  // Abre a inspeção. Com internet: busca no servidor e retoma/cria a
  // execução. Sem internet (ou sessão vencida): usa a cópia salva no
  // aparelho. Em ambos, as respostas já dadas (rascunho) são restauradas.
  useEffect(() => {
    let active = true;

    async function init() {
      // Só abre depois que o técnico compartilhou a localização.
      if (!consentGps) return;

      if (!token || user == null) {
        setError('Sessão inválida. Faça login novamente.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setReady(false);

      // Já finalizada e aguardando envio: não executa de novo.
      const queued = await getQueuedInspection(user.id, inspectionId);
      if (queued && queued.status === 'pending') {
        if (!active) return;
        setError(
          'Esta inspeção já foi finalizada e está na fila para ' +
            'sincronização. Ela será enviada quando houver internet.',
        );
        setLoading(false);
        return;
      }

      // Respostas salvas de uma abertura anterior (tela/app fechado).
      const draft = await getDraft(user.id, inspectionId);

      try {
        const dto = await getInspectionById(token, inspectionId);
        // Mantém a cópia local atualizada para uso offline.
        await saveCachedInspectionDetail(user.id, dto).catch(() => {});

        // O backend só aceita executar inspeções agendadas ou em andamento
        // (senão responde 409). Avisa antes, com o motivo real.
        if (!isExecutable(dto.status)) {
          if (!active) return;
          setError(
            `Esta inspeção está ${NOT_EXECUTABLE_LABEL[dto.status] ?? dto.status} ` +
              'e não pode ser executada.',
          );
          return;
        }

        // Prioridade: rascunho > respostas de um envio que falhou > novo.
        const checklist =
          draft?.items ??
          queued?.items ??
          mapSnapshotsToChecklist(dto.itemSnapshots ?? []);
        const begin =
          draft?.startedAt ?? queued?.startedAt ?? toLocalDateTime();

        // Retoma a execução em andamento, se houver. Criar outra seria
        // recusado com 409 ("Já existe uma execução em andamento").
        const executions = await listExecutions(token, inspectionId);
        const running = executions.find((e) => e.status === 'IN_PROGRESS');

        let execId: number | null = null;
        let gps: Coordinates | null = draft?.startGps ?? null;
        if (running) {
          if (running.technicianId !== user.id) {
            if (!active) return;
            setError(
              'Esta inspeção já está sendo executada por outro técnico.',
            );
            return;
          }
          execId = running.id;
        } else {
          // GPS é obrigatório para criar a execução. Se não houver posição
          // agora, não trava a tela: a fila cria a execução no envio,
          // usando a posição do fim.
          gps = gps ?? consentGps;
          if (gps) {
            const exec = await startExecution(token, inspectionId, user.id, {
              gpsLatitude: gps.latitude,
              gpsLongitude: gps.longitude,
              startedAt: begin,
            });
            execId = exec.id;
          }
        }

        if (!active) return;
        setInspectionTitle(dto.templateTitle);
        setItems(checklist);
        setExecutionId(execId);
        setStartGps(gps);
        setStartedAt(begin);
        setReady(true);
      } catch (err) {
        if (!active) return;

        const expired = getHttpStatus(err) === 401;
        if (isNetworkError(err) || expired) {
          // ── Sem conexão / sessão vencida: abre a cópia do aparelho ──
          const cached = await getCachedInspectionDetail(user.id, inspectionId);
          if (!active) return;
          if (!cached) {
            setError(
              'Sem conexão, e esta inspeção ainda não foi baixada para uso ' +
                'offline. Abra a lista de inspeções com internet para ' +
                'baixá-la.',
            );
            return;
          }
          if (!isExecutable(cached.status)) {
            setError(
              `Esta inspeção está ${NOT_EXECUTABLE_LABEL[cached.status] ?? cached.status} ` +
                'e não pode ser executada.',
            );
            return;
          }

          // GPS funciona sem internet no celular (com prazo e última
          // posição conhecida). Se falhar, a posição do fim é usada.
          const coords = draft?.startGps ?? consentGps;

          setItems(
            draft?.items ??
              queued?.items ??
              mapSnapshotsToChecklist(cached.itemSnapshots ?? []),
          );
          setInspectionTitle(cached.templateTitle);
          setExecutionId(draft?.executionId ?? queued?.executionId ?? null);
          setStartGps(coords);
          setStartedAt(
            draft?.startedAt ?? queued?.startedAt ?? toLocalDateTime(),
          );
          setOfflineReason(
            expired
              ? 'Sessão expirada. As respostas ficam salvas no aparelho; ' +
                  'faça login novamente para sincronizar.'
              : 'Sem conexão. As respostas ficam salvas no aparelho e, ao ' +
                  'finalizar, a inspeção vai para a fila de sincronização.',
          );
          setOfflineMode(true);
          setReady(true);
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Erro ao iniciar a inspeção.';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [token, user, inspectionId, consentGps]);

  // ── Rascunho: grava as respostas no aparelho a cada alteração ──
  const finalizedRef = useRef(false);
  const latestDraftRef = useRef<{
    ready: boolean;
    draft: InspectionDraft;
  } | null>(null);
  latestDraftRef.current = {
    ready,
    draft: {
      items,
      startedAt,
      startGps,
      executionId,
      updatedAt: toLocalDateTime(),
    },
  };

  useEffect(() => {
    if (!ready || user == null) return;
    const timer = setTimeout(() => {
      saveDraft(user.id, inspectionId, {
        items,
        startedAt,
        startGps,
        executionId,
        updatedAt: toLocalDateTime(),
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, user, inspectionId, items, startedAt, startGps, executionId]);

  // Ao sair da tela, grava o que ainda não foi salvo (exceto se finalizou).
  useEffect(() => {
    const userId = user?.id;
    return () => {
      const latest = latestDraftRef.current;
      if (userId == null || finalizedRef.current || !latest?.ready) return;
      saveDraft(userId, inspectionId, latest.draft).catch(() => {});
    };
  }, [user, inspectionId]);

  const total = items.length;
  const item = items[currentIndex];

  // ── Updaters ──────────────────────────────────────────────

  function updateItem(patch: Partial<ChecklistItem>) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === currentIndex ? ({ ...it, ...patch } as ChecklistItem) : it,
      ),
    );
  }

  const handleAnswer = useCallback(
    (answer: ChecklistAnswer) => updateItem({ answer }),
    [currentIndex],
  );
  const handleText = useCallback(
    (textAnswer: string) => updateItem({ textAnswer }),
    [currentIndex],
  );
  const handleNumber = useCallback(
    (numberAnswer: string) => updateItem({ numberAnswer }),
    [currentIndex],
  );
  const handleBoolean = useCallback(
    (booleanAnswer: boolean) => updateItem({ booleanAnswer }),
    [currentIndex],
  );
  const handleChoice = useCallback(
    (choiceAnswer: string) => updateItem({ choiceAnswer }),
    [currentIndex],
  );
  const handleDate = useCallback(
    (dateAnswer: string) => updateItem({ dateAnswer }),
    [currentIndex],
  );
  const handleObs = useCallback(
    (observation: string) => updateItem({ observation }),
    [currentIndex],
  );
  const handleSeverity = useCallback(
    (ncSeverity: Severity) => updateItem({ ncSeverity }),
    [currentIndex],
  );

  // A foto é copiada para uma pasta permanente do app antes de entrar no
  // checklist, para continuar disponível até a sincronização.
  const handleAddEvidence = useCallback(
    async (ev: ChecklistEvidence) => {
      const idx = currentIndex;
      const uri = await persistPhoto(ev.uri);
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { ...it, evidences: [...it.evidences, { ...ev, uri }] }
            : it,
        ),
      );
    },
    [currentIndex],
  );

  const handleRemoveEvidence = useCallback(
    (uri: string) => {
      deletePhoto(uri);
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === currentIndex
            ? { ...it, evidences: it.evidences.filter((e) => e.uri !== uri) }
            : it,
        ),
      );
    },
    [currentIndex],
  );

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

  // Finaliza: coloca a inspeção na fila de sincronização e, se houver
  // conexão, envia na hora. Sem conexão, ela fica na fila até a internet
  // voltar (o envio automático cuida disso). Ver services/syncQueue.ts.
  async function submitChecklist() {
    if (!token || user == null) {
      notify('Erro', 'Sessão inválida. Faça login novamente.');
      return;
    }

    setSubmitting(true);
    try {
      // Localização obrigatória para finalizar.
      let endGps: Coordinates;
      try {
        endGps = await getCurrentCoordinates();
      } catch (err) {
        setLocError(err instanceof Error ? err : new Error(String(err)));
        setFinishAsk(true);
        return;
      }

      await enqueueInspection({
        inspectionId,
        userId: user.id,
        code: `INSP-${inspectionId}`,
        title: inspectionTitle || `Inspeção ${inspectionId}`,
        items,
        executionId,
        startedAt,
        startGps,
        completedAt: toLocalDateTime(),
        endGps,
      });

      // Agora as respostas estão na fila: o rascunho não é mais necessário.
      finalizedRef.current = true;
      await clearDraft(user.id, inspectionId).catch(() => {});

      if (offlineMode) {
        notify(
          'Inspeção salva',
          'Sem conexão. A inspeção foi salva na fila para sincronização ' +
            'e será enviada automaticamente quando houver internet.',
        );
        navigation.goBack();
        return;
      }

      const result = await syncInspection(token, user.id, inspectionId);

      if (result.status === 'synced') {
        navigation.goBack();
        return;
      }

      if (result.status === 'offline') {
        notify(
          'Inspeção salva',
          'A conexão caiu durante o envio. A inspeção ficou na fila para ' +
            'sincronização e será enviada quando houver internet.',
        );
        navigation.goBack();
        return;
      }

      // Recusa do servidor: fica na fila com o motivo; o técnico pode
      // corrigir e finalizar de novo (a fila preserva o que já foi enviado).
      notify(
        'Falha ao finalizar',
        `${result.message}\n\nA inspeção ficou na fila de sincronização. ` +
          'Corrija e finalize novamente, ou tente pela tela de Sincronização.',
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar a inspeção.';
      notify('Falha ao finalizar', message);
    } finally {
      setSubmitting(false);
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
      // Antes de finalizar, pede a localização.
      setLocError(null);
      setFinishAsk(true);
    }
  }

  async function acceptLocation(mode: 'start' | 'finish') {
    setLocBusy(true);
    setLocError(null);
    try {
      const coords = await getCurrentCoordinates();
      if (mode === 'start') {
        setConsentGps(coords);
      } else {
        setFinishAsk(false);
        setLocBusy(false);
        await submitChecklist();
      }
    } catch (err) {
      setLocError(
        err instanceof LocationError
          ? err
          : new Error('Não foi possível obter a localização.'),
      );
    } finally {
      setLocBusy(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────

  // Consentimento de localização antes de abrir a inspeção.
  if (!consentGps) {
    return (
      <LocationConsent
        mode="start"
        busy={locBusy}
        error={locError}
        onAccept={() => acceptLocation('start')}
        onCancel={() => navigation.goBack()}
      />
    );
  }

  // Consentimento de localização antes de finalizar.
  if (finishAsk && !submitting) {
    return (
      <LocationConsent
        mode="finish"
        busy={locBusy}
        error={locError}
        onAccept={() => acceptLocation('finish')}
        onCancel={() => setFinishAsk(false)}
      />
    );
  }

  // Carregando detalhe + iniciando execução
  if (loading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color="#132539" />
        <AppText style={styles.notFoundText}>Iniciando inspeção…</AppText>
      </View>
    );
  }

  // Erro ao carregar/iniciar
  if (error) {
    return (
      <View style={styles.notFound}>
        <AppText style={styles.notFoundText}>{error}</AppText>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AppText style={styles.backLink}>Voltar</AppText>
        </TouchableOpacity>
      </View>
    );
  }

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
  const progressPct = Math.round((currentIndex / total) * 100);

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
      <StatusBar barStyle="light-content" />

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

      {/* Aviso de modo offline */}
      {offlineMode && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#E65100" />
          <AppText style={styles.offlineBannerText}>
            {offlineReason ??
              'Sem conexão. Ao finalizar, a inspeção fica na fila para ' +
                'sincronização.'}
          </AppText>
        </View>
      )}

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
          {item.required ? (
            <AppText style={styles.requiredMark}> *</AppText>
          ) : null}
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
          <TextAreaInput
            value={item.textAnswer}
            onChange={handleText}
            placeholder="Descreva aqui..."
          />
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

        {/* Severidade da não conformidade — só para item Inconforme */}
        {item.type === 'CONFORMITY' && item.answer === 'Inconforme' && (
          <View>
            <AppText style={styles.severityLabel}>
              Severidade da não conformidade:
            </AppText>
            <View style={styles.severityGroup}>
              {(['Baixa', 'Média', 'Alta', 'Crítica'] as Severity[]).map(
                (sev) => {
                  const sel = item.ncSeverity === sev;
                  return (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.severityChip,
                        sel && styles.severityChipSelected,
                      ]}
                      onPress={() => handleSeverity(sev)}
                      activeOpacity={0.75}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sel }}
                    >
                      <AppText
                        style={[
                          styles.severityChipText,
                          sel && styles.severityChipTextSelected,
                        ]}
                      >
                        {sev}
                      </AppText>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          </View>
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
          style={[styles.footerBtn, submitting && styles.footerBtnDisabled]}
          onPress={goNext}
          activeOpacity={0.7}
          disabled={submitting}
          accessibilityLabel={
            currentIndex < total - 1
              ? 'Avançar para o próximo item'
              : 'Finalizar inspeção'
          }
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#45A835" />
          ) : (
            <>
              <AppText style={styles.footerBtnText}>
                {currentIndex < total - 1 ? 'Avançar' : 'Finalizar'}
              </AppText>
              <ArrowRight size={16} color="#45A835" />
            </>
          )}
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
  headerOps: { color: '#45A835', fontSize: 15, fontFamily: 'Inter_700Bold' },
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

  // Aviso de modo offline
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#E65100',
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

  // Severidade da não conformidade
  severityLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#555',
    marginBottom: 10,
  },
  severityGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  severityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
  },
  severityChipSelected: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  severityChipText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#132539',
  },
  severityChipTextSelected: {
    color: '#B71C1C',
    fontFamily: 'Inter_700Bold',
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
    justifyContent: 'flex-end',
  },
  footerBtnDisabled: {
    opacity: 0.5,
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
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundText: { fontSize: 15, color: '#555', fontFamily: 'Inter_400Regular' },
  backLink: { fontSize: 14, color: '#1E88E5', fontFamily: 'Inter_700Bold' },
});
