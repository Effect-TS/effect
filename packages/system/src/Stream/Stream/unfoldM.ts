// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

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
