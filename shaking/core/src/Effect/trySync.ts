import type { Lazy } from "../Function"
import type { SyncE } from "../Support/Common/effect"

import { pure } from "./pure"
import { raiseError } from "./raiseError"
import { suspended } from "./suspended"

export function trySync<A = unknown>(thunk: Lazy<A>): SyncE<unknown, A> {
  return suspended(() => {
    try {
      return pure(thunk())
    } catch (e) {
      return raiseError(e)
    }
  })
}
