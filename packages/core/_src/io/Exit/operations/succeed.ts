import { getCallTrace, ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * @effect traced
 * @tsplus static effect/core/io/Exit.Ops succeed
 */
export const succeed: <A>(a: A) => Exit<never, A> = (a) => {
  const trace = getCallTrace()
  return new ISuccess(a, trace)
}
