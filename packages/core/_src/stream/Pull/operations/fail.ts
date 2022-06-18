/**
 * @tsplus static ets/Pull/Ops fail
 */
export function fail<E>(e: E): Effect.IO<Maybe<E>, never> {
  return Effect.fail(Maybe.some(e))
}
