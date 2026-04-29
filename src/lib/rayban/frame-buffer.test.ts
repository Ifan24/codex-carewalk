import { describe, expect, it } from "vitest";
import { LiveRayBanFrameBuffer } from "./frame-buffer";
import type { LiveRayBanFrame } from "@/lib/schemas";

function frame(index: number, receivedAt: string): LiveRayBanFrame {
  return {
    visitId: "visit_001",
    frameId: `frame_${index}`,
    sessionToken: "session_123",
    captureContext: "hallway",
    mimeType: "image/jpeg",
    dataUrl: `data:image/jpeg;base64,${Buffer.from(`frame-${index}`).toString("base64")}`,
    sentAt: receivedAt,
    receivedAt,
  };
}

describe("LiveRayBanFrameBuffer", () => {
  it("returns the latest frame for a visit", () => {
    const buffer = new LiveRayBanFrameBuffer(12, 30_000, () => Date.parse("2026-04-29T10:00:05.000Z"));
    buffer.put(frame(1, "2026-04-29T10:00:01.000Z"));
    buffer.put(frame(2, "2026-04-29T10:00:02.000Z"));
    expect(buffer.latest("visit_001")?.frameId).toBe("frame_2");
  });

  it("caps stored frames per visit", () => {
    const buffer = new LiveRayBanFrameBuffer(2, 30_000, () => Date.parse("2026-04-29T10:00:05.000Z"));
    buffer.put(frame(1, "2026-04-29T10:00:01.000Z"));
    buffer.put(frame(2, "2026-04-29T10:00:02.000Z"));
    buffer.put(frame(3, "2026-04-29T10:00:03.000Z"));
    expect(buffer.count("visit_001")).toBe(2);
    expect(buffer.get("visit_001", "frame_1")).toBeNull();
  });

  it("drops expired frames", () => {
    const buffer = new LiveRayBanFrameBuffer(12, 1_000, () => Date.parse("2026-04-29T10:00:05.000Z"));
    buffer.put(frame(1, "2026-04-29T10:00:01.000Z"));
    expect(buffer.latest("visit_001")).toBeNull();
  });
});
