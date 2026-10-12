import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { OnboardingRouteGate } from "@/components/layout/onboarding-route-gate";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <OnboardingRouteGate>
      <div className="min-h-screen bg-background">
        <AppSidebar />

        <div className="pb-16 lg:pb-0 lg:pl-64">
          <AppHeader />

          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </OnboardingRouteGate>
  );
}
