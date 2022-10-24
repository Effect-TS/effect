import { identity } from "@fp-ts/data/Function"

/**
 * Returns an aspect that will update this metric with the defects of the
 * effects that it is applied to.
 *
 * @tsplus getter effect/core/io/Metrics/Metric trackDefect
 * @category aspects
 * @since 1.0.0
 */
export function trackDefect<Type, Out>(
  self: Metric<Type, unknown, Out>
): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> {
  return self.trackDefectWith(identity)
}
