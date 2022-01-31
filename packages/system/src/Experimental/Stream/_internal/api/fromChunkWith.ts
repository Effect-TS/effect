// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as T from "../../../../Effect"
import * as CH from "../../Channel"
import * as C from "../core.js"

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunkWith<O>(c: () => CK.Chunk<O>): C.UIO<O> {
  return new C.Stream(CH.unwrap(T.succeedWith(() => CH.writeWith(c))))
}
