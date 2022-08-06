/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @tsplus static effect/core/stm/STM.Aspects ensuring
 * @tsplus pipeable effect/core/stm/STM ensuring
 */
export function ensuring<R1, B>(finalizer: STM<R1, never, B>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E, A> =>
    self.foldSTM(
      (e) => finalizer > STM.fail(e),
      (a) => finalizer > STM.succeed(a)
    )
}
