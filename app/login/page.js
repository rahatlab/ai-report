import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Login — AI CSV Report" };

export default async function LoginPage() {
  const store = await cookies();
  const authed = await verifySessionToken(store.get(COOKIE_NAME)?.value);
  if (authed) redirect("/");
  return <LoginForm />;
}
