import { ProjectEditor } from "@/components/admin/views/Projects";

export const metadata = { title: "Projeto" };

export default async function Page({ params }: PageProps<"/admin/projetos/[id]">) {
  const { id } = await params;
  return <ProjectEditor id={id} />;
}
