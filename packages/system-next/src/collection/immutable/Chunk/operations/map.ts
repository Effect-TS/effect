import { Chunk, concrete, Singleton, SingletonTypeId } from "../definition"

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @tsplus fluent ets/Chunk map
 */
export function map_<A, B>(self: Chunk<A>, f: (a: A) => B): Chunk<B> {
  concrete(self)

  if (self._typeId === SingletonTypeId) {
    return new Singleton(f(self.a))
  }

  let r = Chunk.empty<B>()
  for (const k of self) {
    r = r.append(f(k))
  }
  return r
}

/**
 * Returns a chunk with the elements mapped by the specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): (self: Chunk<A>) => Chunk<B> {
  return (self) => self.map(f)
}
