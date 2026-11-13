import { ProjectEditor } from "@/_pages/admin-projects/ui/Projects";

export const metadata = { title: "Projeto" };

export default async function Page({ params }: PageProps<"/admin/projetos/[id]">) {
  const { id } = await params;
  return <ProjectEditor id={id} />;
}
