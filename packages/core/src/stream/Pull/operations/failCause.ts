import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Pull.Ops failCause
 * @category constructors
 * @since 1.0.0
 */
export function failCause<E>(cause: Cause<E>): Effect<never, Option.Option<E>, never> {
  return Effect.failCause(cause).mapError(Option.some)
}
