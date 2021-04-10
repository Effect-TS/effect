import * as O from "../../../../Option"
import * as Chunk from "../core"
import * as ChunkDef from "../definition"

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 */
export function filterMap_<A, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => O.Option<B>
): Chunk.Chunk<B> {
  ChunkDef.concrete(self)

  switch (self._typeId) {
    case ChunkDef.ArrTypeId: {
      const array = self.arrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (O.isSome(rhs)) {
          dest = Chunk.append_(dest, rhs.value)
        }
      }
      return dest
    }
    default: {
      return filterMap_(self.materialize(), f)
    }
  }
}

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(
  f: (a: A) => O.Option<B>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B> {
  return (self) => filterMap_(self, f)
}
