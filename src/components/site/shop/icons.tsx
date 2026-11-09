/** Ícones de traço fino da loja (sacola, coração, conta, busca). */
const P = {
  bag: "M5.5 8h13l-1 12.5h-11zM9 8V6.5a3 3 0 0 1 6 0V8",
  heart: "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20.5 20.5 16 16",
  minus: "M6 12h12",
  plus: "M12 6v12M6 12h12",
  trash: "M5 7h14M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4.5h5V7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  truck: "M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7M7 18.5a1.5 1.5 0 1 0 0-.01M17.5 18.5a1.5 1.5 0 1 0 0-.01",
  lock: "M6.5 11h11v9.5h-11zM9 11V8a3 3 0 0 1 6 0v3",
  mail: "M3.5 6h17v12h-17zM4 6.5l8 6 8-6",
  pix: "M12 3.5 20.5 12 12 20.5 3.5 12zM8.5 12h7",
  card: "M3 6.5h18v11H3zM3 10h18M6.5 14.5h4",
} as const;

export function I({ n, size = 20, filled = false }: { n: keyof typeof P; size?: number; filled?: boolean }) {
  return (
    <svg
      className="si"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[n]} />
    </svg>
  );
}
