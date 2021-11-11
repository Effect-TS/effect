// ets_tracing: off

import type * as S from "../../_internal/core"
import * as C from "../core"

export const identity = C.make((stream: S.Stream<C.$R, C.$E, C.$A>) => stream)
