// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as MapChunks from "../../_internal/api/mapChunks"
import type * as S from "../../_internal/core"
import * as C from "../core"

export function mapChunks<In, Out>(
  f: (in_: CK.Chunk<In>) => CK.Chunk<Out>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => MapChunks.mapChunks_(stream, f))
}
