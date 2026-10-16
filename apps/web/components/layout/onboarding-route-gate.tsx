"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function OnboardingRouteGate({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }

    const checkOnboarding = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token unavailable");

        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }

        if (!response.ok) throw new Error("Could not check onboarding status");

        const user = (await response.json()) as { onboardingCompletedAt: string | null };
        if (!active) return;
        if (!user.onboardingCompletedAt) {
          router.replace("/onboarding");
          return;
        }

        setChecked(true);
      } catch {
        // Keep the signed-in app reachable when the API is temporarily unavailable.
        if (active) setChecked(true);
      }
    };

    void checkOnboarding();
    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn, pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground" role="status">
        Preparing your money view…
      </div>
    );
  }

  return children;
}