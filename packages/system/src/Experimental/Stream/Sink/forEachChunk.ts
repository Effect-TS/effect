// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk"
import * as T from "../../../Effect"
import type * as C from "./core"
import * as ForEachChunkWhile from "./forEachChunkWhile"

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, ErrIn, ErrOut, In, Z>(
  f: (c: CK.Chunk<In>) => T.Effect<R, ErrOut, Z>
): C.Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  return ForEachChunkWhile.forEachChunkWhile<R, ErrIn, ErrOut, In>((_) =>
    T.as_(f(_), true)
  )
}
