import { IOnSuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @tsplus static effect/core/io/Effect.Aspects flatMap
 * @tsplus pipeable effect/core/io/Effect flatMap
 */
export function flatMap<A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R1, E | E1, B> => new IOnSuccess(self, f)
}
