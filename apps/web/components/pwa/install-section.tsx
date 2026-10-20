"use client";
import { Button } from "@flowmoney/ui/components/button";
import { usePwa } from "./pwa-provider";
export function InstallSection() {
  const { installed, canInstall, install, updateReady, update, error } =
    usePwa();
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
      aria-labelledby="install-title"
    >
      <div className="space-y-2">
        <h2 id="install-title" className="text-lg font-semibold">
          FlowMoney on your device
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Open FlowMoney from your home screen or desktop. An internet
          connection is required for your financial records.
        </p>
      </div>
      {installed ? (
        <p className="text-sm text-muted-foreground">
          You’re using the installed app.
        </p>
      ) : canInstall ? (
        <Button variant="outline" onClick={() => void install()}>
          Install FlowMoney
        </Button>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          Look for Install app in your browser menu. On iPhone or iPad, open
          FlowMoney in Safari, tap Share, then Add to Home Screen. Availability
          depends on your browser.
        </p>
      )}
      {updateReady && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            An app update is ready. Finish any unsaved changes before updating.
          </p>
          <Button variant="outline" onClick={update}>
            Update app
          </Button>
        </div>
      )}
      {error && (
        <p className="text-sm text-muted-foreground" role="status">
          {error}
        </p>
      )}
    </section>
  );
}
