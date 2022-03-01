import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Effect } from "../../../Effect"
import type { MetricLabel } from "../../MetricLabel"
import type { Counter } from "../definition"
import { InternalCounter } from "./_internal/InternalCounter"

/**
 * Creates a new counter.
 *
 * @tsplus static ets/CounterOps __call
 */
export function make<A>(
  name: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Counter<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A>) => Effect<R, E, A1>
): Counter<A> {
  return new InternalCounter(name, tags, aspect)
}
