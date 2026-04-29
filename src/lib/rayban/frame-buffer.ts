import type { LiveRayBanFrame } from "@/lib/schemas";

export class LiveRayBanFrameBuffer {
  private frames = new Map<string, LiveRayBanFrame[]>();

  constructor(
    private readonly maxFramesPerVisit = 12,
    private readonly ttlMs = 30_000,
    private readonly nowMs = () => Date.now(),
  ) {}

  put(frame: LiveRayBanFrame) {
    const current = this.unexpired(this.frames.get(frame.visitId) ?? []);
    const withoutDuplicate = current.filter((candidate) => candidate.frameId !== frame.frameId);
    this.frames.set(frame.visitId, [...withoutDuplicate, frame].slice(-this.maxFramesPerVisit));
    return frame;
  }

  latest(visitId: string) {
    const current = this.unexpired(this.frames.get(visitId) ?? []);
    this.frames.set(visitId, current);
    return current.at(-1) ?? null;
  }

  get(visitId: string, frameId: string) {
    const current = this.unexpired(this.frames.get(visitId) ?? []);
    this.frames.set(visitId, current);
    return current.find((frame) => frame.frameId === frameId) ?? null;
  }

  clear(visitId: string) {
    this.frames.delete(visitId);
  }

  count(visitId: string) {
    const current = this.unexpired(this.frames.get(visitId) ?? []);
    this.frames.set(visitId, current);
    return current.length;
  }

  private unexpired(frames: LiveRayBanFrame[]) {
    const cutoff = this.nowMs() - this.ttlMs;
    return frames.filter((frame) => new Date(frame.receivedAt).getTime() >= cutoff);
  }
}

const globalForFrames = globalThis as unknown as {
  carewalkRayBanFrames?: LiveRayBanFrameBuffer;
};

export function getLiveRayBanFrameBuffer() {
  if (!globalForFrames.carewalkRayBanFrames) {
    globalForFrames.carewalkRayBanFrames = new LiveRayBanFrameBuffer();
  }

  return globalForFrames.carewalkRayBanFrames;
}
