import "./ascii.css";

const CHARS = " . : + * # : . + · * : . # + : ";
const LINES = Array.from({ length: 32 }, (_, row) =>
  Array.from(
    { length: 88 },
    (_, col) =>
      CHARS[(row * 13 + col * 7 + Math.floor(col / 8)) % CHARS.length],
  ).join(""),
).join("\n");

/** Decorative, deterministic and CSS-only: never holds up a ready block. */
export function AsciiPattern() {
  return (
    <pre className="ascii-pattern" aria-hidden="true">
      {LINES}
    </pre>
  );
}
