"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@flowmoney/ui/components/button";

export function AccountSettingsSection() {
  const { openUserProfile } = useClerk();
  const { user, isLoaded } = useUser();

  return (
    <section
      aria-labelledby="account-settings-title"
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="space-y-2">
        <h2 id="account-settings-title" className="text-lg font-semibold">
          Account &amp; security
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Manage your profile, email and available sign-in and security options.
        </p>
      </div>
      {isLoaded && user?.primaryEmailAddress?.emailAddress && (
        <p className="break-all text-sm">
          {user.primaryEmailAddress.emailAddress}
        </p>
      )}
      <Button
        variant="outline"
        disabled={!isLoaded || !user}
        onClick={() => openUserProfile()}
      >
        Manage account
      </Button>
      <p className="text-xs leading-6 text-muted-foreground">
        Account settings open in the secure sign-in panel.
      </p>
    </section>
  );
}
