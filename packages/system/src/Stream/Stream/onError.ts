import type * as C from "../../Cause"
import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import { catchAllCause_ } from "./catchAllCause"
import type { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"

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
    fromEffect(pipe(cleanup(cause), T.andThen(T.halt(cause))))
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
