import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  const store = await cookies();
  const authed = await verifySessionToken(store.get(COOKIE_NAME)?.value);
  if (!authed) redirect("/login");
  return <Dashboard />;
}
