"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getUser, logout } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isAr = locale === "ar";

  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  };

  const mainLinks = [
    { href: "/" as const, label: t("common.home") },
    { href: "/quiz" as const, label: t("common.quiz") },
    { href: "/topics" as const, label: t("common.topics") },
    { href: "/glossary" as const, label: t("common.glossary") },
    { href: "/tricks" as const, label: t("common.tricks") },
  ];

  const moreLinks = [
    { href: "/confusing" as const, label: t("common.confusing") },
    ...(user
      ? [
          { href: "/dashboard" as const, label: t("common.dashboard") },
          { href: "/review" as const, label: t("common.review") },
          { href: "/stats" as const, label: t("common.stats") },
          { href: "/settings" as const, label: t("common.settings") },
          ...(user.role === "admin" ? [{ href: "/admin" as const, label: "Admin" }] : []),
        ]
      : []),
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <nav aria-label="Desktop navigation" className="hidden md:block sticky top-0 z-40 glass border-b border-[var(--card-border)]">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-xl font-extrabold text-gradient tracking-tight">
          {t("common.appName")}
        </Link>

        <div className="flex items-center gap-0.5">
          {mainLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                isActive(href)
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {label}
              {isActive(href) && (
                <span className="absolute bottom-0 inset-x-1.5 h-0.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
              )}
            </Link>
          ))}

          {/* Overflow menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-2 rounded-lg transition ${menuOpen ? "bg-black/5 dark:bg-white/5" : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5"}`}
              aria-label="More"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className={`absolute ${isAr ? "left-0" : "right-0"} mt-2 w-52 glass rounded-xl shadow-xl border border-[var(--card-border)] py-1.5 z-50`}
              >
                {moreLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition ${
                      isActive(href)
                        ? "text-[var(--foreground)] font-medium bg-black/5 dark:bg-white/5"
                        : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </Link>
                ))}

                <div className="border-t border-[var(--card-border)] my-1.5 mx-3" />

                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-start px-4 py-2.5 text-sm text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {t("common.logout")}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-gradient hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    {t("common.login")}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Language switcher */}
          <Link
            href={pathname}
            locale={isAr ? "it" : "ar"}
            className="ms-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xs font-bold flex items-center justify-center hover:shadow-md hover:shadow-blue-500/25 transition"
          >
            {isAr ? "IT" : "ع"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
