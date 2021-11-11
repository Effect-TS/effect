// ets_tracing: off

import type { Predicate } from "../../../../Function"
import * as DropUntil from "../../_internal/api/dropUntil"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that drops elements until the specified predicate
 * evaluates to true.
 */
export function dropUntil<In>(
  f: Predicate<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => DropUntil.dropUntil_(stream, f))
}
