/** Only public route names enter analytics. Private account/order identifiers
 * are removed before a beacon is sent, not just when the server stores it. */
export function analyticsPath(input: string): string | null {
  if (!input.startsWith("/") || /[?#\s\\]/.test(input) || input.length > 300) return null;
  const path = input.replace(/\/+$/, "") || "/";
  if (/^\/loja\/pedido(?:\/.*)?$/.test(path)) return "/loja/pedido";
  if (/^\/conta(?:\/.*)?$/.test(path)) return "/conta";
  if (["/", "/loja", "/loja/checkout", "/loja/favoritos"].includes(path)) return path;
  if (/^\/(?:loja|projetos)\/[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(path)) return path;
  return null;
}
