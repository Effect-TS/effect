// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunks_<R, InErr, In, In1, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (c: CK.Chunk<In1>) => CK.Chunk<In>
): C.Sink<R, InErr, In1, OutErr, L, Z> {
  const loop: CH.Channel<
    R,
    InErr,
    CK.Chunk<In1>,
    unknown,
    InErr,
    CK.Chunk<In>,
    any
  > = CH.readWith(
    (chunk) => CH.zipRight_(CH.write(f(chunk)), loop),
    (_) => CH.fail(_),
    (_) => CH.succeed(_)
  )

  return new C.Sink(loop[">>>"](self.channel))
}

/**
 * Transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 *
 * @ets_data_first contramapChunks_
 */
export function contramapChunks<In, In1>(f: (c: CK.Chunk<In1>) => CK.Chunk<In>) {
  return <R, InErr, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapChunks_(self, f)
}
