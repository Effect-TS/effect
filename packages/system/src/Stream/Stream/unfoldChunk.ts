// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../Collections/Immutable/Tuple/index.js"
import type * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { unfoldChunkM } from "./unfoldChunkM.js"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<A, S>(
  s: S,
  f: (s: S) => O.Option<Tp.Tuple<[A.Chunk<A>, S]>>
): Stream<unknown, never, A> {
  return unfoldChunkM(s, (s) => T.succeed(f(s)))
}
