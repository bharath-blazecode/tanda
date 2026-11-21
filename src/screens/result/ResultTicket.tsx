import { Link } from "react-router";
import type { Assessment } from "../../../shared/contracts";
import {
  Housing,
  Plate,
  Ticket,
  Stamp,
  Rows,
  Quote,
  Stub,
  SafetyLine,
  ChartWindow,
  Axis,
  Legend,
  Label,
} from "../../ui";
import { ResultBird } from "./ResultBird";

export type ResultTicketProps = {
  assessment: Assessment;
  rows: [string, string][];
  line: string;
  readingId: string;
  timestamp: string;
  sample?: boolean;
  animate?: boolean;
  /** Whose reading this is: the name typed on Landing. Stays on the phone and on the ticket. */
  name?: string;
  /** Printed above the rows, e.g. "Simulated". Only the tags that apply. */
  tags?: string[];
  /** One extra line under the rows: the demo's guess at the handicap. */
  extra?: string;
  /** Where "Run again" goes. A demo reading goes back to the demo. */
  againTo?: string;
};
const nudges: Record<Assessment["nudge"], string> = {
  "carry-on": "Carry on.",
  water: "Water, and a slow breath.",
  "no-more-caffeine": "No more coffee today. Water.",
  "ride-or-friend": "Get a ride or ping a friend.",
  "steady-not-a-driving-test": "Get a ride or a friend.",
};

export function ResultTicket({
  assessment,
  rows,
  line,
  readingId,
  timestamp,
  sample = false,
  animate = true,
  name,
  tags = [],
  extra,
  againTo = "/check",
}: ResultTicketProps) {
  // The data producer owns the verdict. The screen renders the supplied assessment.
  // Keep the fixed safety line visible for every Tipsy presentation as well.
  const safety = assessment.showSafetyLine || assessment.verdict === "tipsy";
  return (
    <div className="result-shell">
      <Housing>
        <Plate serial={"Body drift recorder\nModel BC-2"} />
        <div className="result-slot">
          <Label>Reading</Label>
          <Label>Printed</Label>
        </div>
        <Ticket
          print={animate}
          className={`result-ticket${animate ? " result-ticket--animated" : ""}`}
        >
          <header className="result-header">
            <strong>KACHKA</strong>
            <span>
              Reading {readingId}
              <br />
              {timestamp}
              {name && (
                <>
                  <br />
                  Subject · {name}
                </>
              )}
            </span>
          </header>
          {sample && <Label paper>Sample data · animation preview</Label>}
          {sample && (
            <ChartWindow className="result-chart" minHeight={100}>
              <svg
                viewBox="0 0 320 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Illustrative sample traces, showing your normal and just now"
              >
                <path
                  className="result-trace-baseline"
                  d="M0 53 Q20 48 40 53 T80 53 T120 53 T160 53 T200 53 T240 53 T280 53 T320 53"
                />
                <path
                  className="result-trace-now"
                  d="M0 52 L10 54 L20 47 L30 55 L40 49 L50 60 L60 42 L70 57 L80 53 L90 62 L100 37 L110 55 L120 48 L130 69 L140 30 L150 53 L160 43 L170 76 L180 23 L190 51 L200 34 L210 70 L220 40 L230 18 L240 55 L250 38 L260 79 L270 31 L280 54 L290 44 L300 25 L310 46 L320 54"
                />
              </svg>
              <Legend now="Just now" baseline="Your normal" />
              <Axis left="2s" right="15s" />
            </ChartWindow>
          )}
          {tags.length > 0 && <p className="result-tag">{tags.join(" · ")}</p>}
          {rows.length > 0 && <Rows items={rows} />}
          {extra && <p className="result-extra">{extra}</p>}
          {tags.length === 0 && assessment.partial && (
            <p className="result-tag">Partial reading · Stand Still skipped</p>
          )}
          {tags.length === 0 && assessment.confidence !== "high" && (
            <p className="result-tag">
              Loose reading · {assessment.confidence} confidence
            </p>
          )}
          <div className="k-stamp-wrap result-verdict">
            <Stamp
              verdict={assessment.verdict}
              note="Certified by a bin chicken"
            />
            <ResultBird mood={assessment.verdict} animate={animate} />
          </div>
          <Quote byline="Dr. Kachka">“{line}”</Quote>
          {safety && (
            <div className="result-safety">
              <SafetyLine />
            </div>
          )}
          <Stub label="Next">{nudges[assessment.nudge]}</Stub>
        </Ticket>
        <nav className="k-keys k-keys--2" aria-label="After your reading">
          <Link className="k-key k-key--quiet result-link" to={againTo}>
            Run again
          </Link>
          <Link className="k-key k-key--quiet result-link" to="/home">
            Home
          </Link>
        </nav>
        <p className="result-fine">A toy, not a test. For adults.</p>
      </Housing>
    </div>
  );
}
