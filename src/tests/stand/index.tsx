import { useState } from "react";
import type { StandMetrics } from "../../../shared/contracts";
import type { StandAnalysis } from "./analyze";
import { Stand } from "./Stand";
import { Key } from "../../ui";

// Keep the contract used by the existing lab, baseline and check flow.
// The user sees the replay before choosing to return the completed metrics.
export function StandTest({
  onDone,
}: {
  onDone: (metrics: StandMetrics | null) => void;
}) {
  const [reading, setReading] = useState<StandAnalysis | null>(null);
  return (
    <>
      <Stand
        onComplete={setReading}
        onSkip={() => onDone(null)}
        onReset={() => setReading(null)}
      />
      {reading && (
        <Key onClick={() => onDone(reading.metrics)}>Use this reading</Key>
      )}
    </>
  );
}
