import { Chunk, concrete, Singleton, SingletonTypeId } from "../definition"

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @tsplus fluent ets/Chunk mapWithIndex
 */
export function mapWithIndex_<A, B>(
  self: Chunk<A>,
  f: (index: number, a: A) => B
): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return new Singleton(f(0, self.a))
  }

  let r = Chunk.empty<B>()
  let i = 0
  for (const k of self) {
    r = r.append(f(i, k))
    i += 1
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first mapWithIndex_
 */
export function mapWithIndex<A, B>(f: (index: number, a: A) => B) {
  return (self: Chunk<A>): Chunk<B> => self.mapWithIndex(f)
}
