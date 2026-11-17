import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

import { syncQueue } from './syncQueue';

/**
 * Estado da conexão do aparelho.
 * `null` enquanto ainda não se sabe; `true`/`false` depois.
 *
 * Observação: "conectado" significa ter rede (Wi-Fi/dados). Não garante que
 * o backend esteja acessível — isso é detectado pela falha da requisição
 * (isNetworkError), que é quem decide o modo offline.
 */
export function useIsOnline(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? null);
    });
    return unsubscribe;
  }, []);

  return online;
}

/**
 * Envia a fila de sincronização automaticamente quando há conexão:
 * ao entrar no app (se já estiver conectado) e sempre que a conexão volta.
 */
export function useAutoSync(token: string | null, userId: number | null) {
  useEffect(() => {
    if (!token || userId == null) return;

    let wasConnected: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      if (connected && wasConnected !== true) {
        syncQueue(token, userId).catch(() => {
          // falhas ficam registradas na própria fila
        });
      }
      wasConnected = connected;
    });
    return unsubscribe;
  }, [token, userId]);
}
