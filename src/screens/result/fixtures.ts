import type { Assessment } from "../../../shared/contracts";

// Explicit preview values, independent of sensor data and persistence.
export const sampleAssessment: Assessment = {
  verdict: "tipsy",
  confidence: "high",
  drift: { sway: 1.4, choiceRt: 1.5, choiceWrong: 2 },
  score: 46,
  nudge: "ride-or-friend",
  showSafetyLine: true,
  partial: false,
};

export const sampleRows: [string, string][] = [
  ["Body sway", "+42%"],
  ["Choice time", "+18%"],
  ["Wrong squares", "+2"],
];
