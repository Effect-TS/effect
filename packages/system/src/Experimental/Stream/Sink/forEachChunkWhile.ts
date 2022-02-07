// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that executes the provided effectful function for every chunk fed to it
 * until `f` evaluates to `false`.
 */
export function forEachChunkWhile<R, ErrIn, ErrOut, In>(
  f: (_in: CK.Chunk<In>) => T.Effect<R, ErrOut, boolean>
): C.Sink<R, ErrIn, In, ErrIn | ErrOut, unknown, void> {
  const reader: CH.Channel<
    R,
    ErrIn,
    CK.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    never,
    void
  > = CH.readWith(
    (_in) =>
      CH.chain_(CH.fromEffect(f(_in)), (continue_) =>
        continue_ ? reader : CH.end(undefined)
      ),
    (err) => CH.fail(err),
    (_) => CH.unit
  )

  return new C.Sink(reader)
}
