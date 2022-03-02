import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import type { Counter } from "../definition"
import { concreteCounter, InternalCounter } from "./_internal/InternalCounter"

/**
 * Returns a copy of this counter with the specified name and/or tags.
 *
 * @tsplus fluent ets/Counter copy
 */
export function copy_<A>(
  self: Counter<A>,
  params?: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel> }>
): Counter<A> {
  concreteCounter(self)
  return new InternalCounter(
    (params && params.name) || self._name,
    (params && params.tags) || self._tags,
    self._aspect
  )
}

/**
 * Returns a copy of this counter with the specified name and/or tags.
 *
 * @ets_data_first copy_
 */
export function copy(
  params: Partial<{ readonly name: string; readonly tags: Chunk<MetricLabel> }>
) {
  return <A>(self: Counter<A>): Counter<A> => self.copy(params)
}
