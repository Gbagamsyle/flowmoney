"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@flowmoney/ui/components/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">The page hit an unexpected error. You can retry, or return to your dashboard.</p>
      </div>
      <Button type="button" onClick={() => reset()}>Try again</Button>
    </main>
  );
}