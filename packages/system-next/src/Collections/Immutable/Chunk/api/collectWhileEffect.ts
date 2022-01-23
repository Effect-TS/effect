import type { Effect } from "../../../../Effect/definition"
import { map_ } from "../../../../Effect/operations/map"
import { succeedNow } from "../../../../Effect/operations/succeedNow"
import { zipWith_ } from "../../../../Effect/operations/zipWith"
import * as O from "../../../../Option"
import * as ChunkDef from "../_definition"
import * as Chunk from "../core"

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 */
export function collectWhileEffect_<A, R, E, B>(
  self: Chunk.Chunk<A>,
  f: (a: A) => O.Option<Effect<R, E, B>>
): Effect<R, E, Chunk.Chunk<B>> {
  ChunkDef.concrete(self)

  switch (self._typeId) {
    case ChunkDef.SingletonTypeId: {
      return O.fold_(
        f(self.a),
        () => succeedNow(Chunk.empty()),
        (b) => map_(b, Chunk.single)
      )
    }
    case ChunkDef.ArrTypeId: {
      const array = self.arrayLike()
      let dest: Effect<R, E, Chunk.Chunk<B>> = succeedNow(Chunk.empty<B>())
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (O.isSome(rhs)) {
          dest = zipWith_(dest, rhs.value, Chunk.append_)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhileEffect_(self.materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhileEffect_
 */
export function collectWhileEffect<A, R, E, B>(
  f: (a: A) => O.Option<Effect<R, E, B>>
): (self: Chunk.Chunk<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => collectWhileEffect_(self, f)
}
