/**
 * A metric aspect that increments the specified counter by a given value.
 *
 * @tsplus static ets/Metric/Ops countValue
 */
export function countValue(name: string, ...tags: Array<MetricLabel>): Counter<number> {
  return Counter(
    name,
    Chunk.from(tags),
    (metric) => (effect) => effect.tap((n) => metric.increment(n))
  );
}
