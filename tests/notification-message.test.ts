import { describe, expect, it } from "vitest";
import { notificationMessage } from "@/shared/lib/notification-message";
describe("Sileo message layout", () => {
  it("keeps concise feedback as the heading", () => { expect(notificationMessage("Pergunta excluída")).toEqual({ title: "Pergunta excluída" }); });
  it("moves long errors into the expanding body without clipping or changing their case", () => { const message = "A exclusão exige confirmação. Atualize a lista e use o botão de segurar para excluir."; expect(notificationMessage(message, "Não foi possível concluir")).toEqual({ title: "Não foi possível concluir", description: message }); });
});
