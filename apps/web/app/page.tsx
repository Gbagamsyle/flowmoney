import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@flowmoney/ui/components/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="flex max-w-md flex-col gap-4 text-sm leading-relaxed">
        <div>
          <h1 className="font-medium">FlowMoney is ready</h1>
          <p className="text-muted-foreground">
            Track your current funds, upcoming income, and protected obligations in
            one place.
          </p>
          <Link href="/sign-up" className="mt-4 inline-block">
            <Button>Get started</Button>
          </Link>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          Already have an account? <Link href="/sign-in" className="underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
