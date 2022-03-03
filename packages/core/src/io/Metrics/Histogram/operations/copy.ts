import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { MetricLabel } from "../../MetricLabel"
import type { Boundaries, Histogram } from "../definition"
import { concreteHistogram, InternalHistogram } from "./_internal/InternalHistogram"

/**
 * Returns a copy of this histogram with the specified name, boundaries, and/or
 * tags.
 *
 * @tsplus fluent ets/Histogram copy
 */
export function copy_<A>(
  self: Histogram<A>,
  params?: Partial<{
    readonly name: string
    readonly boundaries: Boundaries
    readonly tags: Chunk<MetricLabel>
  }>
): Histogram<A> {
  concreteHistogram(self)
  return new InternalHistogram(
    (params && params.name) || self.name,
    (params && params.boundaries) || self.boundaries,
    (params && params.tags) || self.tags,
    self.aspect
  )
}

/**
 * Returns a copy of this histogram with the specified name, boundaries, and/or
 * tags.
 *
 * @ets_data_first copy_
 */
export function copy(
  params: Partial<{
    readonly name: string
    readonly boundaries: Boundaries
    readonly tags: Chunk<MetricLabel>
  }>
) {
  return <A>(self: Histogram<A>): Histogram<A> => self.copy(params)
}
