// ets_tracing: off

import type { Predicate } from "../../../../Function"
import * as Filter from "../../_internal/api/filter"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that filters elements according to the specified
 * predicate.
 */
export function filter<In>(
  f: Predicate<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => Filter.filter_(stream, f))
}
