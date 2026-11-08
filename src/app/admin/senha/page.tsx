import { LoginArt, PasswordForm } from "@/components/admin/LoginForms";

export const metadata = { title: "Criar senha" };

export default function Senha() {
  return (
    <div className="login">
      <LoginArt />
      <PasswordForm />
    </div>
  );
}
