/**
 * Captura de localização (GPS) para o fluxo de execução de inspeção.
 *
 * O backend exige latitude/longitude ao iniciar a execução
 * (StartExecutionRequest.gpsLatitude/gpsLongitude são obrigatórios).
 */

import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Pede permissão de localização e retorna a coordenada atual.
 *
 * Lança erro com mensagem amigável se a permissão for negada ou se a
 * posição não puder ser obtida — o chamador decide como exibir.
 */
export async function getCurrentCoordinates(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error(
      'Permissão de localização necessária para iniciar a inspeção.',
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
