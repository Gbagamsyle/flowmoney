export default function IncomePage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Expected Income</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Income</h1>
      </div>

      <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
        Expected income entries will go here.
      </div>
    </div>
  );
}
