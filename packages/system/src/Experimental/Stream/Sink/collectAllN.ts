// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as Chain from "./chain.js"
import type * as C from "./core.js"
import * as FoldUntil from "./foldUntil.js"
import * as FromEffect from "./fromEffect.js"
import * as Map from "./map.js"

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
