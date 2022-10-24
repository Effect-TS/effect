import { IFailure } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus static effect/core/io/Exit.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: Cause<E>): Exit<E, never> {
  return new IFailure(cause)
}
