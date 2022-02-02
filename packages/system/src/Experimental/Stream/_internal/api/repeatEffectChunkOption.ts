// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as UnfoldChunkEffect from "./unfoldChunkEffect"

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(
  fa: T.Effect<R, O.Option<E>, CK.Chunk<A>>
): C.Stream<R, E, A> {
  return UnfoldChunkEffect.unfoldChunkEffect(fa, (fa) => {
    return T.catchAll_(
      T.map_(fa, (chunk) => O.some(Tp.tuple(chunk, fa))),
      O.fold(
        () => T.none,
        (e) => T.fail(e)
      )
    )
  })
}
