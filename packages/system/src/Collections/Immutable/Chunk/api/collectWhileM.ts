import * as core from "../../../../Effect/core"
import type { Effect } from "../../../../Effect/effect"
import * as zipWith from "../../../../Effect/zipWith"
import * as O from "../../../../Option"
import * as Chunk from "../core"
import * as ChunkDef from "../definition"

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 */
export function collectWhileM_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => O.Option<Effect<R, E, B>>
): Effect<R, E, Chunk.Chunk<B>> {
  ChunkDef.concrete(self)

  switch (self._typeId) {
    case ChunkDef.ArrTypeId: {
      const array = self.arrayLike()
      let dest: Effect<R, E, Chunk.Chunk<B>> = core.succeed(Chunk.empty<B>())
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (O.isSome(rhs)) {
          dest = zipWith.zipWith_(dest, rhs.value, Chunk.append_)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhileM_(self.materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 *
 * @dataFirst collectWhileM_
 */
export function collectWhileM<A, R, E, B>(
  f: (a: A) => O.Option<Effect<R, E, B>>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => collectWhileM_(self, f)
}
