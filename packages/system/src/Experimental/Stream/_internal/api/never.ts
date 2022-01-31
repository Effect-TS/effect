// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"

export const never: C.UIO<never> = FromEffect.fromEffect(T.never)
