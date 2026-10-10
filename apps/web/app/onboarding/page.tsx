import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@flowmoney/ui/components/button";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Welcome
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Let&apos;s set up your money view.</h1>

        <p className="mt-4 text-muted-foreground">
          Start by adding your current funds so your dashboard can show what&apos;s available,
          what&apos;s coming in, and what needs protecting before you spend.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/accounts">
            <Button>Start with current funds</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Go to dashboard</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
