/**
 * Returns an `STM` effect that succeeds with `undefined`.
 *
 * @tsplus static ets/STM/Ops unit
 */
export const unit_: USTM<void> = STM.succeed(undefined)

/**
 * Ignores the result of the transactional effect replacing it with `undefined`.
 *
 * @tsplus getter ets/STM unit
 */
export function unit<R, E, X>(self: STM<R, E, X>): STM<R, E, void> {
  return self > STM.unit
}
