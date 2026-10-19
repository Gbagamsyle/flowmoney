import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Keep disposable QA separate from an existing development server.
  distDir: process.env.FLOWMONEY_ISOLATED_QA === "true" ? ".next-qa" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@flowmoney/ui"],
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
});
