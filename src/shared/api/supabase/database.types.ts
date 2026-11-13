/**
 * Tipos do banco. Depois de criar o projeto no Supabase, regenere com:
 *   npx supabase gen types typescript --project-id <id> > src/shared/api/supabase/database.types.ts
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
      admin_notification_reads: Table<{ user_id: string; notification_key: string; read_at: string }, "user_id" | "notification_key">;
      site_events: Table<{ id: string; session_id: string; event_name: string; page_path: string; product_ref: string | null; created_at: string }, "id" | "session_id" | "event_name" | "page_path">;
      profiles: Table<{ id: string; name: string; avatar_url: string; role: "admin" | "editor"; created_at: string }, "id">;
      sections: Table<{ key: string; draft: Json; published: Json; position: number; status: "rascunho" | "publicado"; updated_at: string; updated_by: string | null }, "key">;
      settings: Table<{ id: number; data: Json; updated_at: string }>;
      media: Table<{ kind: "image" | "video"; mime_type: string | null; archived: boolean; id: string; url: string; s3_key: string | null; width: number | null; height: number | null; name: string; category: string; alt: string; created_at: string }, "url">;
      media_categories: Table<{ key: string; name: string; created_at: string }, "key" | "name">;
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
      customers: Table<{ id: string; email: string; contact_email: string; name: string; phone: string; cpf: string; provider: "email" | "google"; created_at: string }, "id" | "email">;
      customer_addresses: Table<
        { id: string; customer_id: string; recipient: string; cep: string; street: string; number: string; complement: string; district: string; city: string; uf: string; created_at: string },
        "customer_id" | "recipient" | "cep" | "street" | "number" | "district" | "city" | "uf"
      >;
      favorites: Table<{ customer_id: string; product_id: string; created_at: string }, "customer_id" | "product_id">;
      coupons: Table<{ id: string; code: string; kind: "percentual" | "fixo"; value: number; minimum_cents: number; starts_at: string | null; expires_at: string | null; active: boolean; max_uses: number | null; created_at: string }, "code" | "kind" | "value">;
      coupon_redemptions: Table<{ coupon_id: string; order_id: string; created_at: string }, "coupon_id" | "order_id">;
      orders: Table<
        {
          id: string; number: number; customer_id: string | null; email: string; name: string; phone: string; items: Json; subtotal_cents: number; shipping_cents: number;
          total_cents: number; discount_cents: number; coupon: Json | null; checkout_key: string | null; shipping: Json; payment: Json | null; status: "aguardando_pagamento" | "pago" | "em_separacao" | "enviado" | "entregue" | "cancelado";
          tracking: string; notes: string; timeline: Json; created_at: string; updated_at: string;
        },
        "email" | "name" | "items" | "subtotal_cents" | "total_cents"
      >;
      stock_movements: Table<
        { id: number; variant_id: string; delta: number; reason: "inicial" | "compra" | "venda" | "ajuste" | "devolucao"; note: string; user_id: string | null; created_at: string },
        "variant_id" | "delta" | "reason"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      update_customer_contact: { Args: { p_customer: string; p_name: string; p_phone: string; p_contact_email: string }; Returns: Json };
      update_own_staff_profile: { Args: { p_name: string; p_avatar_url: string }; Returns: undefined };
      create_shop_checkout: { Args: { p_order: Json; p_key: string; p_code: string }; Returns: Json };
      shop_coupon_usage: { Args: Record<string, never>; Returns: Array<{ coupon_id: string; used: number }> };
      record_site_event: { Args: { event_id: string; session_id: string; event_name: string; page_path: string; product_ref?: string | null }; Returns: undefined }; is_staff: { Args: Record<string, never>; Returns: boolean }; is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
