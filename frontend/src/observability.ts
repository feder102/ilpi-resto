// Sentry error monitoring for the frontend (Issue #58).
//
// Opt-in: if VITE_SENTRY_DSN is not set, initSentry() is a no-op and no data is
// sent. When set, unhandled render errors (via ErrorBoundary) and runtime
// exceptions are reported, tagged with the environment.
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // Keep tracing off by default; enable via env when needed.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Do not attach PII (IP address) automatically.
    sendDefaultPii: false,
  });
}

/** Attach the authenticated user's id/tenant to Sentry events (no-op if disabled). */
export function setSentryUser(user: { id: string; tenant_id: string; role: string } | null): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id });
    Sentry.setTag('tenant_id', user.tenant_id);
    Sentry.setTag('role', user.role);
  } else {
    Sentry.setUser(null);
  }
}
