// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import * as C from "../core.js"

export const never: C.Channel<unknown, unknown, unknown, unknown, never, never, never> =
  C.fromEffect(T.never)
