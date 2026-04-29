import { describe, expect, it } from "vitest";
import { detectUnsafeContent } from "./safety";

describe("safe mode classifier", () => {
  it("blocks diagnosis and medication advice", () => {
    const result = detectUnsafeContent("Maggie probably has dementia and should stop taking her medication.");
    expect(result.safeModeRequired).toBe(true);
    expect(result.blockedReasons).toContain("diagnosis");
    expect(result.blockedReasons).toContain("medication_advice");
  });

  it("blocks unsupported clinical certainty", () => {
    expect(detectUnsafeContent("The client definitely has an infection.").blockedReasons).toContain(
      "unsupported_clinical_claim",
    );
  });

  it("blocks private-room capture", () => {
    expect(detectUnsafeContent("Record bathroom and personal care.").blockedReasons).toContain("private_room_capture");
  });
});
