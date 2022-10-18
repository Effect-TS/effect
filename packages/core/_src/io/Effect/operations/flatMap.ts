import { getCallTrace, IOnSuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @effect traced
 * @tsplus static effect/core/io/Effect.Aspects flatMap
 * @tsplus pipeable effect/core/io/Effect flatMap
 */
export const flatMap: <A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>
) => <R, E>(
  self: Effect<R, E, A>
) => Effect<R1 | R, E1 | E, B> = (f) => {
  const trace = getCallTrace()
  return (self) => new IOnSuccess(self, f, trace)
}
