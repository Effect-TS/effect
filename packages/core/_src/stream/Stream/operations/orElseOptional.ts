/**
 * Switches to the provided stream in case this one fails with the `None`
 * value.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects orElseOptional
 * @tsplus pipeable effect/core/stream/Stream orElseOptional
 */
export function orElseOptional<R2, E2, A2>(
  that: LazyArg<Stream<R2, Maybe<E2>, A2>>
) {
  return <R, E, A>(self: Stream<R, Maybe<E>, A>): Stream<R | R2, Maybe<E | E2>, A | A2> =>
    self.catchAll((option) => option.fold(that, (e) => Stream.fail(Maybe.some<E | E2>(e))))
}
