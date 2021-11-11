// ets_tracing: off

import * as Map from "../../_internal/api/map"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that maps elements with the specified function.
 */
export function map<In, Out>(
  f: (in_: In) => Out
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => Map.map_(stream, f))
}
