// ets_tracing: off

import * as MapError from "../../_internal/api/mapError"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that maps elements with the specified function.
 */
export function mapError<InError, OutError>(
  f: (in_: InError) => OutError
): C.Pipeline<C.$R, C.$R, OutError, InError, C.$A, C.$A> {
  return C.make((stream: S.Stream<C.$R, InError, C.$A>) =>
    MapError.mapError_(stream, f)
  )
}
