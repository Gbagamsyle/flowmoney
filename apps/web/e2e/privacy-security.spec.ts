import { expect, test } from "@playwright/test";
import {
  sanitizeMonitoringEvent,
  monitoringPrivacy,
} from "../lib/monitoring-privacy";
import {
  sanitizeAnalyticsEvent,
  ANALYTICS_CONSENT_KEY,
} from "../lib/analytics";

test("diagnostics discard personal data from every event container", () => {
  const event = {
    type: undefined,
    event_id: "a".repeat(32),
    timestamp: 1,
    message: "PRIVATE message",
    user: { email: "PRIVATE email" },
    request: {
      url: "https://app.invalid/?token=PRIVATE",
      data: "PRIVATE statement",
      headers: { Authorization: "PRIVATE token" },
    },
    extra: { balance: "PRIVATE amount" },
    contexts: { financial: { description: "PRIVATE narration" } },
    tags: { account: "PRIVATE account" },
    breadcrumbs: [{ message: "PRIVATE breadcrumb" }],
    exception: {
      values: [
        {
          type: "PRIVATE type",
          value: "PRIVATE exception",
          stacktrace: {
            frames: [
              { filename: "PRIVATE filename", vars: { secret: "PRIVATE" } },
            ],
          },
        },
      ],
    },
  };
  const result = sanitizeMonitoringEvent(event);
  expect(JSON.stringify(result)).not.toContain("PRIVATE");
  expect(result.event_id).toBe("a".repeat(32));
  expect(result.exception?.values?.[0].value).toContain("removed for privacy");
  expect(monitoringPrivacy.tracesSampleRate).toBe(0);
  expect(monitoringPrivacy.beforeBreadcrumb()).toBeNull();
  expect(monitoringPrivacy.beforeSendTransaction()).toBeNull();
});

test("analytics outbound filter removes URLs and unexpected fields and rechecks consent", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  let consent = "granted";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) =>
          key === ANALYTICS_CONSENT_KEY ? consent : null,
      },
    },
  });
  try {
    const event = {
      event: "scenario_used",
      properties: {
        distinct_id: "synthetic-sdk-id",
        token: "public-project-key",
        $device_id: "synthetic-device",
        $current_url: "PRIVATE URL",
        $referrer: "PRIVATE referrer",
        amount: "PRIVATE amount",
        statement: "PRIVATE statement",
        $set: { email: "PRIVATE" },
      },
    };
    const filtered = sanitizeAnalyticsEvent(event);
    expect(JSON.stringify(filtered)).not.toContain("PRIVATE");
    expect(filtered?.properties.distinct_id).toBe("synthetic-sdk-id");
    expect(sanitizeAnalyticsEvent({ ...event, event: "$pageview" })).toBeNull();
    consent = "denied";
    expect(sanitizeAnalyticsEvent(event)).toBeNull();
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
