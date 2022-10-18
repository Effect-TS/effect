import { getCallTrace, IFailure } from "@effect/core/io/Effect/definition/primitives"

/**
 * @effect traced
 * @tsplus static effect/core/io/Exit.Ops fail
 */
export const fail: <E>(error: E) => Exit<E, never> = (error) => {
  const trace = getCallTrace()
  return new IFailure(Cause.fail(error), trace)
}
