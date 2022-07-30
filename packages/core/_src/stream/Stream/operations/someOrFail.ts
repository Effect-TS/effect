/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/stream/Stream.Aspects someOrFail
 * @tsplus pipeable effect/core/stream/Stream someOrFail
 */
export function someOrFail<E2>(e: LazyArg<E2>, __tsplusTrace?: string) {
  return <R, E, A>(self: Stream<R, E, Maybe<A>>): Stream<R, E | E2, A> =>
    self.mapEffect((option) => option.fold(Effect.failSync(e), Effect.succeed))
}
