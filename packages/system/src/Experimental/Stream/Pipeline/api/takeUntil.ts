// ets_tracing: off

import type { Predicate } from "../../../../Function"
import * as TakeUntil from "../../_internal/api/takeUntil"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that takes elements until the specified predicate
 * evaluates to true.
 */
export function takeUntil<In>(
  f: Predicate<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => TakeUntil.takeUntil_(stream, f))
}
