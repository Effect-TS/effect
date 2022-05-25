/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/STM/Ops none
 */
export const succeedNone: USTM<Option<never>> = STM.succeed(Option.none)
