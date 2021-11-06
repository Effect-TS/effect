// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import type * as M from "../../../../Managed"
import * as ReleaseMap from "../../../../Managed/ReleaseMap"
import * as C from "../core"
import * as MapOut from "./mapOut"

/**
 * Use a managed to emit an output element
 */
export function managedOut<R, E, A>(
  self: M.Managed<R, E, A>
): C.Channel<R, unknown, unknown, unknown, E, A, unknown> {
  return MapOut.mapOut_(
    C.acquireReleaseOutExitWith_(
      T.chain_(ReleaseMap.makeReleaseMap, (releaseMap) =>
        T.map_(
          T.provideSome_(self.effect, (_: R) => Tp.tuple(_, releaseMap)),
          ({ tuple: [_, out] }) => Tp.tuple(out, releaseMap)
        )
      ),
      ({ tuple: [_, releaseMap] }, exit) =>
        ReleaseMap.releaseAll(exit, T.sequential)(releaseMap)
    ),
    Tp.get(0)
  )
}
