/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 *
 * @tsplus getter effect/core/stm/STM eventually
 * @category mutations
 * @since 1.0.0
 */
export function eventually<R, E, A>(self: STM<R, E, A>): STM<R, never, A> {
  return self.foldSTM(() => self.eventually, STM.succeed)
}
