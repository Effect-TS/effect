// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function effect<R, E, A>(self: T.Effect<R, E, A>): C.Stream<R, E, A> {
  return new C.Stream(CH.unwrap(T.fold_(self, CH.fail, (x) => CH.write(CK.single(x)))))
}
