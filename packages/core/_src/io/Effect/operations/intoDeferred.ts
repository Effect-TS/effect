/**
 * Returns an effect that succeeds or fails a deferred based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified deferred will be interrupted, too.
 *
 * @tsplus fluent ets/Effect intoDeferred
 */
export function intoDeferred_<R, E, A>(
  self: Effect<R, E, A>,
  promise: LazyArg<Deferred<E, A>>,
  __tsplusTrace?: string
): Effect.RIO<R, boolean> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self)
      .exit()
      .flatMap((exit) => promise().done(exit))
  )
}

/**
 * Returns an effect that succeeds or fails a deferred based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified deferred will be interrupted, too.
 *
 * @tsplus static ets/Effect/Aspects intoPromise
 */
export const intoDeferred = Pipeable(intoDeferred_)
