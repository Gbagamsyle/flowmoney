import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  transpilePackages: ["@flowmoney/ui"],
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
});
