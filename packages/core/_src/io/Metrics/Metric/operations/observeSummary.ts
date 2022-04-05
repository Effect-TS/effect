/**
 * A metric aspect that adds a value to a summary each time the effect it is
 * applied to succeeds.
 *
 * @tsplus static ets/Metric/Ops observeSummary
 */
export function observeSummary(
  name: string,
  maxSize: number,
  maxAge: Duration,
  error: number,
  quantiles: Chunk<number>,
  ...tags: Array<MetricLabel>
): Summary<number> {
  return Summary(
    name,
    maxSize,
    maxAge,
    error,
    quantiles,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.observe(n))
  );
}
