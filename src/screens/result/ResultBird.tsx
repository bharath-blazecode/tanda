import { Ibis, type Mood } from "../../ui";

const descriptions: Record<Mood, string> = {
  steady: "Dr. Kachka spreads his wings and gives a triumphant yell",
  wired: "Dr. Kachka runs one quick circle and stops with a jitter",
  tipsy: "Dr. Kachka sways, takes two uncertain steps, sits down and hiccups",
  wobbly: "Dr. Kachka attempts a wobbly takeoff and tumbles onto the paper",
};

/** Result-only, one-shot performances. The shared ibis drawing stays unchanged. */
export function ResultBird({
  mood,
  animate,
}: {
  mood: Mood;
  animate: boolean;
}) {
  const motion = animate
    ? ` result-bird--${mood}${mood === "wobbly" ? " result-bird--flight" : ""}`
    : "";
  const wings = animate && (mood === "steady" || mood === "wobbly");
  return (
    <div
      className="result-bird-stage"
      role="img"
      aria-label={animate ? descriptions[mood] : `Dr. Kachka, ${mood}`}
    >
      <div
        className={`result-bird${motion}`}
        data-mood={mood}
        aria-hidden="true"
      >
        {wings && (
          <svg
            className="result-wings"
            viewBox="0 0 120 130"
            aria-hidden="true"
          >
            <path
              className="result-wing result-wing--far"
              d="M50 58 C61 34 82 10 103 16 Q115 21 101 35 L110 31 Q107 46 92 51 L102 49 Q87 65 50 71Z"
            />
            <path
              className="result-wing result-wing--near"
              d="M44 60 C29 36 2 10 -12 18 Q-20 23 -3 38 L-13 35 Q-9 49 5 54 L-6 54 Q10 67 44 72Z"
            />
          </svg>
        )}
        <Ibis mood={mood === "tipsy" ? "steady" : mood} />
        {mood === "tipsy" && (
          <svg
            className="result-tipsy-eyes"
            viewBox="0 0 120 130"
            aria-hidden="true"
          >
            <path
              className="result-droopy-eye"
              d="M84.8 26.4 Q89 28.8 94 26.8 Q92.8 31.8 89.2 31.5 Q85.8 31.1 84.8 26.4Z"
            />
            <path className="result-droopy-lid" d="M85 26.5 Q89 28.8 94 26.8" />
            <path className="result-droopy-pupil" d="M90.5 29 L90.3 30" />
          </svg>
        )}
        {animate && mood === "steady" && (
          <svg className="result-face" viewBox="0 0 120 130" aria-hidden="true">
            <path
              className="result-mouth"
              d="M95 25 Q119 26 113 62 Q112 42 99 34 L105 48 Q96 42 94 32Z"
            />
            <text className="result-yell" x="52" y="-12" textAnchor="middle">
              AAARK!
            </text>
          </svg>
        )}
        {animate && mood === "tipsy" && (
          <svg
            className="result-hiccup"
            viewBox="0 0 120 130"
            aria-hidden="true"
          >
            <text x="103" y="3" textAnchor="end">
              hic!
            </text>
            <circle cx="108" cy="14" r="3" />
            <circle cx="100" cy="5" r="2" />
          </svg>
        )}
      </div>
    </div>
  );
}
