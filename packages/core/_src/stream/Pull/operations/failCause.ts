/**
 * @tsplus static ets/Pull/Ops failCause
 */
export function failCause<E>(cause: Cause<E>): Effect.IO<Maybe<E>, never> {
  return Effect.failCause(cause).mapError(Maybe.some)
}
