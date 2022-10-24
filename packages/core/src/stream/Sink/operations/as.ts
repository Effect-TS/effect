/**
 * Replaces this sink's result with the provided value.
 *
 * @tsplus static effect/core/stream/Sink.Aspects as
 * @tsplus pipeable effect/core/stream/Sink as
 * @category mapping
 * @since 1.0.0
 */
export function as<Z2>(a: Z2) {
  return <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<R, E, In, L, Z2> => self.map(() => a)
}
