/**
 * Transforms both inputs and result of this sink using the provided
 * functions.
 *
 * @tsplus static effect/core/stream/Sink.Aspects dimap
 * @tsplus pipeable effect/core/stream/Sink.Aspects dimap
 * @category mapping
 * @since 1.0.0
 */
export function dimap<In, In1, Z, Z1>(
  f: (input: In1) => In,
  g: (z: Z) => Z1
) {
  return <R, E, L>(self: Sink<R, E, In, L, Z>): Sink<R, E, In1, L, Z1> => self.contramap(f).map(g)
}
