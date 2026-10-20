import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-10">
      <p className="max-w-md text-center text-sm leading-6 text-muted-foreground">For adults aged 18 and over. By creating an account, you agree to our <Link href="/terms" className="underline underline-offset-4">Terms</Link>. Read our <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> to understand how we process your information. Optional analytics is a separate choice.</p>
      <SignUp />
    </div>
  );
}
