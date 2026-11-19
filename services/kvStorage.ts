import Storage from 'expo-sqlite/kv-store';

/**
 * Armazenamento chave/valor local (rascunhos e cópia das inspeções).
 * No celular é gravado em SQLite (expo-sqlite/kv-store), com a mesma API do
 * AsyncStorage. No web, usa o AsyncStorage (ver kvStorage.web.ts).
 */
export default Storage;
