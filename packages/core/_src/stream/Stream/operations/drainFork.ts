/**
 * Drains the provided stream in the background for as long as this stream is
 * running. If this stream ends before `other`, `other` will be interrupted.
 * If `other` fails, this stream will fail with that error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects drainFork
 * @tsplus pipeable effect/core/stream/Stream drainFork
 */
export function drainFork<R2, E2, Z>(
  other: LazyArg<Stream<R2, E2, Z>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    Stream.fromEffect(Deferred.make<E | E2, never>()).flatMap(
      (backgroundDied) =>
        Stream.scoped(
          other()
            .runForEachScoped(() => Effect.unit)
            .catchAllCause((cause) => backgroundDied.failCause(cause))
            .forkScoped
        ) > self.interruptWhenDeferred(backgroundDied)
    )
}
