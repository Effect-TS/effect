/**
 * A metric aspect that adjusts a gauge each time the effect it is applied to
 * succeeds, using the specified function to transform the value returned by
 * the effect to the value to adjust the gauge with.
 *
 * @tsplus static ets/Metric/Ops adjustGaugeWith
 */
export function adjustGaugeWith(name: string, ...tags: Array<MetricLabel>) {
  return <A>(f: (a: A) => number): Gauge<A> =>
    Gauge(
      name,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.adjust(f(a)))
    );
}
