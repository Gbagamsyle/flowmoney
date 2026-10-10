import { UserButton } from "@clerk/nextjs";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div>
        <p className="text-sm text-muted-foreground">Your financial position</p>
      </div>

      <UserButton />
    </header>
  );
}
