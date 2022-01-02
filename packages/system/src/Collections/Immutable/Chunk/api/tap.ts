import * as Chunk from "../core"

/**
 * Like chain but ignores output
 */
export function tap_<A, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => Chunk.Chunk<B>
): Chunk.Chunk<A> {
  return Chunk.chain_(self, (a) => Chunk.map_(f(a), (_) => a))
}

/**
 * Like chain but ignores output
 *
 * @ets_data_first tap_
 */
export function tap<A, B>(f: (a: A) => Chunk.Chunk<B>) {
  return (self: Chunk.Chunk<A>) => tap_(self, f)
}
