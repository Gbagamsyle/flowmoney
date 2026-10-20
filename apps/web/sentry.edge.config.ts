import { monitoringPrivacy } from "./lib/monitoring-privacy";
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  ...monitoringPrivacy,
});