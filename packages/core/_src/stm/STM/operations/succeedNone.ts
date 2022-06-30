/**
 * Returns an effect with the empty value.
 *
 * @tsplus static effect/core/stm/STM.Ops none
 */
export const succeedNone: USTM<Maybe<never>> = STM.succeed(Maybe.none)
