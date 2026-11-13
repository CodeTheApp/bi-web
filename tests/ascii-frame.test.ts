import { describe, expect, it } from "vitest";
import { asciiRows } from "@/shared/ui/ascii/ascii-frame";

describe("decoded image ASCII frames", () => {
  it("preserves pixel positions and leaves white and transparent areas empty", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 255,
    ]);
    expect(asciiRows(data, 2, 2)).toEqual(["@ ", " @"]);
  });
  it("accounts for perceived brightness rather than treating RGB channels equally", () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255,
    ]);
    expect(asciiRows(data, 3, 1)).toEqual(["#-%"]);
  });
  it("rejects incomplete frames and unbounded or invalid allocations", () => {
    expect(asciiRows(new Uint8ClampedArray(4), 2, 2)).toEqual([]);
    expect(asciiRows(new Uint8ClampedArray(0), 0, 2)).toEqual([]);
    expect(asciiRows(new Uint8ClampedArray(4), Infinity, 2)).toEqual([]);
    expect(asciiRows(new Uint8ClampedArray(4), 20000, 20000)).toEqual([]);
  });
});
