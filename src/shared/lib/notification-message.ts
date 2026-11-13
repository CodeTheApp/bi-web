/** Sileo's morphing pill needs a short heading; details belong in its expanding body. */
export function notificationMessage(message: string, fallback = "Atualização") {
  const text = message.trim();
  return text.length <= 42 && !text.includes("\n") ? { title: text } : { title: fallback, description: text };
}
