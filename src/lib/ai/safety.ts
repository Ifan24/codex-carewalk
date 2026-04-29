export type BlockedReason =
  | "diagnosis"
  | "medication_advice"
  | "private_room_capture"
  | "facial_recognition"
  | "unsupported_clinical_claim"
  | "family_privacy_risk"
  | "continuous_recording";

export type SafetyResult = {
  safe: boolean;
  safeModeRequired: boolean;
  blockedReasons: BlockedReason[];
  rewriteRequired: boolean;
  safeRewrite: string | null;
  refusalTemplate: string | null;
};

const patterns: Array<[BlockedReason, RegExp]> = [
  ["diagnosis", /\b(diagnos(e|is|ed)|dementia|depression|infection|stroke|cognitive decline)\b/i],
  ["medication_advice", /\b(stop|start|change|skip|increase|decrease|adjust)\b.*\b(medication|medicine|tablets|dose|dosage)\b/i],
  ["private_room_capture", /\b(record|film|capture|video|photo)\b.*\b(bedroom|bathroom|toilet|toileting|changing|personal care)\b/i],
  ["facial_recognition", /\b(face recognition|identify (their|the) face|emotion from (the )?face|ethnicity|disability status)\b/i],
  ["unsupported_clinical_claim", /\b(definitely has|clearly has|unsafe|safe to leave|will fall|has fallen|injury)\b/i],
  ["family_privacy_risk", /\b(raw media|send the photo|share the video|private-room|bathroom detail)\b.*\b(family|daughter|relative)\b/i],
  ["continuous_recording", /\b(continuous|always on|keep recording|record everything|all visit)\b/i],
];

const refusalTemplates: Record<BlockedReason, string> = {
  diagnosis:
    "CareWalk cannot diagnose or infer medical conditions. It can document observed facts and reported statements, then route concerns for supervisor or clinical review.",
  medication_advice:
    "CareWalk cannot provide medication advice or recommend changes. It can record that medication use was not assessed or that a medication-related concern requires human review.",
  private_room_capture:
    "CareWalk blocks capture in private-room or personal-care contexts. Use safe mode with manual notes only, and record only the minimum necessary information.",
  facial_recognition:
    "CareWalk does not identify people or infer sensitive traits from faces. Use consented environmental observations only.",
  unsupported_clinical_claim:
    "CareWalk avoids unsupported clinical certainty. Use observed or reported language and route uncertain concerns for human review.",
  family_privacy_risk:
    "This detail is not appropriate for a family-facing summary. Rewrite it as a minimal, provider-approved follow-up note without raw media or sensitive details.",
  continuous_recording:
    "CareWalk does not support continuous recording. Use short, consented capture moments or manual checklist notes.",
};

export function detectUnsafeContent(text: string): SafetyResult {
  const blockedReasons = patterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([reason]) => reason);

  if (blockedReasons.length === 0) {
    return {
      safe: true,
      safeModeRequired: false,
      blockedReasons: [],
      rewriteRequired: false,
      safeRewrite: null,
      refusalTemplate: null,
    };
  }

  return {
    safe: false,
    safeModeRequired: true,
    blockedReasons,
    rewriteRequired: true,
    safeRewrite:
      "Document only observed facts and reported statements. Mark medication-related uncertainty as unknown and route any concern for human review.",
    refusalTemplate: refusalTemplates[blockedReasons[0]],
  };
}
