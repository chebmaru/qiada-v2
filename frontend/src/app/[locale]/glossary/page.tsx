"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getGlossary, type GlossaryTerm } from "@/lib/api";
import TTSButton from "@/components/TTSButton";

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
      <main className="flex-1 flex items-center justify-center">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-4">{t("common.glossary")}</h1>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={isAr ? "ابحث..." : "Cerca..."}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 mb-4"
      />

      <p className="text-sm text-gray-500 mb-4">
        {filtered.length} {isAr ? "مصطلح" : "termini"}
      </p>

      <div className="space-y-3">
        {filtered.map((term) => (
          <div
            key={term.id}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1">
                <TTSButton text={term.termIt} lang="it" />
                <h3 className="font-bold text-blue-700 dark:text-blue-400">
                  {isAr ? term.termAr : term.termIt}
                </h3>
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {term.category}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              {isAr ? term.termIt : term.termAr}
            </p>
            <div className="flex items-start gap-1 mt-2">
              <TTSButton text={term.definitionIt} lang="it" />
              <p className="text-sm">
                {isAr ? term.definitionAr : term.definitionIt}
              </p>
            </div>
            {(isAr ? term.definitionIt : term.definitionAr) && (
              <p className="text-sm text-gray-500 mt-1">
                {isAr ? term.definitionIt : term.definitionAr}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
