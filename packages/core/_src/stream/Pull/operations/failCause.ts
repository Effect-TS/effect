/**
 * @tsplus static ets/Pull/Ops failCause
 */
export function failCause<E>(cause: Cause<E>): IO<Option<E>, never> {
  return Effect.failCause(cause).mapError(Option.some);
}
