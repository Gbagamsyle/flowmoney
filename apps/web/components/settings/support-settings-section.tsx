export function SupportSettingsSection() {
  return (
    <section
      aria-labelledby="support-settings-title"
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="space-y-2">
        <h2 id="support-settings-title" className="text-lg font-semibold">
          Help &amp; feedback
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Report a problem or tell us what could be clearer. Include the page
          and what you expected, without bank statements or passwords.
        </p>
      </div>
      <a
        href="mailto:ogabasyle@gmail.com?subject=FlowMoney%20feedback"
        className="inline-flex min-h-10 items-center break-all rounded-lg text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ogabasyle@gmail.com
      </a>
    </section>
  );
}
