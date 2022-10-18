import { getCallTrace, ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models success with the specified value.
 *
 * @effect traced
 * @tsplus static effect/core/io/Effect.Ops succeed
 */
export const succeed: <A>(value: A) => Effect<never, never, A> = (value) => {
  const trace = getCallTrace()
  return new ISuccess(value, trace)
}
