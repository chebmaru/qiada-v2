"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { getUser } from "@/lib/auth";
import {
  getAdminStats,
  getQuestions,
  getTopics,
  getChapters,
  updateQuestion,
  deleteQuestion,
  updateTopic,
  type AdminStats,
  type Question,
  type Topic,
  type Chapter,
} from "@/lib/api";

type Tab = "stats" | "questions" | "topics";

export default function AdminPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<Tab>("stats");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = getUser();
    setAuthorized(user?.role === "admin");
  }, []);

  if (!authorized) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-red-500 text-lg">
          {isAr ? "غير مصرح - يتطلب صلاحيات المشرف" : "Non autorizzato — richiede ruolo admin"}
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">Admin CMS</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
        {(["stats", "questions", "topics"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              tab === t
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {t === "stats" ? "Dashboard" : t === "questions" ? (isAr ? "الأسئلة" : "Domande") : (isAr ? "المواضيع" : "Argomenti")}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab isAr={isAr} />}
      {tab === "questions" && <QuestionsTab isAr={isAr} />}
      {tab === "topics" && <TopicsTab isAr={isAr} />}
    </main>
  );
}

function StatsTab({ isAr }: { isAr: boolean }) {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) getAdminStats(token).then(setStats);
  }, []);

  if (!stats) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );

  const cards = [
    { label: isAr ? "الأسئلة" : "Domande", value: stats.questions, color: "text-blue-600" },
    { label: isAr ? "المواضيع" : "Argomenti", value: stats.topics, color: "text-green-600" },
    { label: isAr ? "الفصول" : "Capitoli", value: stats.chapters, color: "text-purple-600" },
    { label: isAr ? "المستخدمون" : "Utenti", value: stats.users, color: "text-orange-600" },
    { label: isAr ? "الاختبارات" : "Quiz", value: stats.quizAttempts, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p className={`text-3xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({ isAr }: { isAr: boolean }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filterChapter, setFilterChapter] = useState<number | undefined>();
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Question>>({});
  const limit = 20;

  useEffect(() => {
    getChapters().then(setChapters);
  }, []);

  useEffect(() => {
    getQuestions({ chapterId: filterChapter, limit, offset: page * limit })
      .then((res) => {
        setQuestions(res.data);
        setTotal(res.total);
      });
  }, [page, filterChapter]);

  const handleSave = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const updated = await updateQuestion(token, id, editData);
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
      setEditing(null);
      setEditData({});
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!confirm(isAr ? "حذف هذا السؤال؟" : "Eliminare questa domanda?")) return;
    try {
      await deleteQuestion(token, id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setTotal((t) => t - 1);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterChapter ?? ""}
          onChange={(e) => { setFilterChapter(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <option value="">{isAr ? "جميع الفصول" : "Tutti i capitoli"}</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.number}. {isAr ? ch.nameAr : ch.nameIt}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">
          {total.toLocaleString()} {isAr ? "سؤال" : "domande"}
        </span>
      </div>

      {/* Question list */}
      <div className="space-y-2 mb-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            {editing === q.id ? (
              <div className="space-y-2">
                <input
                  defaultValue={q.textIt}
                  onChange={(e) => setEditData((d) => ({ ...d, textIt: e.target.value }))}
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Testo IT"
                />
                <input
                  defaultValue={q.textAr}
                  onChange={(e) => setEditData((d) => ({ ...d, textAr: e.target.value }))}
                  dir="rtl"
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Testo AR"
                />
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      defaultChecked={q.isTrue}
                      onChange={(e) => setEditData((d) => ({ ...d, isTrue: e.target.checked }))}
                    />
                    {isAr ? "صحيح" : "Vero"}
                  </label>
                  <button onClick={() => handleSave(q.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                    {isAr ? "حفظ" : "Salva"}
                  </button>
                  <button onClick={() => { setEditing(null); setEditData({}); }} className="text-gray-500 text-sm">
                    {isAr ? "إلغاء" : "Annulla"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${q.isTrue ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                      {q.isTrue ? "V" : "F"}
                    </span>
                    <span className="text-xs text-gray-400">{q.code}</span>
                  </div>
                  <p className="text-sm mt-1">{q.textIt}</p>
                  <p className="text-xs text-gray-500 mt-0.5" dir="rtl">{q.textAr}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditing(q.id); setEditData({}); }} className="text-blue-600 text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">
                    {isAr ? "تعديل" : "Edit"}
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="text-red-600 text-xs px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950 rounded">
                    {isAr ? "حذف" : "Del"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-800 text-sm disabled:opacity-30"
        >
          ←
        </button>
        <span className="text-sm text-gray-500">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-800 text-sm disabled:opacity-30"
        >
          →
        </button>
      </div>
    </div>
  );
}

function TopicsTab({ isAr }: { isAr: boolean }) {
  const [topicsList, setTopicsList] = useState<Topic[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Topic>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    getTopics().then(setTopicsList);
  }, []);

  const handleSave = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const updated = await updateTopic(token, id, editData);
      setTopicsList((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      setEditing(null);
      setEditData({});
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filtered = topicsList.filter((t) =>
    !filter || t.titleIt.toLowerCase().includes(filter.toLowerCase()) || t.topicKey.includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={isAr ? "ابحث عن موضوع..." : "Cerca argomento..."}
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
        />
        <span className="text-sm text-gray-500 self-center">{filtered.length}</span>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 50).map((t) => (
          <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
            {editing === t.id ? (
              <div className="space-y-2">
                <input
                  defaultValue={t.titleIt}
                  onChange={(e) => setEditData((d) => ({ ...d, titleIt: e.target.value }))}
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Titolo IT"
                />
                <input
                  defaultValue={t.titleAr}
                  onChange={(e) => setEditData((d) => ({ ...d, titleAr: e.target.value }))}
                  dir="rtl"
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Titolo AR"
                />
                <textarea
                  defaultValue={t.contentIt}
                  onChange={(e) => setEditData((d) => ({ ...d, contentIt: e.target.value }))}
                  rows={3}
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Contenuto IT"
                />
                <textarea
                  defaultValue={t.contentAr}
                  onChange={(e) => setEditData((d) => ({ ...d, contentAr: e.target.value }))}
                  dir="rtl"
                  rows={3}
                  className="w-full text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Contenuto AR"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(t.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                    {isAr ? "حفظ" : "Salva"}
                  </button>
                  <button onClick={() => { setEditing(null); setEditData({}); }} className="text-gray-500 text-sm">
                    {isAr ? "إلغاء" : "Annulla"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono">{t.topicKey}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {t.questionCount} Q
                    </span>
                  </div>
                  <p className="text-sm font-medium">{isAr ? t.titleAr : t.titleIt}</p>
                  {t.contentIt && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.contentIt}</p>
                  )}
                </div>
                <button
                  onClick={() => { setEditing(t.id); setEditData({}); }}
                  className="text-blue-600 text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950 rounded shrink-0"
                >
                  {isAr ? "تعديل" : "Edit"}
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length > 50 && (
          <p className="text-sm text-gray-500 text-center py-2">
            {isAr ? `${filtered.length - 50} مواضيع أخرى...` : `Mostrando 50 di ${filtered.length}. Usa il filtro per trovare altri.`}
          </p>
        )}
      </div>
    </div>
  );
}
