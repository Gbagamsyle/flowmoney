import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CurrencyStatus } from "@/components/settings/currency-status";
import { ProductTour } from "@/components/layout/product-tour";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { OnboardingRouteGate } from "@/components/layout/onboarding-route-gate";
import { PreferredCurrencyProvider } from "@/components/settings/preferred-currency-provider";

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
    <PreferredCurrencyProvider>
      <OnboardingRouteGate>
      <div className="min-h-svh bg-background">
        <AppSidebar />
        <ProductTour />

        <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
          <AppHeader />

          <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <CurrencyStatus />
            {children}
          </main>
        </div>
      </div>
      </OnboardingRouteGate>
    </PreferredCurrencyProvider>
  );
}
