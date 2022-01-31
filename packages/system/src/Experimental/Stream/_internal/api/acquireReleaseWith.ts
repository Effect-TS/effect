// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as Managed from "./managed.js"

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function acquireReleaseWith_<R, E, A, Z>(
  acquire: T.Effect<R, E, A>,
  release: (a: A) => T.RIO<R, Z>
): C.Stream<R, E, A> {
  return Managed.managed(M.make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 *
 * @ets_data_first acquireReleaseWith_
 */
export function acquireReleaseWith<R, A, Z>(release: (a: A) => T.RIO<R, Z>) {
  return <E>(acquire: T.Effect<R, E, A>) => acquireReleaseWith_(acquire, release)
}
