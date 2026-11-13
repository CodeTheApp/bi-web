import { z } from "zod";

/** URLs are selected from the authenticated media library; the action verifies membership. */
export const userProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe um nome com pelo menos 2 caracteres.")
      .max(100, "Use até 100 caracteres no nome."),
    avatarUrl: z
      .string()
      .trim()
      .max(3_600_000, "Esta foto é grande demais. Envie uma imagem menor.")
      .refine(
        (value) =>
          !value ||
          value.startsWith("/img/") ||
          /^https?:\/\//i.test(value) ||
          /^data:image\/(?:png|jpe?g|webp|avif);base64,[a-z\d+/=]+$/i.test(
            value,
          ),
        "Escolha uma imagem válida da biblioteca.",
      ),
  })
  .strict();
export const adminUserSchema = userProfileSchema
  .extend({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Informe um e-mail válido.")
      .max(254),
    role: z.enum(["admin", "editor"], {
      error: "Escolha Administrador ou Editor.",
    }),
  })
  .strict();
