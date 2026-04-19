"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getUser, logout } from "@/lib/auth";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isAr = locale === "ar";

  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/");
  };

  const links = [
    { href: "/" as const, label: t("common.home") },
    { href: "/quiz" as const, label: t("common.quiz") },
    { href: "/topics" as const, label: t("common.topics") },
    { href: "/glossary" as const, label: t("common.glossary") },
  ];

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

          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === "/dashboard"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {t("common.dashboard")}
              </Link>
              <Link
                href="/settings"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === "/settings"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {t("common.settings")}
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("common.logout")}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              {t("common.login")}
            </Link>
          )}

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
