// ets_tracing: off

import * as SplitOn from "../../_internal/api/splitOn"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Splits strings on a delimiter.
 */
export function splitOn(
  delimiter: string
): C.Pipeline<C.$R, C.$R, C.$E, C.$E, string, string> {
  return C.make((stream: S.Stream<C.$R, C.$E, string>) =>
    SplitOn.splitOn_(stream, delimiter)
  )
}
