// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as M from "../../../../Managed/index.js"
import * as P from "../../../../Promise/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as CrossRight from "./crossRight.js"
import * as FromEffect from "./fromEffect.js"
import * as InterruptWhenP from "./interruptWhenP.js"
import * as Managed from "./managed.js"
import * as RunForEachManaged from "./runForEachManaged.js"

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 */
export function drainFork_<R, R1, E, E1, A, Z>(
  self: C.Stream<R, E, A>,
  other: C.Stream<R1, E1, Z>
): C.Stream<R & R1, E | E1, A> {
  return Chain.chain_(FromEffect.fromEffect(P.make<E1, never>()), (bgDied) =>
    CrossRight.crossRight_(
      Managed.managed(
        pipe(
          RunForEachManaged.runForEachManaged_(other, (_) => T.unit),
          M.catchAllCause((_) => T.toManaged(P.halt_(bgDied, _))),
          M.fork
        )
      ),
      InterruptWhenP.interruptWhenP_(self, bgDied)
    )
  )
}

/**
 * Drains the provided stream in the background for as long as this stream is running.
 * If this stream ends before `other`, `other` will be interrupted. If `other` fails,
 * this stream will fail with that error.
 *
 * @ets_data_first drainFork_
 */
export function drainFork<R1, E1, A, Z>(other: C.Stream<R1, E1, Z>) {
  return <R, E>(self: C.Stream<R, E, A>) => drainFork_(self, other)
}
