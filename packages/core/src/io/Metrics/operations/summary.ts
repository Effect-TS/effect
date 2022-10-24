import type { Chunk } from "@fp-ts/data/Chunk"
import type { Duration } from "@fp-ts/data/Duration"

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops summary
 * @category constructors
 * @since 1.0.0
 */
export function summary(
  name: string,
  maxAge: Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>
): Metric.Summary<number> {
  return Metric.summaryTimestamp(name, maxAge, maxSize, error, quantiles).withNow
}
