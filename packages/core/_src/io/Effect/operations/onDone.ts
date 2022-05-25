/**
 * @tsplus fluent ets/Effect onDone
 */
export function onDone_<R, E, A, R1, X1, R2, X2>(
  self: Effect<R, E, A>,
  error: (e: E) => Effect.RIO<R1, X1>,
  success: (a: A) => Effect.RIO<R2, X2>,
  __tsplusTrace?: string
): Effect.RIO<R & R1 & R2, void> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self)
      .foldEffect(
        (e) => restore(error(e)),
        (s) => restore(success(s))
      )
      .forkDaemon()
      .asUnit()
  )
}

/**
 * @tsplus static ets/Effect/Aspects onDone
 */
export const onDone = Pipeable(onDone_)
