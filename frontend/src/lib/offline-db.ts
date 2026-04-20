import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "qiada-offline";
const DB_VERSION = 1;

interface QiadaDB {
  topics: { key: number; value: import("./api").Topic };
  chapters: { key: number; value: import("./api").Chapter };
  glossary: { key: number; value: import("./api").GlossaryTerm };
  meta: { key: string; value: { key: string; value: string | number } };
}

let dbPromise: Promise<IDBPDatabase<QiadaDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<QiadaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("topics")) {
          db.createObjectStore("topics", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("chapters")) {
          db.createObjectStore("chapters", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("glossary")) {
          db.createObjectStore("glossary", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function syncAllData(): Promise<void> {
  const API_BASE = "/api";

  const [topicsRes, chaptersRes, glossaryRes] = await Promise.all([
    fetch(`${API_BASE}/topics`).then((r) => r.json()),
    fetch(`${API_BASE}/chapters`).then((r) => r.json()),
    fetch(`${API_BASE}/glossary`).then((r) => r.json()),
  ]);

  const db = await getDB();

  const tx = db.transaction(["topics", "chapters", "glossary", "meta"], "readwrite");

  // Clear and re-populate
  await tx.objectStore("topics").clear();
  for (const topic of topicsRes) {
    await tx.objectStore("topics").put(topic);
  }

  await tx.objectStore("chapters").clear();
  for (const chapter of chaptersRes) {
    await tx.objectStore("chapters").put(chapter);
  }

  await tx.objectStore("glossary").clear();
  for (const term of glossaryRes) {
    await tx.objectStore("glossary").put(term);
  }

  await tx.objectStore("meta").put({ key: "lastSync", value: Date.now() });
  await tx.done;
}

export async function getOfflineTopics() {
  const db = await getDB();
  return db.getAll("topics");
}

export async function getOfflineChapters() {
  const db = await getDB();
  return db.getAll("chapters");
}

export async function getOfflineGlossary() {
  const db = await getDB();
  return db.getAll("glossary");
}

export async function getLastSyncTime(): Promise<number | null> {
  const db = await getDB();
  const meta = await db.get("meta", "lastSync");
  return meta ? (meta.value as number) : null;
}

export async function isOfflineDataAvailable(): Promise<boolean> {
  try {
    const db = await getDB();
    const count = await db.count("topics");
    return count > 0;
  } catch {
    return false;
  }
}
