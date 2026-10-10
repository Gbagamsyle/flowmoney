import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <SignUp />
    </div>
  );
}
