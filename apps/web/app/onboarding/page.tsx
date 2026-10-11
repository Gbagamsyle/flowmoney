import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <OnboardingFlow />;
}
