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
  getAdminCodes,
  createAdminCodes,
  extendCode,
  revokeCode,
  deleteCode,
  getAdminUsers,
  toggleUserActive,
  changeUserRole,
  type AdminStats,
  type Question,
  type Topic,
  type Chapter,
  type AccessCode,
  type AdminUser,
} from "@/lib/api";

type Tab = "stats" | "questions" | "topics" | "codes" | "users";

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
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        {(["stats", "codes", "users", "questions", "topics"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = {
            stats: "Dashboard",
            codes: isAr ? "الأكواد" : "Codici",
            users: isAr ? "المستخدمون" : "Utenti",
            questions: isAr ? "الأسئلة" : "Domande",
            topics: isAr ? "المواضيع" : "Argomenti",
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition whitespace-nowrap ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === "stats" && <StatsTab isAr={isAr} />}
      {tab === "codes" && <CodesTab isAr={isAr} />}
      {tab === "users" && <UsersTab isAr={isAr} />}
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

function CodesTab({ isAr }: { isAr: boolean }) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [genCount, setGenCount] = useState(1);
  const [genDuration, setGenDuration] = useState("10080"); // 7 days default
  const [generating, setGenerating] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  useEffect(() => {
    if (token) getAdminCodes(token).then(setCodes).finally(() => setLoading(false));
  }, [token]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newCodes = await createAdminCodes(token, {
        count: genCount,
        durationMinutes: Number(genDuration),
      });
      setCodes((prev) => [...newCodes, ...prev]);
    } catch (e: any) {
      alert(e.message);
    }
    setGenerating(false);
  };

  const handleRevoke = async (id: number) => {
    if (!confirm(isAr ? "إلغاء هذا الكود؟" : "Revocare questo codice?")) return;
    try {
      const updated = await revokeCode(token, id);
      setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(isAr ? "حذف هذا الكود؟" : "Eliminare questo codice?")) return;
    try {
      await deleteCode(token, id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExtend = async (id: number) => {
    const input = prompt(isAr ? "أضف دقائق:" : "Minuti da aggiungere:", "10080");
    if (!input) return;
    try {
      const updated = await extendCode(token, id, Number(input));
      setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const durationLabel = (mins: number) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)}g`;
    if (mins >= 60) return `${Math.round(mins / 60)}h`;
    return `${mins}m`;
  };

  const codeStatus = (c: AccessCode) => {
    if (!c.isUsed) return { label: isAr ? "متاح" : "Disponibile", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    if (c.expiresAt && new Date(c.expiresAt) > new Date()) return { label: isAr ? "نشط" : "Attivo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
    return { label: isAr ? "منتهي" : "Scaduto", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" };
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const available = codes.filter((c) => !c.isUsed).length;
  const active = codes.filter((c) => c.isUsed && c.expiresAt && new Date(c.expiresAt) > new Date()).length;

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-green-600 font-medium">{available} {isAr ? "متاح" : "disponibili"}</span>
        <span className="text-blue-600 font-medium">{active} {isAr ? "نشط" : "attivi"}</span>
        <span className="text-gray-500">{codes.length} {isAr ? "إجمالي" : "totali"}</span>
      </div>

      {/* Generator */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isAr ? "عدد" : "Quantità"}</label>
          <input type="number" min={1} max={50} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}
            className="w-20 text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{isAr ? "المدة" : "Durata"}</label>
          <select value={genDuration} onChange={(e) => setGenDuration(e.target.value)}
            className="text-sm px-2 py-1.5 border rounded dark:bg-gray-800 dark:border-gray-700">
            <option value="60">1 ora</option>
            <option value="1440">1 giorno</option>
            <option value="10080">7 giorni</option>
            <option value="43200">30 giorni</option>
            <option value="129600">90 giorni</option>
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50">
          {generating ? "..." : (isAr ? "إنشاء" : "Genera")}
        </button>
      </div>

      {/* Code list */}
      <div className="space-y-2">
        {codes.map((c) => {
          const status = codeStatus(c);
          return (
            <div key={c.id} className="card p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold">{c.code}</code>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${status.color}`}>{status.label}</span>
                  <span className="text-xs text-gray-500">{durationLabel(c.durationMinutes)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {c.userId && <span>User #{c.userId} • </span>}
                  {c.activatedAt && <span>{new Date(c.activatedAt).toLocaleDateString()} • </span>}
                  {c.expiresAt && <span>{isAr ? "ينتهي" : "Scade"}: {new Date(c.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {c.isUsed && c.expiresAt && new Date(c.expiresAt) > new Date() && (
                  <>
                    <button onClick={() => handleExtend(c.id)} className="text-blue-600 text-xs px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">+</button>
                    <button onClick={() => handleRevoke(c.id)} className="text-orange-600 text-xs px-2 py-1 hover:bg-orange-50 dark:hover:bg-orange-950 rounded">{isAr ? "إلغاء" : "Revoca"}</button>
                  </>
                )}
                {!c.isUsed && (
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 text-xs px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950 rounded">{isAr ? "حذف" : "Elimina"}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsersTab({ isAr }: { isAr: boolean }) {
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  useEffect(() => {
    if (token) getAdminUsers(token).then(setUsersList).finally(() => setLoading(false));
  }, [token]);

  const handleToggle = async (id: number) => {
    try {
      const result = await toggleUserActive(token, id);
      setUsersList((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: result.isActive } : u)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRoleChange = async (id: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "student" : "admin";
    if (!confirm(`${isAr ? "تغيير الدور إلى" : "Cambiare ruolo a"} ${newRole}?`)) return;
    try {
      const result = await changeUserRole(token, id, newRole as "student" | "admin");
      setUsersList((prev) => prev.map((u) => (u.id === id ? { ...u, role: result.role } : u)));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  const filtered = usersList.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.nameIt.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter((u) => u.role === "admin").length;

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? "ابحث عن مستخدم..." : "Cerca utente..."}
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        <span className="text-sm text-gray-500">{filtered.length} {isAr ? "مستخدم" : "utenti"} • {admins} admin</span>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 100).map((u) => (
          <div key={u.id} className="card p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium">{u.email}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  u.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>{u.role}</span>
                {!u.isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{isAr ? "معطل" : "Disattivo"}</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {u.nameIt && <span>{u.nameIt} • </span>}
                ID: {u.id} • {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => handleRoleChange(u.id, u.role)}
                className="text-purple-600 text-xs px-2 py-1 hover:bg-purple-50 dark:hover:bg-purple-950 rounded">
                {u.role === "admin" ? "→Student" : "→Admin"}
              </button>
              <button onClick={() => handleToggle(u.id)}
                className={`text-xs px-2 py-1 rounded ${u.isActive ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-950"}`}>
                {u.isActive ? (isAr ? "تعطيل" : "Disattiva") : (isAr ? "تفعيل" : "Attiva")}
              </button>
            </div>
          </div>
        ))}
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
