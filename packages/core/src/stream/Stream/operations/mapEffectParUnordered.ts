/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. The element order is
 * not enforced by this combinator, and elements may be reordered.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapEffectParUnordered
 * @tsplus pipeable effect/core/stream/Stream mapEffectParUnordered
 */
export function mapEffectParUnordered<A, R1, E1, B>(
  n: number,
  f: (a: A) => Effect<R1, E1, B>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, B> =>
    self.flatMapPar(
      n,
      (a) => Stream.fromEffect(f(a))
    )
}
