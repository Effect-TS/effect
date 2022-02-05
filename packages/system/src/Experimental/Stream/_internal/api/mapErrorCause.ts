// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  f: (c: CS.Cause<E>) => CS.Cause<E1>
): C.Stream<R, E1, A> {
  return new C.Stream(CH.mapErrorCause_(self.channel, f))
}

/**
 * Transforms the full causes of failures emitted by this stream.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E1>(f: (c: CS.Cause<E>) => CS.Cause<E1>) {
  return <R, A>(self: C.Stream<R, E, A>) => mapErrorCause_(self, f)
}
