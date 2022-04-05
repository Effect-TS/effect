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
  );
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @tsplus static ets/STM/Aspects ensuring
 */
export const ensuring = Pipeable(ensuring_);
