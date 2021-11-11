// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as Concat from "../../_internal/api/concat"
import * as FromChunk from "../../_internal/api/fromChunk"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Emits the provided chunk before emitting any other value.
 */
export function prepend<In>(
  values: CK.Chunk<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) =>
    Concat.concat_(FromChunk.fromChunk(values), stream)
  )
}
