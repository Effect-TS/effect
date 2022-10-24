import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Pull.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(e: E): Effect<never, Option.Option<E>, never> {
  return Effect.fail(Option.some(e))
}
