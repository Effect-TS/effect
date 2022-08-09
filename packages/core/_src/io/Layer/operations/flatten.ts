/**
 * Flattens nested layers.
 *
 * @tsplus static effect/core/io/Layer.Aspects flatten
 * @tsplus pipeable effect/core/io/Layer flatten
 */
export function flatten<R2, E2, A>(tag: Tag<Layer<R2, E2, A>>) {
  return <R, E>(self: Layer<R, E, Layer<R2, E2, A>>): Layer<R | R2, E | E2, A> =>
    self.flatMap((env) => env.get(tag))
}
