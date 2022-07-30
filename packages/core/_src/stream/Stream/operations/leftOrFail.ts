/**
 * Fails with given error 'e' if value is `Right`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects leftOrFail
 * @tsplus pipeable effect/core/stream/Stream leftOrFail
 */
export function leftOrFail<E2>(e: LazyArg<E2>, __tsplusTrace?: string) {
  return <R, E, A, A2>(self: Stream<R, E, Either<A, A2>>): Stream<R, E | E2, A> =>
    self.mapEffect((either) => either.fold(Effect.succeed, () => Effect.failSync(e)))
}
