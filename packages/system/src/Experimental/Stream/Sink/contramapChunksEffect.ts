// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 */
export function contramapChunksEffect_<
  R,
  R1,
  InErr,
  InErr1 extends InErr,
  In,
  In1,
  OutErr,
  L,
  Z
>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>,
  f: (c: CK.Chunk<In1>) => T.Effect<R1, InErr1, CK.Chunk<In>>
): C.Sink<R1 & R, InErr & InErr1, In1, OutErr, L, Z> {
  const loop: CH.Channel<
    R1,
    InErr & InErr1,
    CK.Chunk<In1>,
    unknown,
    InErr1,
    CK.Chunk<In>,
    any
  > = CH.readWith(
    (chunk) => CH.zipRight_(CH.chain_(CH.fromEffect(f(chunk)), CH.write), loop),
    (_) => CH.fail(_),
    (_) => CH.succeed(_)
  )

  return new C.Sink(loop[">>>"](self.channel))
}

/**
 * Effectfully transforms this sink's input chunks.
 * `f` must preserve chunking-invariance
 *
 * @ets_data_first contramapChunksEffect_
 */
export function contramapChunksEffect<R1, In, InErr, InErr1 extends InErr, In1>(
  f: (c: CK.Chunk<In1>) => T.Effect<R1, InErr1, CK.Chunk<In>>
) {
  return <R, OutErr, L, Z>(self: C.Sink<R, InErr, In, OutErr, L, Z>) =>
    contramapChunksEffect_(self, f)
}
