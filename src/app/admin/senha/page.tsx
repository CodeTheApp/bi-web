import { LoginArt, PasswordForm } from "@/features/staff-auth";

export const metadata = { title: "Criar senha" };

export default function Senha() {
  return (
    <div className="login">
      <LoginArt />
      <PasswordForm />
    </div>
  );
}
