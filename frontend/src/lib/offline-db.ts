import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "qiada-offline";
const DB_VERSION = 2;

interface OfflineQuestion {
  id: number;
  code: string;
  textIt: string;
  textAr: string;
  explanationIt: string;
  explanationAr: string;
  isTrue: boolean;
  imageUrl: string | null;
  chapterId: number;
  topicKey: string;
}

interface QiadaDB {
  topics: { key: number; value: import("./api").Topic };
  chapters: { key: number; value: import("./api").Chapter };
  glossary: { key: number; value: import("./api").GlossaryTerm };
  questions: { key: number; value: OfflineQuestion; indexes: { chapterId: number } };
  meta: { key: string; value: { key: string; value: string | number } };
}

let dbPromise: Promise<IDBPDatabase<QiadaDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<QiadaDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
        // v2: add questions store for offline quiz
        if (oldVersion < 2 && !db.objectStoreNames.contains("questions")) {
          const store = db.createObjectStore("questions", { keyPath: "id" });
          store.createIndex("chapterId", "chapterId");
        }
      },
    });
  }
  return dbPromise;
}

export async function syncAllData(): Promise<void> {
  const API_BASE = "/api";

  const [topicsRes, chaptersRes, glossaryRes] = await Promise.all([
    fetch(`${API_BASE}/topics`).then((r) => { if (!r.ok) throw new Error(`topics: ${r.status}`); return r.json(); }),
    fetch(`${API_BASE}/chapters`).then((r) => { if (!r.ok) throw new Error(`chapters: ${r.status}`); return r.json(); }),
    fetch(`${API_BASE}/glossary`).then((r) => { if (!r.ok) throw new Error(`glossary: ${r.status}`); return r.json(); }),
  ]);

  const db = await getDB();

  const tx = db.transaction(["topics", "chapters", "glossary", "meta"], "readwrite");

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

// Full download: topics + chapters + glossary + ALL questions (for offline quiz)
export async function downloadAllForOffline(
  onProgress?: (step: string, pct: number) => void
): Promise<{ questions: number; topics: number }> {
  const API_BASE = "/api";

  onProgress?.("Scaricamento argomenti...", 10);
  const [topicsRes, chaptersRes, glossaryRes] = await Promise.all([
    fetch(`${API_BASE}/topics`).then((r) => { if (!r.ok) throw new Error(`topics: ${r.status}`); return r.json(); }),
    fetch(`${API_BASE}/chapters`).then((r) => { if (!r.ok) throw new Error(`chapters: ${r.status}`); return r.json(); }),
    fetch(`${API_BASE}/glossary`).then((r) => { if (!r.ok) throw new Error(`glossary: ${r.status}`); return r.json(); }),
  ]);

  onProgress?.("Scaricamento domande...", 30);
  // Fetch questions in batches (API supports limit/offset)
  let allQuestions: OfflineQuestion[] = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${API_BASE}/questions?limit=${limit}&offset=${offset}`).then((r) => r.json());
    allQuestions = allQuestions.concat(res.data);
    offset += limit;
    hasMore = res.data.length === limit;
    const pct = 30 + Math.min(60, Math.round((allQuestions.length / 7000) * 60));
    onProgress?.(`${allQuestions.length} domande...`, pct);
  }

  onProgress?.("Salvataggio locale...", 92);
  const db = await getDB();

  // Save topics, chapters, glossary
  const tx1 = db.transaction(["topics", "chapters", "glossary", "meta"], "readwrite");
  await tx1.objectStore("topics").clear();
  for (const t of topicsRes) await tx1.objectStore("topics").put(t);
  await tx1.objectStore("chapters").clear();
  for (const c of chaptersRes) await tx1.objectStore("chapters").put(c);
  await tx1.objectStore("glossary").clear();
  for (const g of glossaryRes) await tx1.objectStore("glossary").put(g);
  await tx1.objectStore("meta").put({ key: "lastSync", value: Date.now() });
  await tx1.objectStore("meta").put({ key: "questionCount", value: allQuestions.length });
  await tx1.done;

  // Save questions in separate transaction (large)
  const tx2 = db.transaction("questions", "readwrite");
  await tx2.objectStore("questions").clear();
  for (const q of allQuestions) {
    await tx2.objectStore("questions").put(q);
  }
  await tx2.done;

  onProgress?.("Completato!", 100);
  return { questions: allQuestions.length, topics: topicsRes.length };
}

export async function getOfflineQuestionCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count("questions");
  } catch {
    return 0;
  }
}

export async function getOfflineQuestions(chapterId?: number): Promise<OfflineQuestion[]> {
  const db = await getDB();
  if (chapterId) {
    return db.getAllFromIndex("questions", "chapterId", chapterId);
  }
  return db.getAll("questions");
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
