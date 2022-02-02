// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as C from "../core.js"

export function acquireReleaseOutWith_<Env, OutErr, Acquired, Z>(
  acquire: T.Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => T.RIO<Env, Z>
): C.Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return C.acquireReleaseOutExitWith_(acquire, (z, _) => release(z))
}

/**
 * @ets_data_first acquireReleaseOutWith_
 */
export function acquireReleaseOutWith<Env, Acquired, Z>(
  release: (a: Acquired) => T.RIO<Env, Z>
) {
  return <OutErr>(acquire: T.Effect<Env, OutErr, Acquired>) =>
    acquireReleaseOutWith_(acquire, release)
}
