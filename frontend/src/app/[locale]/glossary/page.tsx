"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getGlossary, type GlossaryTerm } from "@/lib/api";
import TTSButton from "@/components/TTSButton";
import { SkeletonList } from "@/components/Skeleton";

export default function GlossaryPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlossary()
      .then(setTerms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return terms;
    const q = search.toLowerCase();
    return terms.filter(
      (t) =>
        t.termIt.toLowerCase().includes(q) ||
        t.termAr.includes(q) ||
        t.definitionIt.toLowerCase().includes(q) ||
        t.definitionAr.includes(q)
    );
  }, [terms, search]);

  if (loading) {
    return (
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="h-8 w-40 skeleton rounded mb-4" />
        <div className="h-10 skeleton rounded-xl mb-4" />
        <SkeletonList />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold tracking-tight mb-4">{t("common.glossary")}</h1>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={isAr ? "ابحث..." : "Cerca..."}
        className="w-full px-4 py-2.5 border border-[var(--card-border)] rounded-xl bg-[var(--card)] mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
      />

      <p className="text-sm text-[var(--muted)] mb-4">
        {filtered.length} {isAr ? "مصطلح" : "termini"}
      </p>

      <div className="space-y-3">
        {filtered.map((term) => (
          <div key={term.id} className="card p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1">
                <TTSButton text={term.termIt} lang="it" />
                <h3 className="font-bold text-gradient">
                  {isAr ? term.termAr : term.termIt}
                </h3>
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {term.category}
              </span>
            </div>
            <p className="text-sm text-[var(--muted)] mb-1">
              {isAr ? term.termIt : term.termAr}
            </p>
            <div className="flex items-start gap-1 mt-2">
              <TTSButton text={term.definitionIt} lang="it" />
              <p className="text-sm">
                {isAr ? term.definitionAr : term.definitionIt}
              </p>
            </div>
            {(isAr ? term.definitionIt : term.definitionAr) && (
              <p className="text-sm text-[var(--muted)] mt-1">
                {isAr ? term.definitionIt : term.definitionAr}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
