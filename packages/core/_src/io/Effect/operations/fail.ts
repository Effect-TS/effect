import { getCallTrace } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @effect traced
 * @tsplus static effect/core/io/Effect.Ops fail
 */
export const fail: <E>(error: E) => Effect<never, E, never> = (error) => {
  const trace = getCallTrace()
  return Effect.failCause(Cause.fail(error))._call(trace)
}
