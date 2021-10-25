// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import type * as M from "../../../../Managed"
import * as ReleaseMap from "../../../../Managed/ReleaseMap"
import * as C from "../core"
import * as ConcatMap from "./concatMap"

/**
 * Use a managed to emit an output element
 */
export function managedOut<R, E, A>(
  self: M.Managed<R, E, A>
): C.Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return ConcatMap.concatMap_(
    C.acquireReleaseOutExitWith_(ReleaseMap.makeReleaseMap, (rm, ex) =>
      ReleaseMap.releaseAll(ex, T.sequential)(rm)
    ),
    (rm) =>
      C.chain_(
        C.fromEffect(
          T.map_(
            T.provideSome_(self.effect, (r: R) => Tp.tuple(r, rm)),
            Tp.get(1)
          )
        ),
        C.write
      )
  )
}
