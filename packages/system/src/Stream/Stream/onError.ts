// ets_tracing: off

import type * as C from "../../Cause/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import { catchAllCause_ } from "./catchAllCause.js"
import type { Stream } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError_<R, R1, E, O, X>(
  self: Stream<R, E, O>,
  cleanup: (cause: C.Cause<E>) => T.Effect<R1, never, X>
): Stream<R & R1, E, O> {
  return catchAllCause_(self, (cause) =>
    fromEffect(pipe(cleanup(cause), T.zipRight(T.halt(cause))))
  )
}

/**
 * Runs the specified effect if this stream fails, providing the error to the effect if it exists.
 *
 * Note: Unlike `Effect.onError`, there is no guarantee that the provided effect will not be interrupted.
 */
export function onError<R, R1, E, O, X>(
  cleanup: (cause: C.Cause<E>) => T.Effect<R1, never, X>
) {
  return (self: Stream<R, E, O>) => onError_(self, cleanup)
}
