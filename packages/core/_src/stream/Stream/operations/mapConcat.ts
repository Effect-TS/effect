/**
 * Maps each element to an Collection, and flattens the Collections into the
 * output of this stream.
 *
 * @tsplus fluent ets/Stream mapConcat
 */
export function mapConcat_<R, E, A, A2>(
  self: Stream<R, E, A>,
  f: (a: A) => Collection<A2>,
  __tsplusTrace?: string
): Stream<R, E, A2> {
  return self.chunksWith((chunk) => chunk.map((chunk) => chunk.flatMap((a) => Chunk.from(f(a)))));
}

/**
 * Maps each element to an Collection, and flattens the Collections into the
 * output of this stream.
 *
 * @tsplus static ets/Stream/Aspects mapConcat
 */
export const mapConcat = Pipeable(mapConcat_);
