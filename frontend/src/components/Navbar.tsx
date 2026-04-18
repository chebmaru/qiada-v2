"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const isAr = locale === "ar";

  const links = [
    { href: "/", label: t("common.home") },
    { href: "/quiz", label: t("common.quiz") },
    { href: "/topics", label: t("common.topics") },
    { href: "/glossary", label: t("common.glossary") },
  ] as const;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-xl font-bold text-blue-600">
          {t("common.appName")}
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === href
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Language switcher */}
          <Link
            href={pathname}
            locale={isAr ? "it" : "ar"}
            className="ms-2 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isAr ? "IT" : "ع"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
