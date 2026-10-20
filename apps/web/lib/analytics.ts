export const ANALYTICS_CONSENT_KEY = "flowmoney:analytics-consent";

export type ProductEvent =
  | "onboarding_completed"
  | "first_fund_created"
  | "first_expected_income_created"
  | "first_obligation_created"
  | "scenario_used"
  | "dashboard_returned";

let posthogInit: Promise<void> | undefined;

export function hasAnalyticsConsent() {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted"
  );
}

export async function setAnalyticsConsent(consent: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ANALYTICS_CONSENT_KEY,
    consent ? "granted" : "denied",
  );

  if (!consent) {
    const { default: posthog } = await import("posthog-js");
    if (posthog.__loaded) posthog.opt_out_capturing();
    return;
  }

  await initializePostHog();
}

export async function trackProductEvent(event: ProductEvent) {
  if (!hasAnalyticsConsent() || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  await initializePostHog();
  const { default: posthog } = await import("posthog-js");
  // Consent may have changed while the SDK was loading.
  if (hasAnalyticsConsent()) posthog.capture(event);
}

export async function trackProductEventOnce(
  event: ProductEvent,
  subjectId = "anonymous",
) {
  return trackProductEventOnceForSubject(event, subjectId);
}

export async function trackProductEventOnceForSubject(
  event: ProductEvent,
  subjectId = "anonymous",
) {
  if (!hasAnalyticsConsent() || typeof window === "undefined") return;
  const safeSubjectId = subjectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `flowmoney:analytics-event:${safeSubjectId}:${event}`;
  if (window.localStorage.getItem(key) === "sent") return;
  try {
    await trackProductEvent(event);
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && hasAnalyticsConsent())
      window.localStorage.setItem(key, "sent");
  } catch {
    // Analytics failures must never interrupt a financial-data action.
  }
}

export async function trackDashboardReturn(subjectId = "anonymous") {
  if (
    !hasAnalyticsConsent() ||
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY
  )
    return;
  const safeSubjectId = subjectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const key = `flowmoney:dashboard-visited:${safeSubjectId}`;
  if (window.localStorage.getItem(key)) {
    try {
      await trackProductEvent("dashboard_returned");
    } catch {
      // Keep monitoring failures out of the dashboard flow.
    }
    return;
  }
  window.localStorage.setItem(key, "seen");
}

export function clearLocalAccountState(subjectId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("flowmoney:onboarding-step-v2");
  if (!subjectId) return;
  const safeSubjectId = subjectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const eventPrefix = `flowmoney:analytics-event:${safeSubjectId}:`;
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(eventPrefix)) window.localStorage.removeItem(key);
  }
  window.localStorage.removeItem(
    `flowmoney:dashboard-visited:${safeSubjectId}`,
  );
}

async function initializePostHog() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || typeof window === "undefined") return;

  posthogInit ??= (async () => {
    const { default: posthog } = await import("posthog-js");
    if (!posthog.__loaded) {
      posthog.init(apiKey, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_surveys: true,
        persistence: "localStorage",
        person_profiles: "identified_only",
      });
    }
  })().catch((error) => {
    posthogInit = undefined;
    throw error;
  });

  await posthogInit;
  const { default: posthog } = await import("posthog-js");
  // Apply the latest preference on every call, including re-enabling analytics.
  if (hasAnalyticsConsent()) {
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  } else posthog.opt_out_capturing();
}
