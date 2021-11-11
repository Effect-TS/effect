// ets_tracing: off

import type * as T from "../../../../Effect"
import * as ScanEffect from "../../_internal/api/scanEffect"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that scans elements with the specified function.
 */
export function scanEffect<R1, E1, In, Out>(
  s: Out,
  f: (out: Out, in_: In) => T.Effect<R1, E1, Out>
): C.Pipeline<C.$R & R1, C.$R, C.$E | E1, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) =>
    ScanEffect.scanEffect_(stream, s, f)
  )
}
