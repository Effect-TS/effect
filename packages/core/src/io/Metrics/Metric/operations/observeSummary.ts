import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Duration } from "../../../../data/Duration"
import type { MetricLabel } from "../../MetricLabel"
import { Summary } from "../../Summary"

/**
 * A metric aspect that adds a value to a summary each time the effect it is
 * applied to succeeds.
 *
 * @tsplus static ets/MetricOps observeSummary
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
  )
}
