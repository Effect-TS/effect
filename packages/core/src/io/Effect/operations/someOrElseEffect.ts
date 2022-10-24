import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @tsplus static effect/core/io/Effect.Aspects someOrElseEffect
 * @tsplus pipeable effect/core/io/Effect someOrElseEffect
 * @category getters
 * @since 1.0.0
 */
export function someOrElseEffect<R2, E2, B>(orElse: LazyArg<Effect<R2, E2, B>>) {
  return <R, E, A>(self: Effect<R, E, Option.Option<A>>): Effect<R | R2, E | E2, A | B> =>
    (self as Effect<R, E, Option.Option<A | B>>).flatMap((option) =>
      pipe(option, Option.map(Effect.succeed), Option.getOrElse(orElse()))
    )
}
