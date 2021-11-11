// ets_tracing: off

import type * as O from "../../../../Option"
import * as Collect from "../../_internal/api/collect"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that collects elements with the specified partial
 * function.
 */
export function collect<In, Out>(
  f: (in_: In) => O.Option<Out>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, Out, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => Collect.collect_(stream, f))
}
