// ets_tracing: off

import type * as T from "../../Effect/index.js"

export interface Restorable {
  readonly save: T.UIO<T.UIO<void>>
}
