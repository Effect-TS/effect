// ets_tracing: off

import type { Predicate } from "../../../../Function"
import * as DropWhile from "../../_internal/api/dropWhile"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Creates a pipeline that drops elements while the specified predicate
 * evaluates to true.
 */
export function dropWhile<In>(
  f: Predicate<In>
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, In, In> {
  return C.make((stream: S.Stream<C.$R, C.$E, In>) => DropWhile.dropWhile_(stream, f))
}
