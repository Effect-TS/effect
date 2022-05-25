/**
 * @tsplus static ets/Metrics/Metric/Ops summary
 */
export function summary(
  name: string,
  maxAge: Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>
): Metric.Summary<number> {
  return Metric.summaryTimestamp(name, maxAge, maxSize, error, quantiles).withNow()
}
