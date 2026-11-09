const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  pages: "M4 3h16v18H4zM4 9h16M10 21V9",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01",
  quote: "M7 7h4v6a4 4 0 0 1-4 4M13 7h4v6a4 4 0 0 1-4 4",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  cog: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  plus: "M12 5v14M5 12h14",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  clip: "M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7",
  check: "M5 12l5 5L20 7",
  x: "M6 6l12 12M18 6 6 18",
  ext: "M14 4h6v6M20 4 10 14M19 14v6H4V5h6",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  back: "M15 6l-6 6 6 6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  pen: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  tag: "M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9",
  upload2: "M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M12 4v12M7 9l5-5 5 5",
  eyeOff: "M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z",
  play: "M8 5.5v13l11-6.5z",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h3",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c.8-3.6 3.6-6 7-6s6.2 2.4 7 6M16 3.5a4 4 0 0 1 0 7.5M18.5 15c1.8.8 3 2.9 3.5 6",
  truck: "M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7M7 18.5a1.5 1.5 0 1 0 0-.01M17.5 18.5a1.5 1.5 0 1 0 0-.01",
} as const;
export type IconName = keyof typeof P;

export function Icon({ name, size, className, style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`ic${className ? ` ${className}` : ""}`} viewBox="0 0 24 24" aria-hidden="true" style={{ ...(name === "grip" ? { strokeWidth: 3 } : null), ...(size ? { width: size, height: size } : null), ...style }}>
      <path d={P[name]} />
    </svg>
  );
}
