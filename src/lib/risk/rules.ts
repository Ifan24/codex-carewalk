import type { ClientProfile, Escalation, Observation } from "@/lib/schemas";

export function scoreRisk({
  client,
  observations,
  existingEscalation,
}: {
  client: ClientProfile;
  observations: Observation[];
  existingEscalation: Escalation;
}): Escalation {
  const now = new Date().toISOString();
  const hasKnownFallsRisk = client.knownRisks.some((risk) => risk.toLowerCase().includes("falls"));
  const looseRug = observations.some(
    (observation) =>
      observation.status === "observed" &&
      observation.category === "falls_hazard" &&
      /rug|trip|hallway/i.test(`${observation.label} ${observation.description}`),
  );
  const currentDistress = observations.some((observation) => {
    const description = observation.description.toLowerCase();
    if (/no current severe distress|no immediate danger/.test(description)) return false;
    return /current severe distress|immediate danger/.test(description);
  });
  const mealsNotVisible = observations.some(
    (observation) =>
      observation.category === "nutrition" &&
      observation.status === "not_observed" &&
      /meal|fridge|food/i.test(observation.label + observation.description),
  );
  const nutritionRisk = client.knownRisks.some((risk) => /nutrition|meal|food/i.test(risk));
  const medicationUnknown = observations.some(
    (observation) => observation.category === "medication_related_observation" && observation.status === "unknown",
  );
  const dizzinessReported = observations.some((observation) =>
    /dizz|light.?headed|unsteady/i.test(`${observation.label} ${observation.description}`),
  );
  const medicationSupplyConcern = observations.some(
    (observation) =>
      observation.category === "medication_related_observation" &&
      /supply|few|low|empty|missing|run out|short|not enough/i.test(`${observation.label} ${observation.description}`),
  );

  if (currentDistress) {
    return {
      ...existingEscalation,
      riskLevel: "urgent",
      status: "draft",
      reason: "Worker note includes possible immediate danger or current severe distress.",
      recommendedAction:
        "Require human confirmation and show safe emergency escalation language. Do not make autonomous emergency decisions.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  if (looseRug && hasKnownFallsRisk) {
    return {
      ...existingEscalation,
      riskLevel: "medium",
      status: "draft",
      reason: "A loose rug was observed near the hallway and Maggie has a known falls risk.",
      recommendedAction:
        "Create supervisor review and a non-urgent follow-up task to confirm the hallway rug is secured before or during the next visit.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  if (mealsNotVisible && nutritionRisk) {
    return {
      ...existingEscalation,
      riskLevel: "medium",
      status: "draft",
      reason: "Meals were not observed and nutrition is a known risk.",
      recommendedAction: "Create supervisor review and a remote check-in task to confirm meals are available.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  if (medicationSupplyConcern) {
    return {
      ...existingEscalation,
      riskLevel: "medium",
      status: "draft",
      reason: "Medication supply concern was reported and needs authorised human follow-up.",
      recommendedAction:
        "Create a supervisor follow-up task to check medication supply through the provider pathway. Do not provide medication advice.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  if (dizzinessReported) {
    return {
      ...existingEscalation,
      riskLevel: "low",
      status: "draft",
      reason: "Client mentioned dizziness or unsteadiness without current severe distress.",
      recommendedAction: "Create a non-urgent phone check-in task for tomorrow and route any clinical concern to human review.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  if (medicationUnknown) {
    return {
      ...existingEscalation,
      riskLevel: "low",
      status: "draft",
      reason: "Medication-related information was not assessed and remains unknown.",
      recommendedAction: "Keep medication use marked unknown and route to human review if follow-up is needed.",
      createdAt: existingEscalation.createdAt,
      updatedAt: now,
    };
  }

  return {
    ...existingEscalation,
    riskLevel: "none",
    status: "none",
    reason: "No medium or high risk exception identified.",
    recommendedAction: "No supervisor action required.",
    createdAt: existingEscalation.createdAt,
    updatedAt: now,
  };
}
