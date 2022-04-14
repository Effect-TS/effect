/**
 * @tsplus fluent ets/Effect onDoneCause
 */
export function onDoneCause_<R, E, A, R1, X1, R2, X2>(
  self: Effect<R, E, A>,
  error: (e: Cause<E>) => Effect.RIO<R1, X1>,
  success: (a: A) => Effect.RIO<R2, X2>,
  __tsplusTrace?: string
): Effect.RIO<R & R1 & R2, void> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self)
      .foldCauseEffect(
        (e) => restore(error(e)),
        (s) => restore(success(s))
      )
      .forkDaemon()
      .asUnit()
  );
}

/**
 * @tsplus static ets/Effect/Aspects onDoneCause
 */
export const onDoneCause = Pipeable(onDoneCause_);
