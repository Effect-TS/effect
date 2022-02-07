// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import type * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * A sink that executes the provided effectful function for every element fed to it
 * until `f` evaluates to `false`.
 */
export function forEachWhile<R, ErrIn, ErrOut, In>(
  f: (_in: In) => T.Effect<R, ErrOut, boolean>
): C.Sink<R, ErrIn, In, ErrIn | ErrOut, In, void> {
  const go = (
    chunk: CK.Chunk<In>,
    idx: number,
    len: number,
    cont: CH.Channel<
      R,
      ErrIn,
      CK.Chunk<In>,
      unknown,
      ErrIn | ErrOut,
      CK.Chunk<In>,
      void
    >
  ): CH.Channel<
    R,
    ErrIn,
    CK.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    CK.Chunk<In>,
    void
  > => {
    if (idx === len) {
      return cont
    } else {
      return pipe(
        CH.fromEffect(f(CK.unsafeGet_(chunk, idx))),
        CH.chain((b) => {
          if (b) {
            return go(chunk, idx + 1, len, cont)
          } else {
            return CH.write(CK.drop_(chunk, idx))
          }
        }),
        CH.catchAll((e) => CH.zipRight_(CH.write(CK.drop_(chunk, idx)), CH.fail(e)))
      )
    }
  }

  const process: CH.Channel<
    R,
    ErrIn,
    CK.Chunk<In>,
    unknown,
    ErrIn | ErrOut,
    CK.Chunk<In>,
    void
  > = CH.readWithCause(
    (_in) => go(_in, 0, CK.size(_in), process),
    (halt) => CH.failCause(halt),
    (_) => CH.end(undefined)
  )

  return new C.Sink(process)
}
