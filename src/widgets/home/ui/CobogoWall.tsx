import { design, SHAPES } from "@/shared/lib/cobogo";

/** Parede de cobogó desenhada com a gramática dos Padrões (renderizada no servidor; a animação é do HomeScenes). */
export function CobogoWall({ cols = 12, rows = 3 }: { cols?: number; rows?: number }) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const d = design(c, r);
      const fg = d.alt && d.idx >= 4 ? "#F5B073" : d.fg;
      cells.push(
        <div className="c" key={`${c}-${r}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {d.alt && <rect width="100" height="100" fill="#291007" />}
            <g transform={`rotate(${d.rot * 90} 50 50)`}>
              <path d={SHAPES[d.kind]} fill={fg} />
            </g>
          </svg>
        </div>,
      );
    }
  return (
    <div className="wall" id="wall" aria-hidden="true">
      {cells}
    </div>
  );
}
