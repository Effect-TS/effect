import type * as A from "../../Chunk"
import type * as O from "../../Option"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { unfoldChunkM } from "./unfoldChunkM"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<S>(s: S) {
  return <A>(
    f: (s: S) => O.Option<readonly [A.Chunk<A>, S]>
  ): Stream<unknown, never, A> => unfoldChunkM(s)((s) => T.succeed(f(s)))
}
