import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'csv-prompt-generator-db';
const DB_VERSION = 1;
const STORE_NAME = 'user-data';

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>>;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const idbGet = async (key: string): Promise<any> => {
  const db = await initDB();
  return db.get(STORE_NAME, key);
};

export const idbSet = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  await db.put(STORE_NAME, value, key);
};

export const idbClear = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_NAME);
};

export const idbRemove = async (key: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_NAME, key);
};
