// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as UnfoldChunk from "./unfoldChunk"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`
 */
export function unfold<S, A>(s: S, f: (s: S) => O.Option<Tp.Tuple<[A, S]>>): C.UIO<A> {
  return UnfoldChunk.unfoldChunk(s, (_) =>
    O.map_(f(_), ({ tuple: [a, s] }) => Tp.tuple(CK.single(a), s))
  )
}
