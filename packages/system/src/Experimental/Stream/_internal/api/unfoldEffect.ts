// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as UnfoldChunkEffect from "./unfoldChunkEffect.js"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldEffect<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>
): C.Stream<R, E, A> {
  return UnfoldChunkEffect.unfoldChunkEffect(s, (_) =>
    T.map_(
      f(_),
      O.map(({ tuple: [a, s] }) => Tp.tuple(CK.single(a), s))
    )
  )
}
