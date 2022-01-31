// ets_tracing: off

import type * as CS from "../../../../Cause/index.js"
import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as CatchAllCause from "./catchAllCause.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError_<R, R1, E, A>(
  self: C.Stream<R, E, A>,
  cleanup: (c: CS.Cause<E>) => T.Effect<R1, never, any>
): C.Stream<R & R1, E, A> {
  return CatchAllCause.catchAllCause_(self, (cause) =>
    FromEffect.fromEffect(T.zipRight_(cleanup(cause), T.halt(cause)))
  )
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 *
 * @ets_data_first onError_
 */
export function onError<R1, E>(cleanup: (c: CS.Cause<E>) => T.Effect<R1, never, any>) {
  return <R, A>(self: C.Stream<R, E, A>) => onError_(self, cleanup)
}
