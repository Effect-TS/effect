// ets_tracing: off

import * as SplitLines from "../../_internal/api/splitLines"
import type * as S from "../../_internal/core"
import * as C from "../core"

/**
 * Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
 * newlines (`\n`).
 */
export const splitLines = C.make((stream: S.Stream<C.$R, C.$E, string>) =>
  SplitLines.splitLines(stream)
)
