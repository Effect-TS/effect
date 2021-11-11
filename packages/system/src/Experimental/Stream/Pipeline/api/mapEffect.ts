// ets_tracing: off

import type * as T from "../../../../Effect"
import * as MapEffect from "../../_internal/api/mapEffect"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that maps elements with the specified effect.
 */
export function mapEffect<R1, E1, In, Out>(
  f: (in_: In) => T.Effect<R1, E1, Out>
): C.Pipeline<C.$R & R1, C.$R, E1 | C.$E, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => MapEffect.mapEffect_(stream, f))
}
