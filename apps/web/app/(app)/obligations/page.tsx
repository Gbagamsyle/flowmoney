export default function ObligationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Obligations</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Payments & commitments</h1>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        Upcoming obligations and protected bills will go here.
      </div>
    </div>
  );
}
