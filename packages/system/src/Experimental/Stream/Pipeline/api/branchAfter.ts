// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as BranchAfter from "../../_internal/api/branchAfter"
import type * as S from "../../_internal/core"
import * as C from "../core"

export function branchAfter<
  LowerEnv,
  UpperEnv,
  LowerErr,
  UpperErr,
  LowerElem,
  UpperElem
>(
  n: number,
  f: (
    chunk: CK.Chunk<UpperElem>
  ) => C.Pipeline<LowerEnv, UpperEnv, LowerErr, UpperErr, LowerElem, UpperElem>
): C.Pipeline<
  UpperEnv & LowerEnv,
  UpperEnv,
  LowerErr | UpperErr,
  UpperErr,
  LowerElem | UpperElem,
  UpperElem
> {
  return C.make((stream: S.Stream<UpperEnv, UpperErr, UpperElem>) =>
    BranchAfter.branchAfter_(stream, n, f)
  )
}
