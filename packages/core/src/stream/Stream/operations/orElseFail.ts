/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects orElseFail
 * @tsplus pipeable effect/core/stream/Stream orElseFail
 * @category alternatives
 * @since 1.0.0
 */
export function orElseFail<E2>(e: LazyArg<E2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E2, A> => self | Stream.failSync(e)
}
