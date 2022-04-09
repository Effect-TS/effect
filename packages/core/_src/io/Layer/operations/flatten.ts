/**
 * Flattens nested layers.
 *
 * @tsplus fluent ets/Layer flatten
 */
export function flatten<R, E, R2, E2, A>(
  self: Layer<R, E, Layer<R2, E2, A>>
): Layer<R & R2, E | E2, A> {
  return self.flatMap(identity);
}
