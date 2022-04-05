/**
 * A metric aspect that adjusts a gauge each time the effect it is applied to
 * succeeds.
 *
 * @tsplus static ets/Metric/Ops adjustGauge
 */
export function adjustGauge(name: string, ...tags: Array<MetricLabel>): Gauge<number> {
  return Gauge(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.adjust(n))
  );
}
