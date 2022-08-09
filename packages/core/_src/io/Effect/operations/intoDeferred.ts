/**
 * Returns an effect that succeeds or fails a deferred based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified deferred will be interrupted, too.
 *
 * @tsplus static effect/core/io/Effect.Aspects intoDeferred
 * @tsplus pipeable effect/core/io/Effect intoDeferred
 */
export function intoDeferred<E, A>(deferred: Deferred<E, A>) {
  return <R>(self: Effect<R, E, A>): Effect<R, never, boolean> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self)
        .exit
        .flatMap((exit) => deferred.done(exit))
    )
}
