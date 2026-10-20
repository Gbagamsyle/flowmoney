import { InstallSection } from "@/components/pwa/install-section";
import { LegalLinks } from "@/components/legal/legal-links";
import { CurrencyReviewSection } from "@/components/settings/currency-review-section";
import { AccountSettingsSection } from "@/components/settings/account-settings-section";
import { AppearanceSettingsSection } from "@/components/settings/appearance-settings-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { AnalyticsConsentSection } from "@/components/settings/analytics-consent-section";
import { CurrencyPreferenceSection } from "@/components/settings/currency-preference-section";

import { SupportSettingsSection } from "@/components/settings/support-settings-section";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Preferences
        </h1>
      </div>

      <AccountSettingsSection />
      <AppearanceSettingsSection />
      <InstallSection />
      <CurrencyPreferenceSection />
      <CurrencyReviewSection />
      <AnalyticsConsentSection />
      <SupportSettingsSection />
      <section className="space-y-3 rounded-xl border bg-card p-5 sm:p-6" aria-label="Legal and privacy"><h2 className="text-lg font-semibold">Legal & privacy</h2><LegalLinks /></section>
      <DeleteAccountSection />
    </div>
  );
}
