import { redirect } from "next/navigation";
import { LoginArt, LoginForm } from "@/features/staff-auth";
import { demoAllowed } from "@/server/admin/repo";

export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }: PageProps<"/admin/login">) {
  if (demoAllowed()) redirect("/admin");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <div className="login">
      <LoginArt />
      <LoginForm next={next} linkError={sp.erro === "link"} />
    </div>
  );
}
