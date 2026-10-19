import { expect, test } from "@playwright/test";
import posthog from "posthog-js";
import {
  ANALYTICS_CONSENT_KEY,
  setAnalyticsConsent,
  trackProductEvent,
  trackProductEventOnce,
} from "../lib/analytics";

test("analytics respects disabled, enabled, re-enabled and revoked consent without financial payloads", async () => {
  const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const original = {
    init: posthog.init,
    capture: posthog.capture,
    opt_in_capturing: posthog.opt_in_capturing,
    opt_out_capturing: posthog.opt_out_capturing,
    __loaded: posthog.__loaded,
    has_opted_out_capturing: posthog.has_opted_out_capturing,
  };
  const values = new Map<string, string>();
  const events: unknown[][] = [];
  let enabled = false;
  let initialized = 0;
  let optIns = 0;
  let failInitialization = true;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });
  Object.assign(posthog, {
    __loaded: false,
    init: () => {
      initialized++;
      if (failInitialization) {
        failInitialization = false;
        throw new Error("Synthetic SDK load failure");
      }
      posthog.__loaded = true;
    },
    has_opted_out_capturing: () => !enabled,
    opt_in_capturing: () => {
      optIns++;
      enabled = true;
    },
    opt_out_capturing: () => {
      enabled = false;
    },
    capture: (...args: unknown[]) => {
      if (enabled) events.push(args);
    },
  });
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "synthetic-test-key";
  try {
    await trackProductEvent("scenario_used");
    expect(initialized).toBe(0);
    expect(events).toEqual([]);
    await expect(setAnalyticsConsent(true)).rejects.toThrow(
      "Synthetic SDK load failure",
    );
    await setAnalyticsConsent(true);
    await trackProductEvent("scenario_used");
    expect(events).toEqual([["scenario_used"]]);
    await setAnalyticsConsent(false);
    await trackProductEvent("scenario_used");
    expect(events).toHaveLength(1);
    await setAnalyticsConsent(true);
    await trackProductEvent("dashboard_returned");
    expect(events).toEqual([["scenario_used"], ["dashboard_returned"]]);
    expect(initialized).toBe(2);
    expect(optIns).toBe(2);
    // Revoke consent immediately while an event is waiting for SDK readiness.
    const pending = trackProductEvent("scenario_used");
    await setAnalyticsConsent(false);
    await pending;
    expect(values.get(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(enabled).toBe(false);
    expect(events).toHaveLength(2);
    await setAnalyticsConsent(true);
    const oncePending = trackProductEventOnce(
      "first_fund_created",
      "synthetic-qa",
    );
    await setAnalyticsConsent(false);
    await oncePending;
    await setAnalyticsConsent(true);
    await trackProductEventOnce("first_fund_created", "synthetic-qa");
    await trackProductEventOnce("first_fund_created", "synthetic-qa");
    expect(events.slice(2)).toEqual([["first_fund_created"]]);
  } finally {
    Object.assign(posthog, original);
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    else process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey;
  }
});
