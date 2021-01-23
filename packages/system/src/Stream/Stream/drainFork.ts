import * as P from "../../Promise"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { chain_ } from "./chain"
import { crossRight_ } from "./crossRight"
import type { Stream } from "./definitions"
import { foreachManaged_ } from "./foreachManaged"
import { fromEffect } from "./fromEffect"
import { interruptWhenP_ } from "./interruptWhenP"
import { managed } from "./managed"

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  other: Stream<R1, E1, any>
): Stream<R1 & R, E | E1, O> {
  return chain_(fromEffect(P.make<E1, never>()), (bgDied) =>
    crossRight_(
      managed(
        M.fork(
          M.catchAllCause_(
            foreachManaged_(other, (_) => T.unit),
            (_) => T.toManaged_(P.halt_(bgDied, _))
          )
        )
      ),
      interruptWhenP_(self, bgDied)
    )
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork<R1, E1>(other: Stream<R1, E1, any>) {
  return <R, E, O>(self: Stream<R, E, O>) => drainFork_(self, other)
}
