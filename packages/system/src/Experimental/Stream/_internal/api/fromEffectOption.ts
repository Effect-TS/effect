// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, A>
): C.Stream<R, E, A> {
  return new C.Stream(
    CH.unwrap(
      T.fold_(
        fa,
        O.fold(
          () => CH.end(undefined),
          (e) => CH.fail(e)
        ),
        (a) => CH.write(CK.single(a))
      )
    )
  )
}
