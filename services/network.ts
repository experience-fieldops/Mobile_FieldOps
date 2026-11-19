import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import { getQueue, syncQueue } from './syncQueue';

/** Intervalo de nova tentativa de envio enquanto houver conexão. */
const RETRY_INTERVAL_MS = 30000;

/**
 * Considera "online" quando há rede e a internet não foi dada como
 * inacessível (`isInternetReachable` pode ser null enquanto o teste roda).
 */
export function isOnlineState(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Estado da conexão do aparelho.
 * `null` enquanto ainda não se sabe; `true`/`false` depois.
 *
 * Observação: indica a rede do aparelho. Não garante que o backend esteja
 * acessível — isso é detectado pela falha da requisição (isNetworkError),
 * que é quem decide abrir a cópia salva no aparelho.
 */
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected == null ? null : isOnlineState(state));
    });
    return unsubscribe;
  }, []);

  return online;
}

/**
 * Envia a fila de sincronização automaticamente quando há conexão:
 * ao entrar no app, sempre que a conexão volta, quando o app volta ao
 * primeiro plano e, enquanto houver itens pendentes, a cada 30 segundos.
 */
export function useAutoSync(token: string | null, userId: number | null) {
  useEffect(() => {
    if (!token || userId == null) return;

    let online = false;
    let running = false;

    const trySync = async () => {
      if (!online || running) return;
      running = true;
      try {
        const queue = await getQueue(userId);
        if (queue.some((q) => q.status === 'pending')) {
          await syncQueue(token, userId);
        }
      } catch {
        // falhas ficam registradas na própria fila
      } finally {
        running = false;
      }
    };

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const nowOnline = isOnlineState(state);
      const cameBack = nowOnline && !online;
      online = nowOnline;
      if (cameBack) trySync();
    });

    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') trySync();
    });

    const timer = setInterval(trySync, RETRY_INTERVAL_MS);

    return () => {
      unsubscribeNet();
      appState.remove();
      clearInterval(timer);
    };
  }, [token, userId]);
}
