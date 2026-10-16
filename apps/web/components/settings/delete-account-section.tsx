"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { clearLocalAccountState } from "@/lib/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function DeleteAccountSection() {
  const { getToken, isLoaded, userId } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmation !== "DELETE") return;

    setDeleting(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Sign in again before deleting your account.");

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Account deletion failed (HTTP ${response.status}). Please try again.`);
      }

      clearLocalAccountState(userId ?? undefined);
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete your account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-5 sm:p-6" aria-labelledby="delete-account-title">
      <div className="space-y-2">
        <h2 id="delete-account-title" className="text-lg font-semibold">Delete FlowMoney account</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This permanently removes your saved accounts, expected income, obligations, and onboarding progress from FlowMoney. Your Clerk sign-in identity is not deleted. If you return later, you can start with a new, empty FlowMoney profile.
        </p>
      </div>

      <form onSubmit={deleteAccount} className="space-y-3">
        <label className="block space-y-2 text-sm font-medium" htmlFor="delete-account-confirmation">
          Type <span className="font-mono">DELETE</span> to confirm
          <input
            id="delete-account-confirmation"
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={!isLoaded || deleting}
          />
        </label>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <Button type="submit" variant="destructive" disabled={!isLoaded || deleting || confirmation !== "DELETE"}>
          {deleting ? "Deleting account…" : "Delete my FlowMoney data"}
        </Button>
      </form>
    </section>
  );
}
