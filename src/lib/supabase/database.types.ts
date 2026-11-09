/**
 * Tipos do banco. Depois de criar o projeto no Supabase, regenere com:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 * (mantendo os aliases no fim do arquivo)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; name: string; role: "admin" | "editor"; created_at: string }, "id">;
      sections: Table<{ key: string; draft: Json; published: Json; position: number; status: "rascunho" | "publicado"; updated_at: string; updated_by: string | null }, "key">;
      settings: Table<{ id: number; data: Json; updated_at: string }>;
      media: Table<{ id: string; url: string; s3_key: string | null; width: number | null; height: number | null; alt: string; created_at: string }, "url">;
      projects: Table<
        { id: string; slug: string; title: string; category: string; location: string; year: string; summary: string; scope: string[]; cover_url: string; status: "rascunho" | "publicado"; position: number; seo: Json; updated_at: string },
        "slug" | "title"
      >;
      project_images: Table<{ id: string; project_id: string; media_id: string | null; url: string; alt: string; layout: "cheia" | "par" | "faixa"; position: number }, "project_id" | "url">;
      testimonials: Table<{ id: string; quote: string; author: string; location: string; position: number; visible: boolean }, "quote">;
      faqs: Table<{ id: string; question: string; answer: string; position: number; visible: boolean }, "question">;
      threads: Table<{
        id: string; subject: string; contact_name: string; contact_email: string; contact_phone: string; city: string; interest: string;
        source: "formulario" | "email"; status: "novo" | "andamento" | "respondido" | "arquivado"; unread: boolean; last_message_at: string; created_at: string;
      }>;
      messages: Table<
        {
          id: string; thread_id: string; direction: "in" | "out"; from_email: string; to_email: string; body_text: string; body_html: string | null;
          provider_id: string | null; message_id_header: string | null; delivery: string | null; attachments: Json; created_at: string;
        },
        "thread_id" | "direction"
      >;
      audit_log: Table<{ id: number; user_id: string | null; action: string; created_at: string }, "action">;
      products: Table<
        {
          id: string; slug: string; title: string; category: string; status: "rascunho" | "publicado" | "arquivado"; description: string;
          specs: Json; options: string[]; legacy: Json; position: number; created_at: string; updated_at: string;
        },
        "slug" | "title" | "category"
      >;
      product_variants: Table<
        {
          id: string; product_id: string; sku: string; options: Json; price_cents: number | null; compare_at_cents: number | null;
          stock_policy: "estoque" | "encomenda"; lead_time_days: number | null; stock_on_hand: number; in_stock: boolean; active: boolean; legacy_name: string; position: number;
        },
        "product_id" | "sku"
      >;
      product_media: Table<
        { id: string; product_id: string; variant_id: string | null; kind: "imagem" | "video"; url: string; alt: string; visible: boolean; position: number },
        "product_id" | "url"
      >;
      stock_movements: Table<
        { id: number; variant_id: string; delta: number; reason: "inicial" | "compra" | "venda" | "ajuste" | "devolucao"; note: string; user_id: string | null; created_at: string },
        "variant_id" | "delta" | "reason"
      >;
    };
    Views: { [_ in never]: never };
    Functions: { is_staff: { Args: Record<string, never>; Returns: boolean }; is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
