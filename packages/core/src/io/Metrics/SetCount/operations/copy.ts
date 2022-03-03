import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import type { SetCount } from "../definition"
import { concreteSetCount, InternalSetCount } from "./_internal/InternalSetCount"

/**
 * Returns a copy of this counter with the specified name, setTag, and/or tags.
 *
 * @tsplus fluent ets/SetCount copy
 */
export function copy_<A>(
  self: SetCount<A>,
  params?: Partial<{
    readonly name: string
    readonly setTag: string
    readonly tags: Chunk<MetricLabel>
  }>
): SetCount<A> {
  concreteSetCount(self)
  return new InternalSetCount(
    (params && params.name) || self.name,
    (params && params.setTag) || self.setTag,
    (params && params.tags) || self.tags,
    self.aspect
  )
}

/**
 * Returns a copy of this counter with the specified name, setTag, and/or tags.
 *
 * @ets_data_first copy_
 */
export function copy(
  params: Partial<{
    readonly name: string
    readonly setTag: string
    readonly tags: Chunk<MetricLabel>
  }>
) {
  return <A>(self: SetCount<A>): SetCount<A> => self.copy(params)
}
