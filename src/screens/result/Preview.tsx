import { useState } from "react";
import type { Assessment, Verdict } from "../../../shared/contracts";
import { InkFilter, Key, Label } from "../../ui";
import { sampleAssessment, sampleRows } from "./fixtures";
import { ResultTicket } from "./ResultTicket";
import "./result.css";

const lines: Record<Verdict, string> = {
  steady: "Nothing to report. I have bins to attend to.",
  wired: "I have seen calmer pigeons.",
  tipsy: "Your phone noticed before you did.",
  wobbly: "Off your normal. Bodies keep receipts.",
};

// Card 7 preview uses explicit fixtures. Real run data can be supplied to ResultTicket.
export function Result() {
  const [verdict, setVerdict] = useState<Verdict>("tipsy");
  const [replay, setReplay] = useState(0);
  const assessment: Assessment = {
    ...sampleAssessment,
    verdict,
    nudge:
      verdict === "tipsy"
        ? "ride-or-friend"
        : verdict === "wired"
          ? "no-more-caffeine"
          : verdict === "wobbly"
            ? "water"
            : "carry-on",
    showSafetyLine: verdict === "tipsy",
  };
  return (
    <>
      <InkFilter />
      <ResultTicket
        key={`${verdict}-${replay}`}
        assessment={assessment}
        rows={sampleRows}
        line={lines[verdict]}
        readingId="0417"
        timestamp="SAT 21 NOV · 12:15"
        sample
      />
      <section className="result-preview" aria-label="Sample result controls">
        <Label>Preview controls · sample data</Label>
        <div className="result-presets">
          {(["steady", "wired", "tipsy", "wobbly"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={verdict === value}
              onClick={() => setVerdict(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <Key quiet onClick={() => setReplay((value) => value + 1)}>
          Replay animation
        </Key>
        <p>
          Steady cheers. Wired runs a circle. Tipsy sways and sits. Wobbly
          attempts a flight and falls.
        </p>
      </section>
    </>
  );
}
