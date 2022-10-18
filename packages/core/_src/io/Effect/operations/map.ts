import { getCallTrace } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @effect traced
 * @tsplus static effect/core/io/Effect.Aspects map
 * @tsplus pipeable effect/core/io/Effect map
 */
export const map: <A, B>(f: (a: A) => B) => <R, E>(
  self: Effect<R, E, A>
) => Effect<R, E, B> = (f) => {
  const trace = getCallTrace()
  return (self) => self.flatMap((a) => Effect.sync(f(a)))._call(trace)
}
