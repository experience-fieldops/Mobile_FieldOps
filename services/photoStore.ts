import { Platform } from 'react-native';

/**
 * Guarda as fotos das inspeções de forma permanente no aparelho, para que
 * sobrevivam até a sincronização (o image-picker as entrega no cache, que o
 * sistema pode limpar).
 *
 * - Celular: copia para `Documentos/fieldops-evidence` (expo-file-system).
 * - Web: converte o endereço temporário `blob:` em data URL.
 *
 * Falhas não bloqueiam o técnico: em último caso mantém o endereço original.
 */

const DIR_NAME = 'fieldops-evidence';

async function toDataUrl(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Retorna um endereço da foto que continua válido até o envio. */
export async function persistPhoto(uri: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return uri.startsWith('blob:') ? await toDataUrl(uri) : uri;
    }

    const { Directory, File, Paths } = await import('expo-file-system');
    const dir = new Directory(Paths.document, DIR_NAME);
    if (uri.startsWith(dir.uri)) return uri; // já está guardada

    dir.create({ intermediates: true, idempotent: true });
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${
      ext.length <= 5 ? ext : 'jpg'
    }`;
    const target = new File(dir, name);
    await new File(uri).copy(target);
    return target.uri;
  } catch (error) {
    if (__DEV__)
      console.warn('[Fotos] Não foi possível guardar a foto:', error);
    return uri;
  }
}

/** Apaga a cópia guardada (só as que o app criou). Nunca lança. */
export async function deletePhoto(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { Directory, File, Paths } = await import('expo-file-system');
    const dir = new Directory(Paths.document, DIR_NAME);
    if (!uri.startsWith(dir.uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // arquivo já removido ou inacessível: nada a fazer
  }
}
