/**
 * Split a stream by a predicate. The faster stream may advance by up to
 * buffer elements further than the slower one.
 *
 * @tsplus static effect/core/stream/Stream.Aspects partitionEither
 * @tsplus pipeable effect/core/stream/Stream partitionEither
 */
export function partitionEither<A, R2, E2, A2, A3>(
  p: (a: A) => Effect<R2, E2, Either<A2, A3>>,
  buffer = 16
) {
  return <R, E>(self: Stream<R, E, A>): Effect<
    R | R2 | Scope,
    E | E2,
    readonly [Stream<never, E | E2, A2>, Stream<never, E | E2, A3>]
  > =>
    self
      .mapEffect(p)
      .distributedWith(2, buffer, (either) =>
        either.fold(
          () => Effect.succeed((_) => _ === 0),
          () => Effect.succeed((_) => _ === 1)
        ))
      .flatMap((dequeues) => {
        if (dequeues.length === 2) {
          return Effect.succeed([
            Stream.fromQueueWithShutdown(dequeues.unsafeHead!)
              .flattenExitMaybe
              .collectLeft,
            Stream.fromQueueWithShutdown(dequeues.unsafeLast!)
              .flattenExitMaybe
              .collectRight
          ])
        }
        return Effect.dieMessage(
          `Stream.partitionEither: expected two streams but received: ${dequeues.length}`
        )
      })
}
