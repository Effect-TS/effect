/**
 * @tsplus static effect/core/stream/Pull.Ops fail
 */
export function fail<E>(e: E): Effect<never, Maybe<E>, never> {
  return Effect.fail(Maybe.some(e))
}
