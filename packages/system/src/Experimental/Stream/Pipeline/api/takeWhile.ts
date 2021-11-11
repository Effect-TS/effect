// ets_tracing: off

import type { Predicate } from "../../../../Function"
import * as TakeWhile from "../../_internal/api/takeWhile"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that takes elements while the specified predicate
 * evaluates to true.
 */
export function takeWhile<In>(
  f: Predicate<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => TakeWhile.takeWhile_(stream, f))
}
