import { Button } from "@flowmoney/ui/components/button";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="flex max-w-md flex-col gap-4 text-sm leading-relaxed">
        <div>
          <h1 className="font-medium">FlowMoney is ready</h1>
          <p className="text-muted-foreground">
            Your Next.js app and shared component workspace are connected.
          </p>
          <Button className="mt-4">Get started</Button>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          Press <kbd>d</kbd> to toggle dark mode.
        </p>
      </section>
    </main>
  );
}
