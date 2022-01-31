// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as Ex from "../../../../Exit/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as Managed from "./managed.js"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function acquireReleaseExitWith_<R, E, A, Z>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: Ex.Exit<any, any>) => T.RIO<R, Z>
): C.Stream<R, E, A> {
  return Managed.managed(M.makeExit_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @ets_data_first acquireReleaseExitWith_
 */
export function acquireReleaseExitWith<R, A, Z>(
  release: (a: A, exit: Ex.Exit<any, any>) => T.RIO<R, Z>
) {
  return <E>(acquire: T.Effect<R, E, A>) => acquireReleaseExitWith_(acquire, release)
}
