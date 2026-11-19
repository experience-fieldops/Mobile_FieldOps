/**
 * Captura de localização (GPS) para o fluxo de execução de inspeção.
 *
 * O backend exige latitude/longitude ao iniciar a execução
 * (StartExecutionRequest.gpsLatitude/gpsLongitude são obrigatórios).
 */

import * as Location from 'expo-location';

/** Falha ao obter a localização, com o motivo para orientar o técnico. */
export class LocationError extends Error {
  constructor(
    message: string,
    /** denied: permissão negada; unavailable: GPS desligado ou sem sinal. */
    readonly reason: 'denied' | 'unavailable',
    /** Se o sistema ainda pode mostrar o pedido de permissão. */
    readonly canAskAgain: boolean = true,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Tempo máximo esperando a posição atual antes de usar a última conhecida. */
const POSITION_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Tempo esgotado ao obter a localização.')),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Pede permissão de localização e retorna a coordenada atual.
 *
 * Sem internet o GPS pode demorar muito (sem ajuda da rede). Por isso há um
 * prazo; se estourar, usa a última posição conhecida do aparelho, que
 * funciona offline.
 *
 * Lança erro com mensagem amigável se a permissão for negada ou se nenhuma
 * posição puder ser obtida — o chamador decide como exibir.
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const { status, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new LocationError(
      'Permissão de localização negada.',
      'denied',
      canAskAgain,
    );
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      POSITION_TIMEOUT_MS,
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    if (last) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
      };
    }
    throw new LocationError(
      'Não foi possível obter a localização. Verifique se o GPS está ativo.',
      'unavailable',
    );
  }
}
