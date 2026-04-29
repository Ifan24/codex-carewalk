import type {
  ClientProfile,
  Escalation,
  Observation,
  OutputDocument,
  VisitSession,
  CaptureMode,
} from "@/lib/schemas";
import type { SafetyResult } from "./safety";

export type RawNoteInput = {
  visitId: string;
  workerId: string;
  capturedAt: string;
  captureMode: CaptureMode;
  rawNote: string;
};

export interface AIProvider {
  structureRawNotes(input: RawNoteInput): Promise<Observation[]>;
  generateWorkerNote(input: GenerationInput): Promise<Omit<OutputDocument, "id" | "visitId" | "status" | "generatedAt" | "generatedBy" | "approvedBy" | "approvedAt">>;
  generateProviderLog(input: GenerationInput): Promise<Omit<OutputDocument, "id" | "visitId" | "status" | "generatedAt" | "generatedBy" | "approvedBy" | "approvedAt">>;
  generateFamilySummary(input: GenerationInput): Promise<Omit<OutputDocument, "id" | "visitId" | "status" | "generatedAt" | "generatedBy" | "approvedBy" | "approvedAt">>;
  classifySafeMode(text: string): Promise<SafetyResult>;
}

export type GenerationInput = {
  visit: VisitSession;
  client: ClientProfile;
  observations: Observation[];
  escalation: Escalation;
  hasReviewedRedactedRaybanMedia: boolean;
};
