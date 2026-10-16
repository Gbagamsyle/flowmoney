import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { CurrencyPreferenceSection } from "@/components/settings/currency-preference-section";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Preferences</h1>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        Profile and planning preferences will go here.
      </div>

      <CurrencyPreferenceSection />
      <DeleteAccountSection />
    </div>
  );
}
