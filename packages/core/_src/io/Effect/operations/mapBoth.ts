/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @tsplus static effect/core/io/Effect.Aspects mapBoth
 * @tsplus pipeable effect/core/io/Effect mapBoth
 */
export function mapBoth<E, A, E2, A2>(
  f: (e: E) => E2,
  g: (a: A) => A2
) {
  return <R>(self: Effect<R, E, A>): Effect<R, E2, A2> =>
    self.foldEffect(
      (e) => Effect.fail(f(e)),
      (a) => Effect.succeed(g(a))
    )
}
