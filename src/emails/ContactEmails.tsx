import { Section, Text } from "@react-email/components";
import type { ContactInput } from "@/entities/site-content";
import { EmailLayout, h, p } from "./Layout";

export function ContactNotification({ data }: { data: ContactInput }) {
  const rows: Array<[string, string]> = [
    ["Nome", data.nome],
    ["Contato", data.contato],
    ["Cidade", data.cidade || "—"],
    ["Procura", data.busca || "—"],
  ];
  return (
    <EmailLayout preview={`Novo contato pelo site: ${data.nome}`}>
      <Text style={h}>Novo contato pelo site</Text>
      <Section style={{ background: "#F5EBE2", borderRadius: 12, padding: "14px 18px", marginBottom: 18 }}>
        {rows.map(([k, v]) => (
          <Text key={k} style={{ ...p, margin: "4px 0" }}>
            <b style={{ color: "#B76B02" }}>{k}:</b> {v}
          </Text>
        ))}
      </Section>
      <Text style={{ ...p, whiteSpace: "pre-wrap" }}>{data.msg || "(sem mensagem)"}</Text>
      <Text style={{ ...p, color: "#7A6A61", fontSize: 13 }}>Responda pelo painel em Mensagens para manter o histórico da conversa.</Text>
    </EmailLayout>
  );
}

export function ContactConfirmation({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <EmailLayout preview="Recebemos a sua mensagem">
      <Text style={h}>Olá, {first}!</Text>
      <Text style={p}>Recebemos a sua mensagem e retornamos em breve. Enquanto isso, se preferir, fale com a gente pelo WhatsApp.</Text>
      <Text style={p}>Obrigada pelo contato,</Text>
      <Text style={{ ...p, color: "#B76B02" }}>Equipe Brasília Iluminação</Text>
    </EmailLayout>
  );
}

export function ReplyEmail({ body }: { body: string }) {
  return (
    <EmailLayout preview={body.slice(0, 90)}>
      <Text style={{ ...p, whiteSpace: "pre-wrap" }}>{body}</Text>
      <Text style={{ ...p, color: "#B76B02", marginTop: 24 }}>Equipe Brasília Iluminação</Text>
    </EmailLayout>
  );
}
