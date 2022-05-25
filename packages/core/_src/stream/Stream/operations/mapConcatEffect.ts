/**
 * Effectfully maps each element to an Collection, and flattens the Collections
 * into the output of this stream.
 *
 * @tsplus fluent ets/Stream mapConcatEffect
 */
export function mapConcatEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Collection<A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.mapEffect((a) => f(a).map(Chunk.from)).mapConcat(identity)
}

/**
 * Effectfully maps each element to an Collection, and flattens the Collections
 * into the output of this stream.
 *
 * @tsplus static ets/Stream/Aspects mapConcatEffect
 */
export const mapConcatEffect = Pipeable(mapConcatEffect_)
