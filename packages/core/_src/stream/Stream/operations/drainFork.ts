/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @tsplus fluent ets/Stream drainFork
 */
export function drainFork_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  other: LazyArg<Stream<R2, E2, Z>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A> {
  return Stream.fromEffect(Deferred.make<E | E2, never>()).flatMap(
    (backgroundDied) =>
      Stream.scoped(
        other()
          .runForEachScoped(() => Effect.unit)
          .catchAllCause((cause) => backgroundDied.failCause(cause))
          .forkScoped()
      ) > self.interruptWhenDeferred(backgroundDied)
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @tsplus static ets/Stream/Aspects drainFork
 */
export const drainFork = Pipeable(drainFork_)
