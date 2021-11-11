// ets_tracing: off

import * as T from "../../../../Effect"
import * as ScanEffect from "../../_internal/api/scanEffect"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that scans elements with the specified function.
 */
export function scan<In, Out>(
  s: Out,
  f: (out: Out, in_: In) => Out
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) =>
    ScanEffect.scanEffect_(stream, s, (out, in_) => T.succeed(f(out, in_)))
  )
}
