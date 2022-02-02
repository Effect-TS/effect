// ets_tracing: off

import * as T from "../../../../Effect"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"

export const never: C.UIO<never> = FromEffect.fromEffect(T.never)
