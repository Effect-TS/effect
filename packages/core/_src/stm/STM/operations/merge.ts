/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @tsplus getter effect/core/stm/STM merge
 */
export function merge<R, E, A>(self: STM<R, E, A>): STM<R, never, E | A> {
  return self.foldSTM((e) => STM.succeedNow(e), STM.succeedNow)
}
