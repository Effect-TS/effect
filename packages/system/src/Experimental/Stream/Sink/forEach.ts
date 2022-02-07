// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/core.js"
import * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as SK from "../Sink/core.js"
import type * as C from "./core.js"

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export function forEach<R, ErrIn, Err, In, B>(
  f: (_in: In) => T.Effect<R, Err, B>
): C.Sink<R, ErrIn, In, ErrIn | Err, unknown, void> {
  const process: CH.Channel<
    R,
    ErrIn,
    CK.Chunk<In>,
    unknown,
    Err | ErrIn,
    never,
    void
  > = CH.readWithCause(
    (in_) => CH.zipRight_(CH.fromEffect(T.forEachUnit_(in_, f)), process),
    (halt) => CH.failCause(halt),
    (_) => CH.end(undefined)
  )

  return new SK.Sink(process)
}
