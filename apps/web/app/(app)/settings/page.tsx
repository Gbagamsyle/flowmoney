import { AccountSettingsSection } from "@/components/settings/account-settings-section";
import { AppearanceSettingsSection } from "@/components/settings/appearance-settings-section";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { AnalyticsConsentSection } from "@/components/settings/analytics-consent-section";
import { CurrencyPreferenceSection } from "@/components/settings/currency-preference-section";

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
      <CurrencyPreferenceSection />
      <AnalyticsConsentSection />
      <DeleteAccountSection />
    </div>
  );
}
