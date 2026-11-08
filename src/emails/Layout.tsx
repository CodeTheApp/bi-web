import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

/** Moldura dos e-mails com as cores da marca (fontes de sistema: clientes de e-mail não carregam Belleza). */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: "#F5EBE2", margin: 0, padding: "32px 0", fontFamily: "Montserrat, Helvetica, Arial, sans-serif", color: "#291007" }}>
        <Container style={{ background: "#FFF8F5", borderRadius: 16, maxWidth: 560, overflow: "hidden" }}>
          <Section style={{ background: "#291007", padding: "26px 32px" }}>
            <Img src={`${SITE}/img/logo-claro.png`} alt="Brasília Iluminação" width="132" />
          </Section>
          <Section style={{ padding: "32px" }}>{children}</Section>
          <Hr style={{ borderColor: "#EDE3DA", margin: 0 }} />
          <Section style={{ padding: "18px 32px" }}>
            <Text style={{ fontSize: 12, color: "#7A6A61", margin: 0 }}>Brasília Iluminação · Brasília — DF · brasiliailuminacao.com.br</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const h = { fontSize: 24, lineHeight: "30px", margin: "0 0 16px", fontFamily: "Georgia, serif", fontWeight: 400, color: "#592D1D" } as const;
export const p = { fontSize: 15, lineHeight: "24px", margin: "0 0 14px" } as const;
