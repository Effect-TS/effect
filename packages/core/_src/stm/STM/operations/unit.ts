/**
 * Returns an `STM` effect that succeeds with `undefined`.
 *
 * @tsplus static ets/STM/Ops unit
 */
export const unit: USTM<void> = STM.succeed(undefined)
