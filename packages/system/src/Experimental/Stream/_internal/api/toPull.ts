// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as M from "../../../../Managed/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import type * as C from "../core.js"

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
