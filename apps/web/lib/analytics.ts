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
  return typeof window !== "undefined"
    && window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted";
}

export async function setAnalyticsConsent(consent: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent ? "granted" : "denied");

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
  posthog.capture(event);
}

export async function trackProductEventOnce(event: ProductEvent) {
  if (!hasAnalyticsConsent() || typeof window === "undefined") return;
  const key = `flowmoney:analytics-event:${event}`;
  if (window.localStorage.getItem(key) === "sent") return;
  await trackProductEvent(event);
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) window.localStorage.setItem(key, "sent");
}

async function initializePostHog() {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || typeof window === "undefined") return;

  posthogInit ??= (async () => {
    const { default: posthog } = await import("posthog-js");
    if (!posthog.__loaded) {
      posthog.init(apiKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_surveys: true,
        persistence: "localStorage",
        person_profiles: "identified_only",
      });
    }
  })();

  await posthogInit;
}
