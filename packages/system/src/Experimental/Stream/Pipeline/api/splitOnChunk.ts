// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as SplitOnChunk from "../../_internal/api/splitOnChunk"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Splits strings on a delimiter.
 */
export function splitOnChunk<A>(
  delimiter: CK.Chunk<A>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, CK.Chunk<A>, A> {
  return C.make((stream: S.Stream<C.$R, C.$E, A>) =>
    SplitOnChunk.splitOnChunk_(stream, delimiter)
  )
}
