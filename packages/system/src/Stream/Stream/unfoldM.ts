// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { unfoldChunkM } from "./unfoldChunkM.js"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<R, E, A, S>(
  s: S,
  f: (s: S) => T.Effect<R, E, O.Option<Tp.Tuple<[A, S]>>>
): Stream<R, E, A> {
  return unfoldChunkM(s, (_) =>
    T.map_(
      f(_),
      O.map(({ tuple: [a, s] }) => Tp.tuple(A.single(a), s))
    )
  )
}
