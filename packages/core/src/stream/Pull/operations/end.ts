import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/stream/Pull.Ops end
 * @category constructors
 * @since 1.0.0
 */
export const end: Effect<never, Option.Option<never>, never> = Effect.fail(Option.none)
