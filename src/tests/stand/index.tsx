import { useState } from "react";
import type { StandMetrics } from "../../../shared/contracts";
import type { StandAnalysis } from "./analyze";
import { Stand } from "./Stand";
import { standStatus } from "../../engine/compare";
import { Key } from "../../ui";

// Keep the contract used by the existing lab, baseline and check flow.
// The user sees the replay before choosing to return the completed metrics.
export function StandTest({
  onDone,
  forBaseline,
  reference,
}: {
  forBaseline?: boolean;
  reference?: StandMetrics;
  onDone: (metrics: StandMetrics | null) => void;
}) {
  const [reading, setReading] = useState<StandAnalysis | null>(null);
  const unusableBaseline = forBaseline && reading?.metrics.placementChanged;
  const incompatible = reference && reading && !standStatus(reference, reading.metrics).compared;
  return (
    <>
      <Stand
        onComplete={setReading}
        onSkip={() => onDone(null)}
        onReset={() => setReading(null)}
        // No sensor is the same answer as a skip: the run carries on with Choice Tap, partial.
        onUnavailable={() => onDone(null)}
      />
      {reading && (
        <Key onClick={() => onDone(unusableBaseline ? null : reading.metrics)}>
          {unusableBaseline ? "Continue without this standing baseline" :
            incompatible ? "Continue without a standing comparison" : "Use this reading"}
        </Key>
      )}
    </>
  );
}
