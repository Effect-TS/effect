// ets_tracing: off

import type * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as Managed from "./managed"

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
