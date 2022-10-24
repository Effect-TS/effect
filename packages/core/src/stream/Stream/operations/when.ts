/**
 * Returns the specified stream if the given condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops when
 * @category mutations
 * @since 1.0.0
 */
export function when<R, E, A>(b: LazyArg<boolean>, stream: Stream<R, E, A>): Stream<R, E, A> {
  return Stream.whenEffect(Effect.sync(b), stream)
}
