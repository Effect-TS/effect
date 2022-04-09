/**
 * A metric aspect that adds a value to a summary each time the effect it is
 * applied to succeeds, using the specified function to transform the value
 * returned by the effect to the value to add to the summary.
 *
 * @tsplus static ets/Metric/Ops observeSummaryWith
 */
export function observeSummaryWith(
  name: string,
  maxSize: number,
  maxAge: Duration,
  error: number,
  quantiles: Chunk<number>,
  ...tags: Array<MetricLabel>
) {
  return <A>(f: (a: A) => number): Summary<A> =>
    Summary(
      name,
      maxSize,
      maxAge,
      error,
      quantiles,
      Chunk.from(tags),
      (metric) => (effect) => effect.tap((a) => metric.observe(f(a)))
    );
}
