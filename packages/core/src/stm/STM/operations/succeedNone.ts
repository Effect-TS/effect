import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect with the empty value.
 *
 * @tsplus static effect/core/stm/STM.Ops none
 * @category constructors
 * @since 1.0.0
 */
export const succeedNone: USTM<Option.Option<never>> = STM.succeed(Option.none)
