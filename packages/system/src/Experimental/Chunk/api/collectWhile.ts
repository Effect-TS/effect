import * as O from "../../../Option"
import * as Chunk from "../core"
import * as ChunkDef from "../definition"

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 */
export function collectWhile_<A, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => O.Option<B>
): Chunk.Chunk<B> {
  ChunkDef.concrete(self)

  switch (self._typeId) {
    case ChunkDef.ArrTypeId: {
      const array = self.toArrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (O.isSome(rhs)) {
          dest = Chunk.append_(dest, rhs.value)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhile_(self.materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 *
 * @dataFirst collectWhile_
 */
export function collectWhile<A, B>(
  f: (a: A) => O.Option<B>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B> {
  return (self) => collectWhile_(self, f)
}
