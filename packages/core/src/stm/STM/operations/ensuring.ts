import { STM } from "../definition"

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @tsplus fluent ets/STM ensuring
 */
export function ensuring_<R, E, A, R1, B>(
  self: STM<R, E, A>,
  finalizer: STM<R1, never, B>
): STM<R & R1, E, A> {
  return self.foldSTM(
    (e) => finalizer > STM.fail(e),
    (a) => finalizer > STM.succeedNow(a)
  )
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, B>(finalizer: STM<R1, never, B>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R1, E, A> => self.ensuring(finalizer)
}
