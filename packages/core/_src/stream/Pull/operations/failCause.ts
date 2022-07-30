/**
 * @tsplus static effect/core/stream/Pull.Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Effect<never, Maybe<E>, never> {
  return Effect.failCauseSync(cause).mapError(Maybe.some)
}
