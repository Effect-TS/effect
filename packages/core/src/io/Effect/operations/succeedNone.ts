import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect with the empty value.
 *
 * @tsplus static effect/core/io/Effect.Ops none
 * @category constructors
 * @since 1.0.0
 */
export const succeedNone: Effect<never, never, Option.Option<never>> = Effect.succeed(Option.none)
