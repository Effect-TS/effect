import { ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models success with the specified value.
 *
 * @tsplus static effect/core/io/Effect.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<A>(value: A): Effect<never, never, A> {
  return new ISuccess(value)
}
