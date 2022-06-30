/**
 * Flattens nested layers.
 *
 * @tsplus fluent effect/core/io/Layer flatten
 */
export function flatten<R, E, R2, E2, A>(
  self: Layer<R, E, Layer<R2, E2, A>>,
  tag: Tag<Layer<R2, E2, A>>
): Layer<R | R2, E | E2, A> {
  return self.flatMap((env) => env.get(tag))
}
