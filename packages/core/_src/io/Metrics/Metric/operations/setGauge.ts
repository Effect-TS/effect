/**
 * A metric aspect that sets a gauge each time the effect it is applied to
 * succeeds.
 *
 * @tsplus static ets/Metric/Ops setGauge
 */
export function setGauge(name: string, ...tags: Array<MetricLabel>): Gauge<number> {
  return Gauge(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.set(n))
  );
}
