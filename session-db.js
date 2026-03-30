// ── INDEXEDDB SETUP ─────────────────────────────────────────────────────────────
const DB_NAME = 'BackTestProDB';
const DB_VERSION = 1;
const STORE_NAME = 'tradingSessions';

class SessionDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async getAllSessions() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getSession(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addSession(session) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(session);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updateSession(session) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteSession(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearAllSessions() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

// Initialize database
const sessionDB = new SessionDB();

// ── MIGRATION FROM LOCALSTORAGE ───────────────────────────────────────────────
async function migrateFromLocalStorage() {
  try {
    // Check if we already have data in IndexedDB
    const existingSessions = await sessionDB.getAllSessions();
    if (existingSessions.length > 0) {
      console.log('IndexedDB already contains data, skipping migration');
      return;
    }

    // Check for localStorage data
    const localStorageData = localStorage.getItem('tradingSessions');
    if (!localStorageData) {
      console.log('No localStorage data found');
      return;
    }

    const sessions = JSON.parse(localStorageData);
    if (!Array.isArray(sessions) || sessions.length === 0) {
      console.log('No valid sessions in localStorage');
      return;
    }

    // Migrate to IndexedDB
    console.log(`Migrating ${sessions.length} sessions from localStorage to IndexedDB`);
    for (const session of sessions) {
      await sessionDB.addSession(session);
    }

    // Clear localStorage after successful migration
    localStorage.removeItem('tradingSessions');
    console.log('Migration completed successfully');
    notif('Sessions migrated to IndexedDB successfully', 'pos');
  } catch (error) {
    console.error('Migration failed:', error);
    notif('Failed to migrate sessions from localStorage', 'warn');
  }
}
