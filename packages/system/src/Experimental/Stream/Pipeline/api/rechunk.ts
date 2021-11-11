// ets_tracing: off

import * as Rechunk from "../../_internal/api/rechunk"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * A pipeline that rechunks the stream into chunks of the specified size.
 */
export function rechunk(n: number): C.Pipeline<C.$R, C.$R, C.$E, C.$E, C.$A, C.$A> {
  return C.make((stream: S.Stream<C.$R, C.$E, C.$A>) => Rechunk.rechunk_(stream, n))
}
