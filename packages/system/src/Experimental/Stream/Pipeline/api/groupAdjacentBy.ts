// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as Tp from "../../../../Collections/Immutable/Tuple"
import * as GroupAdjacentBy from "../../_internal/api/groupAdjacentBy"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that groups on adjacent keys, calculated by the
 * specified keying function.
 */
export function groupdAdjacentBy<In, Key>(
  f: (in_: In) => Key
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, Tp.Tuple<[Key, CK.Chunk<In>]>, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) =>
    GroupAdjacentBy.groupAdjacentBy_(stream, f)
  )
}
