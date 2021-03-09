import * as P from "../../Promise"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as chain from "./chain"
import * as crossRight from "./crossRight"
import type { Stream } from "./definitions"
import * as forEach from "./forEach"
import * as fromEffect from "./fromEffect"
import * as interruptWhenP from "./interruptWhenP"
import { managed } from "./managed"

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
            (_) => T.toManaged_(P.halt_(bgDied, _))
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
