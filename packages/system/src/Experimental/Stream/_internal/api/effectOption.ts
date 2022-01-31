// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function effectOption<R, E, A>(
  self: T.Effect<R, O.Option<E>, A>
): C.Stream<R, E, A> {
  return new C.Stream(
    CH.unwrap(
      T.fold_(
        self,
        O.fold(() => CH.unit, CH.fail),
        (x) => CH.write(CK.single(x))
      )
    )
  )
}
