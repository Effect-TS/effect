import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Duration } from "../../../../data/Duration"
import type { Effect } from "../../../Effect"
import type { MetricLabel } from "../../MetricLabel"
import type { Summary } from "../definition"
import { InternalSummary } from "./_internal/InternalSummary"

/**
 * Creates a new summary.
 *
 * @tsplus static ets/SummaryOps __call
 */
export function make<A>(
  name: string,
  maxSize: number,
  maxAge: Duration,
  error: number,
  quantiles: Chunk<number>,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Summary<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Summary<A> {
  return new InternalSummary(name, maxSize, maxAge, error, quantiles, tags, aspect)
}
