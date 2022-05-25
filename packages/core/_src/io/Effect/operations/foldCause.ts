/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @tsplus fluent ets/Effect foldCause
 */
export function foldCause_<R, E, A, A2, A3>(
  self: Effect<R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
): Effect.RIO<R, A2 | A3> {
  return self.foldCauseEffect(
    (c) => Effect.succeedNow(failure(c)),
    (a) => Effect.succeedNow(success(a))
  )
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @tsplus static ets/Effect/Aspects foldCause
 */
export const foldCause = Pipeable(foldCause_)
