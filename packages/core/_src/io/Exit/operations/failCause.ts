import { IFailure } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus static effect/core/io/Exit.Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Exit<E, never> {
  return new IFailure(cause)
}
