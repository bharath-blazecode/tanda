import { useEffect, useRef } from "react";
import { CAPTURE_SECONDS, SETTLE_SECONDS, type StandAnalysis } from "./analyze";
import { standStatus } from "../../engine/compare";
import { ChartWindow } from "../../ui";
export function Trace({
  reading,
  baseline,
}: {
  reading: StandAnalysis;
  baseline?: StandAnalysis;
}) {
  const overlay = baseline && standStatus(baseline.metrics, reading.metrics).compared ? baseline : undefined;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const context = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, bounds.width * ratio);
      canvas.height = Math.max(1, bounds.height * ratio);
      const progress = reduced ? 1 : Math.min(1, (now - start) / 2000);
      const amplitude = Math.max(
        0.001,
        ...reading.trace.map((point) => Math.abs(point.lateral)),
        ...(overlay?.trace.map((point) => Math.abs(point.lateral)) ?? []),
      );
      const line = (
        points: StandAnalysis["trace"],
        fraction: number,
        color: string,
        dashed = false,
      ) => {
        context.strokeStyle = color;
        context.lineWidth = 2 * ratio;
        context.setLineDash(dashed ? [5 * ratio, 4 * ratio] : []);
        context.beginPath();
        const origin = points[0]?.t ?? 0,
          duration = (points.at(-1)?.t ?? 0) - origin;
        points.forEach((point, index) => {
          const position = duration ? (point.t - origin) / duration : 0;
          if (position > fraction) return;
          const x = position * canvas.width,
            y =
              canvas.height / 2 -
              (point.lateral / amplitude) * canvas.height * 0.38;
          if (index) context.lineTo(x, y);
          else context.moveTo(x, y);
        });
        context.stroke();
      };
      const styles = getComputedStyle(canvas);
      if (overlay)
        line(overlay.trace, 1, styles.getPropertyValue("--pencil"), true);
      line(reading.trace, progress, styles.getPropertyValue("--ink"));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const redraw = () => {
      cancelAnimationFrame(frame);
      draw(performance.now());
    };
    window.addEventListener("resize", redraw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", redraw);
    };
  }, [reading, overlay]);
  return (
    <ChartWindow minHeight={280}>
      <canvas
        ref={ref}
        role="img"
        aria-label="Replay of measured device y-axis motion"
      />
      <span className="legend">
        DEVICE Y-AXIS MOTION
        {overlay && (
          <span className="baseline">Blue · previous run</span>
        )}
      </span>
      <span className="axis">
        {SETTLE_SECONDS}s settling excluded · {CAPTURE_SECONDS - SETTLE_SECONDS}s measured
      </span>
    </ChartWindow>
  );
}
