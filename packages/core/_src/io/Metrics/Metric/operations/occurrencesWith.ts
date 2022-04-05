/**
 * A metric aspect that counts the number of occurrences of each distinct
 * value returned by the effect it is applied to, using the specified function
 * to transform the value returned by the effect to the value to count the
 * occurrences of.
 *
 * @tsplus static ets/Metric/Ops occurrencesWith
 */
export function occurrencesWith(
  name: string,
  setTag: string,
  ...tags: Array<MetricLabel>
) {
  return <A>(f: (a: A) => string): SetCount<A> =>
    SetCount(
      name,
      setTag,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.observe(f(a)))
    );
}
