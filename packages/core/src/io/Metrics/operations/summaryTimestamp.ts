import type { Chunk } from "@fp-ts/data/Chunk"
import type { Duration } from "@fp-ts/data/Duration"

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops summaryTimestamp
 * @category constructors
 * @since 1.0.0
 */
export function summaryTimestamp(
  name: string,
  maxAge: Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>
): Metric.Summary<readonly [value: number, timestamp: number]> {
  return Metric.fromMetricKey(MetricKey.Summary(name, maxAge, maxSize, error, quantiles))
}
