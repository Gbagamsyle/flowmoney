import { monitoringPrivacy } from "./lib/monitoring-privacy";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  ...monitoringPrivacy,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;