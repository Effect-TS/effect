/**
 * Fails with given error 'e' if value is `Left`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects rightOrFail
 * @tsplus pipeable effect/core/stream/Stream rightOrFail
 */
export function rightOrFail<R, E, E2, A1, A2>(
  error: LazyArg<E2>,
  __tsplusTrace?: string
) {
  return (self: Stream<R, E, Either<A1, A2>>): Stream<R, E | E2, A2> =>
    self.mapEffect((either) => either.fold(() => Effect.failSync(error), Effect.succeed))
}
