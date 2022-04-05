/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 *
 * @tsplus fluent ets/STM eventually
 */
export function eventually<R, E, A>(self: STM<R, E, A>): STM<R, never, A> {
  return self.foldSTM(() => self.eventually(), STM.succeedNow);
}
