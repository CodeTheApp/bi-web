import { describe, expect, it } from "vitest";
import { seedContent } from "@/entities/site-content";
import { draftMessage, readPreviewDraft } from "@/features/page-preview/model/protocol";

describe("live preview transport", () => {
  const parent = {};
  const origin = "https://example.com";
  const message = draftMessage("formas", { ...seedContent.sections.formas, title: "Ainda não salvei" }, 12);
  it("renders a valid unsaved draft without a storage or save dependency", () => {
    expect(readPreviewDraft(message, origin, origin, parent, parent, "formas")?.draft.title).toBe("Ainda não salvei");
  });
  it("rejects messages from another origin or browsing context", () => {
    expect(readPreviewDraft(message, "https://other.test", origin, parent, parent, "formas")).toBeNull();
    expect(readPreviewDraft(message, origin, origin, {}, parent, "formas")).toBeNull();
    expect(readPreviewDraft(message, origin, origin, null, parent, "formas")).toBeNull();
  });
  it("rejects another section, malformed drafts and invalid revisions", () => {
    expect(readPreviewDraft(message, origin, origin, parent, parent, "hero")).toBeNull();
    expect(readPreviewDraft({ ...message, draft: { title: { html: "bad" } } }, origin, origin, parent, parent, "formas")).toBeNull();
    expect(readPreviewDraft({ ...message, revision: -1 }, origin, origin, parent, parent, "formas")).toBeNull();
  });
});
