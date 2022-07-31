/**
 * Emits elements of this stream with a fixed delay in between, regardless of
 * how long it takes to produce a value.
 *
 * @tsplus static effect/core/stream/Stream.Aspects fixed
 * @tsplus pipeable effect/core/stream/Stream fixed
 */
export function fixed(duration: LazyArg<Duration>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> =>
    self.schedule(Schedule.fixed(duration))
}
