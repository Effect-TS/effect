import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import type { Counter } from "../definition"
import { concreteCounter } from "./_internal/InternalCounter"

/**
 * Returns the tags associated with the counter.
 *
 * @tsplus getter ets/Counter tags
 */
export function tags<A>(self: Counter<A>): Chunk<MetricLabel> {
  concreteCounter(self)
  return self._tags
}
