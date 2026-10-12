import { ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";
import { Button } from "@flowmoney/ui/components/button";

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Scenarios</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">What-if planning</h1>
        <p className="mt-2 text-muted-foreground">Explore possible changes to your plans before they happen.</p>
      </div>

      <section className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><GitBranch className="size-6" /></div>
        <h2 className="mt-4 text-lg font-semibold">No scenarios yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Scenario planning is coming next. For now, add expected income and obligations to see the commitments shaping your current picture.</p>
        <Link href="/obligations" className="mt-5 inline-block"><Button variant="outline">Review obligations<ArrowRight className="ml-2 size-4" /></Button></Link>
      </section>
    </div>
  );
}
