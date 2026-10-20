import type { ErrorEvent } from "@sentry/nextjs";
// Allowlist rather than redact unknown keys: exception messages can contain financial data.
export function sanitizeMonitoringEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: /^[a-f0-9]{32}$/i.test(event.event_id ?? "")
      ? event.event_id
      : undefined,
    timestamp: event.timestamp,
    platform: "javascript",
    level: "error",
    exception: {
      values: (event.exception?.values ?? [])
        .slice(0, 3)
        .map(() => ({
          type: "Error",
          value: "Application error (details removed for privacy)",
        })),
    },
  };
}
export const monitoringPrivacy = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeBreadcrumb: () => null,
  beforeSend: sanitizeMonitoringEvent,
  beforeSendTransaction: () => null,
};
