import type { StandAnalysis } from "./analyze";
import { useStand } from "./useStand";
import { Housing, Key, Plate, Sheet, ChartWindow } from "../../ui";
import { Trace } from "./Trace";
import "./stand.css";
export function Stand({
  baseline,
  onComplete,
  onSkip,
  onReset,
  onUnavailable,
}: {
  baseline?: StandAnalysis;
  onComplete?: (result: StandAnalysis) => void;
  onSkip?: () => void;
  onReset?: () => void;
  onUnavailable?: () => void;
}) {
  const test = useStand(onComplete, onSkip, onUnavailable);
  const active = ["permission", "countdown", "running"].includes(test.phase);
  return (
    <Housing className="stand-test">
      <Plate serial={"Stand Still\n15 second capture"} />
      <div className="strip">
        <span>WHOLE-BODY SWAY</span>
        <span className="timer">
          {test.phase === "running" ? `${test.seconds}s` : "15s"}
        </span>
      </div>
      {test.phase === "intro" && (
        <Sheet>
          <span className="label">Before you start</span>
          <h2>
            Stand up.
            <br />
            Phone on your chest.
          </h2>
          <p>
            Feet together. Hold your phone upright against your chest with both
            hands. Pick a spot on the wall. Stay still until the end beep.
          </p>
          <p>
            The first 2 seconds let you settle. The next 13 seconds make the
            reading.
          </p>
          <p>
            Turn up your sound. No beep? Count slowly to 20 after the countdown,
            then look.
          </p>
        </Sheet>
      )}
      {test.phase === "permission" && (
        <Sheet>
          <h2>Allow motion.</h2>
          <p>
            Checking for motion readings. On some phones, access starts without
            a prompt.
          </p>
        </Sheet>
      )}
      {(test.phase === "running" || test.phase === "countdown") && (
        <ChartWindow className="stand-countdown" minHeight={280}>
          <strong>{test.phase === "countdown" ? test.seconds : "HOLD"}</strong>
          <p>
            {test.phase === "countdown"
              ? "Get it on your chest."
              : "Until the beep."}
          </p>
        </ChartWindow>
      )}
      {test.phase === "error" && (
        <Sheet>
          <div role="alert">
            <h2>Try that again.</h2>
            <p>{test.error}</p>
          </div>
        </Sheet>
      )}
      {test.phase === "unavailable" && (
        <Sheet>
          <h2>No motion sensor here.</h2>
          <p>This browser is not sending motion data. Skip this test to carry on.</p>
        </Sheet>
      )}
      {test.phase === "skipped" && (
        <Sheet>
          <h2>Test skipped.</h2>
          <p>No motion reading was saved.</p>
        </Sheet>
      )}
      {test.phase === "done" && test.reading && (
        <>
          <Trace reading={test.reading} baseline={baseline} />
          <Sheet>
            <h2>Reading taken.</h2>
            <dl>
              <div>
                <dt>Sway RMS</dt>
                <dd>{test.reading.metrics.swayRms.toFixed(4)}</dd>
              </div>
              <div>
                <dt>Side-to-side RMS</dt>
                <dd>{test.reading.metrics.swayLateralRms.toFixed(4)}</dd>
              </div>
              <div>
                <dt>Sample rate</dt>
                <dd>{test.reading.metrics.hz.toFixed(1)} Hz</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{test.reading.source}</dd>
              </div>
              <div>
                <dt>Units</dt>
                <dd>
                  {test.reading.source === "gyroscope" ? "degrees/s" : "m/s²"}
                </dd>
              </div>
            </dl>
            {test.reading.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <p>
              Raw movement readings. The same phone and sensor source are needed
              for a comparison.
            </p>
          </Sheet>
        </>
      )}
      {test.audioWarning && (
        <p role="status">
          Sound is unavailable. The capture still ends automatically after 15
          seconds.
        </p>
      )}
      {active ? (
        <Key quiet onClick={test.abort}>
          Cancel capture
        </Key>
      ) : (
        <Key
          onClick={() => {
            onReset?.();
            test.start();
          }}
        >
          {test.phase === "intro" ? "Start · allow motion" : "Run again"}
        </Key>
      )}
      {!active && test.phase !== "done" && (
        <Key quiet onClick={test.skip}>
          Skip this test
        </Key>
      )}
      <p className="fine">
        A toy, not a test. For adults.
        <br />
        Keep this page open until the end tone sounds.
      </p>
    </Housing>
  );
}
