// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import * as T from "../../../Effect"
import { pipe } from "../../../Function"
import * as Chain from "./chain"
import type * as C from "./core"
import * as FoldUntil from "./foldUntil"
import * as FromEffect from "./fromEffect"
import * as Map from "./map"

/**
 * A sink that collects first `n` elements into a chunk. Note that the chunk
 * is preallocated and must fit in memory.
 */
export function collectAllN<Err, In>(
  n: number
): C.Sink<unknown, Err, In, Err, In, CK.Chunk<In>> {
  return pipe(
    FromEffect.fromEffect(T.succeedWith(() => CK.builder<In>())),
    Chain.chain((cb) =>
      FoldUntil.foldUntil<Err, In, CK.ChunkBuilder<In>>(cb, n, (s, in_) =>
        s.append(in_)
      )
    ),
    Map.map((_) => _.build())
  )
}
