import { Chunk, concrete, SingletonTypeId } from "../definition"

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @tsplus fluent ets/Chunk flatMap
 */
export function chain_<A, B>(self: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return f(self.a)
  }

  let r = Chunk.empty<B>()
  for (const k of self) {
    r = r.concat(f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => Chunk<B>) {
  return (self: Chunk<A>): Chunk<B> => self.flatMap(f)
}
