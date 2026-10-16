"use client";

import { useEffect, useState } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { hasAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

export function AnalyticsConsentSection() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setConsent(hasAnalyticsConsent()), []);

  const updateConsent = async (next: boolean) => {
    setSaving(true);
    setError("");
    try {
      await setAnalyticsConsent(next);
      setConsent(next);
    } catch {
      setError("Could not update your analytics preference. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="analytics-consent-title">
      <div className="space-y-2">
        <h2 id="analytics-consent-title" className="text-lg font-semibold">Product analytics</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Optional usage events help us understand onboarding and feature use. We do not send account names, amounts, income, obligations, or scenario values.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {consent === null ? (
          <p role="status" className="text-sm text-muted-foreground">Loading analytics preference…</p>
        ) : consent ? (
          <>
            <p className="text-sm text-muted-foreground">Analytics are enabled.</p>
            <Button type="button" variant="outline" onClick={() => void updateConsent(false)} disabled={saving}>{saving ? "Updating…" : "Disable analytics"}</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Analytics are disabled.</p>
            <Button type="button" variant="outline" onClick={() => void updateConsent(true)} disabled={saving}>{saving ? "Updating…" : "Enable analytics"}</Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}