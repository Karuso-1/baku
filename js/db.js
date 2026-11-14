// Base de datos local (IndexedDB). Todo se queda en el móvil.
const NAME = 'baku';
const VERSION = 2;
// kv: ajustes y perfil · weights: pesos por fecha · foods, recipes, days, photos: para las siguientes fases
const STORES = { kv: null, weights: 'date', foods: 'id', recipes: 'id', days: 'date', photos: 'id', outbox: 'id' };
export const KEY_PATH = STORES;

// Aviso de cambios para la copia en la nube (lo registra sync.js)
let onChange = null;
export const setChangeListener = (fn) => { onChange = fn; };
const changed = (store, value, key) => {
  if (!onChange || store === 'outbox') return;
  const k = key !== undefined ? key : STORES[store] ? value?.[STORES[store]] : undefined;
  if (k !== undefined) onChange(store, String(k));
};

let dbPromise;
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, keyPath] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, keyPath ? { keyPath } : undefined);
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const res = fn(s);
    t.oncomplete = () => resolve(res && 'result' in res ? res.result : res);
    t.onerror = () => reject(t.error);
  });
}

const rawPut = (store, value, key) => tx(store, 'readwrite', s => (key === undefined ? s.put(value) : s.put(value, key)));
const rawDel = (store, key) => tx(store, 'readwrite', s => s.delete(key));
export const db = {
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),
  put: async (store, value, key) => { const r = await rawPut(store, value, key); changed(store, value, key); return r; },
  del: async (store, key) => { const r = await rawDel(store, key); changed(store, null, key); return r; },
  // Sin aviso: para lo que llega de la nube
  putRaw: rawPut,
  delRaw: rawDel,
  all: (store) => tx(store, 'readonly', s => s.getAll()),
  clearAll: async () => {
    for (const name of Object.keys(STORES)) await tx(name, 'readwrite', s => s.clear());
  },
};

// Atajos para el perfil
export const getProfile = () => db.get('kv', 'profile');
export const saveProfile = (p) => db.put('kv', p, 'profile');

// Pide al navegador que no borre los datos si falta espacio
export async function askPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch (_) { /* no pasa nada si no se puede */ }
}
