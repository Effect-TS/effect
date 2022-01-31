// ets_tracing: off

import * as O from "../../../../Option/index.js"
import * as Chunk from "../core.js"
import * as ChunkDef from "../definition.js"

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 */
export function collectWithIndex_<A, B>(
  self: Chunk.Chunk<A>,
  f: (index: number, a: A) => O.Option<B>
): Chunk.Chunk<B> {
  ChunkDef.concrete(self)

  switch (self._typeId) {
    case ChunkDef.ArrTypeId: {
      const array = self.arrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(i, array[i]!)
        if (O.isSome(rhs)) {
          dest = Chunk.append_(dest, rhs.value)
        }
      }
      return dest
    }
    default: {
      return collectWithIndex_(self.materialize(), f)
    }
  }
}

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @ets_data_first collectWithIndex_
 */
export function collectWithIndex<A, B>(
  f: (index: number, a: A) => O.Option<B>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B> {
  return (self) => collectWithIndex_(self, f)
}
