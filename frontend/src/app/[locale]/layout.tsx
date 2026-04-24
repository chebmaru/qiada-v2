import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import ThemeProvider from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/components/Onboarding";
import OfflineSync from "@/components/OfflineSync";
import Analytics from "@/components/Analytics";
import ErrorBoundary from "@/components/ErrorBoundary";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'it' | 'ar')) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <a href="#main-content" className="skip-to-main">
              {locale === "ar" ? "انتقل إلى المحتوى" : "Vai al contenuto"}
            </a>
            <Navbar />
            <OfflineSync />
            <ErrorBoundary locale={locale as "it" | "ar"}>
              <div id="main-content" role="main">
                {children}
              </div>
            </ErrorBoundary>
            <BottomNav />
            <Onboarding />
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
