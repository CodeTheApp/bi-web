import "server-only";
import { contactSchema, type ContactInput } from "@/entities/site-content";
import type { Thread } from "@/entities/admin";
import type { DemoDataMode } from "@/server/demo-workspace";
import { isEmail } from "@/server/email";
import { demoAllowed } from "./repo";
import { getDemoAdminStore } from "./repo-demo";
import { publishAdminEvent } from "@/server/admin-events/event-bus";

/** The captured workspace keeps an awaited public submission out of a later-selected dataset. */
export function receiveDemoContact(input: ContactInput, mode: DemoDataMode) {
  if (!demoAllowed()) throw new Error("O recebimento de contatos de teste está disponível apenas na demonstração.");
  const data = contactSchema.parse(input);
  const store = getDemoAdminStore(mode);
  const email = isEmail(data.contato) ? data.contato.trim().toLowerCase() : "";
  const phone = email ? "" : data.contato;
  const at = new Date().toISOString();
  const threadId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const conversation: Thread = {
    id: threadId,
    name: data.nome,
    email,
    phone,
    city: data.cidade,
    interest: data.busca,
    source: "formulario",
    subject: `${data.busca || "Contato"} — ${data.nome}`,
    status: "novo",
    unread: true,
    lastAt: at,
    preview: data.msg.slice(0, 160),
    lastOut: false,
    messages: [{ id: messageId, direction: "in", from: email || phone, body: data.msg, html: null, at, delivery: null, attachments: [] }],
  };
  store.threads.unshift(conversation);
  store.log.unshift({ at, text: `Novo contato pelo site: ${data.nome}` });
  store.log = store.log.slice(0, 30);
  publishAdminEvent(["threads", "notifications", "activity"], mode);
  return { threadId, messageId };
}
