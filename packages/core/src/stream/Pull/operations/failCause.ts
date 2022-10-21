/**
 * @tsplus static effect/core/stream/Pull.Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Effect<never, Maybe<E>, never> {
  return Effect.failCause(cause).mapError(Maybe.some)
}
