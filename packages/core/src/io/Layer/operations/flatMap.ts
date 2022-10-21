/**
 * Constructs a layer dynamically based on the output of this layer.
 *
 * @tsplus static effect/core/io/Layer.Aspects flatMap
 * @tsplus pipeable effect/core/io/Layer flatMap
 */
export function flatMap<A, R2, E2, A2>(f: (a: Env<A>) => Layer<R2, E2, A2>) {
  return <R, E>(self: Layer<R, E, A>): Layer<R | R2, E | E2, A2> =>
    self.foldLayer(
      (e) => Layer.fail(e),
      f
    )
}
