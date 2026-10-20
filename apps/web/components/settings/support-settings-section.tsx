import { ReplayProductTour } from "@/components/layout/product-tour";

export function SupportSettingsSection() {
  return (
    <section
      aria-labelledby="support-settings-title"
      className="rounded-xl border bg-card p-5 sm:p-6"
    >
      <h2 id="support-settings-title" className="text-lg font-semibold">
        Help &amp; feedback
      </h2>
      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-medium">Product tour</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Take a guided look around FlowMoney and learn what each section does.
        </p>
        <ReplayProductTour />
      </div>
      <div className="mt-6 space-y-3 border-t pt-6">
        <h3 className="text-sm font-medium">Report a problem</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Tell us what could be clearer. Include the page and what you expected,
          without bank statements or passwords.
        </p>
        <a
          href="mailto:ogabasyle@gmail.com?subject=FlowMoney%20feedback"
          className="inline-flex min-h-10 items-center break-all rounded-lg text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ogabasyle@gmail.com
        </a>
      </div>
    </section>
  );
}
