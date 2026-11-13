import { describe, expect, it } from "vitest";
import { parseVideo } from "@/entities/product";

describe("product video after library upload", () => {
  it("plays a demo inline video through the same file player as a hosted video", () => {
    const src = "data:video/webm;base64,GkXfo0Ag";
    expect(parseVideo(src)).toMatchObject({ provider: "arquivo", src, id: null });
    expect(parseVideo("https://cdn.example.com/midia/video.webm")).toMatchObject({ provider: "arquivo" });
  });
  it("does not accept HTML, image payloads or malformed inline video payloads", () => {
    expect(parseVideo("data:text/html;base64,PGh0bWw+")).toBeNull();
    expect(parseVideo("data:image/png;base64,GkXfo0Ag")).toBeNull();
    expect(parseVideo("data:video/webm;base64,<html>")).toBeNull();
  });
});
