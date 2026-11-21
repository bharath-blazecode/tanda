// Matched low/high pass stages for both axes. Values keep their source units.
export function bandpass(
  values: readonly number[],
  hz: number,
  low = 0.2,
  high = 3,
): number[] {
  if (!values.length) return [];
  const dt = 1 / hz;
  const highAlpha = 1 / (2 * Math.PI * low) / (1 / (2 * Math.PI * low) + dt);
  const lowAlpha = dt / (1 / (2 * Math.PI * Math.min(high, hz * 0.4)) + dt);
  let previous = values[0],
    highValue = 0,
    lowValue = 0;
  return values.map((value) => {
    highValue = highAlpha * (highValue + value - previous);
    previous = value;
    lowValue += lowAlpha * (highValue - lowValue);
    return lowValue;
  });
}
export function rms(values: readonly number[]): number {
  return Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0) /
      Math.max(1, values.length),
  );
}
