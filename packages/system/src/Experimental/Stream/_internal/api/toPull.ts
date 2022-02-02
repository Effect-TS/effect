// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as E from "../../../../Either"
import * as M from "../../../../Managed"
import * as O from "../../../../Option"
import * as CH from "../../Channel"
import type * as C from "../core"

/**
 * Interpret the stream as a managed pull
 */
export function toPull<R, E, A>(
  self: C.Stream<R, E, A>
): M.RIO<R, T.Effect<R, O.Option<E>, CK.Chunk<A>>> {
  return M.map_(CH.toPull(self.channel), (pull) =>
    T.chain_(
      T.mapError_(pull, O.some),
      E.fold(
        () => T.fail(O.none),
        (elem) => T.succeed(elem)
      )
    )
  )
}
