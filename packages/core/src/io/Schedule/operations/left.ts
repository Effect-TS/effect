import type { Either } from "@fp-ts/data/Either"

/**
 * Returns a new schedule that makes this schedule available on the `Left`
 * side of an `Either` input, allowing propagating some type `X` through this
 * channel on demand.
 *
 * @tsplus getter effect/core/io/Schedule left
 * @category mutations
 * @since 1.0.0
 */
export function left<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>
): Schedule<readonly [State, void], Env, Either<In, X>, Either<Out, X>> {
  return self + Schedule.identity<X>()
}
