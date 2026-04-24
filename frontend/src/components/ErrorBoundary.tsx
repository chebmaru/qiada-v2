"use client";

import React from "react";

interface ErrorBoundaryProps {
  locale: "ar" | "it";
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const messages = {
  it: {
    title: "Qualcosa è andato storto",
    description: "Si è verificato un errore imprevisto. Riprova o torna alla home.",
    retry: "Riprova",
  },
  ar: {
    title: "حدث خطأ ما",
    description: "حدث خطأ غير متوقع. حاول مرة أخرى أو ارجع إلى الصفحة الرئيسية.",
    retry: "إعادة المحاولة",
  },
} as const;

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const t = messages[this.props.locale];
    const isRtl = this.props.locale === "ar";

    return (
      <div
        className="flex flex-col items-center justify-center py-16 px-6 text-center"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="card max-w-sm w-full p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {t.title}
          </h3>

          <p className="text-sm text-[var(--muted)]">{t.description}</p>

          <button onClick={this.handleRetry} className="btn-primary mt-2">
            {t.retry}
          </button>
        </div>
      </div>
    );
  }
}
