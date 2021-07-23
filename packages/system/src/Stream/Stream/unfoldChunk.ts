// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk"
import type * as Tp from "../../Collections/Immutable/Tuple"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<A, S>(
  s: S,
  f: (s: S) => O.Option<Tp.Tuple<[A.Chunk<A>, S]>>
): Stream<unknown, never, A> {
  return unfoldChunkM(s, (s) => T.succeed(f(s)))
}
