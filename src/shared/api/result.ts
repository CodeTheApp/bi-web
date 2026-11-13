/** Serializable action result, shared without importing server implementation. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export async function unwrap<T>(promise: Promise<Result<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
