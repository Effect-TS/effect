// ets_tracing: off

import * as core from "../../../../Effect/core.js"
import type { Effect } from "../../../../Effect/effect.js"
import * as map from "../../../../Effect/map.js"
import * as zipWith from "../../../../Effect/zipWith.js"
import * as O from "../../../../Option/index.js"
import * as Chunk from "../core.js"
import * as ChunkDef from "../definition.js"

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
        () => core.succeed(Chunk.empty()),
        (b) => map.map_(b, Chunk.single)
      )
    }
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
