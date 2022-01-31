// ets_tracing: off

import * as P from "../../Promise/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as chain from "./chain.js"
import * as crossRight from "./crossRight.js"
import type { Stream } from "./definitions.js"
import * as forEach from "./forEach.js"
import * as fromEffect from "./fromEffect.js"
import * as interruptWhenP from "./interruptWhenP.js"
import { managed } from "./managed.js"

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork_<R, R1, E, E1, O, X>(
  self: Stream<R, E, O>,
  other: Stream<R1, E1, X>
): Stream<R1 & R, E | E1, O> {
  return chain.chain_(fromEffect.fromEffect(P.make<E1, never>()), (bgDied) =>
    crossRight.crossRight_(
      managed(
        M.fork(
          M.catchAllCause_(
            forEach.forEachManaged_(other, (_) => T.unit),
            (_) => T.toManaged(P.halt_(bgDied, _))
          )
        )
      ),
      interruptWhenP.interruptWhenP_(self, bgDied)
    )
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork<R1, E1, X>(other: Stream<R1, E1, X>) {
  return <R, E, O>(self: Stream<R, E, O>) => drainFork_(self, other)
}
