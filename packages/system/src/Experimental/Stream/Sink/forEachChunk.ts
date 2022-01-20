// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk/core"
import type * as T from "../../../Effect"
import * as CH from "../Channel"
import * as SK from "../Sink/core"
import type * as C from "./core"

/**
 * A sink that executes the provided effectful function for every chunk fed to it.
 */
export function forEachChunk<R, ErrIn, Err, In, Z>(
  f: (c: CK.Chunk<In>) => T.Effect<R, Err, Z>
): C.Sink<R, ErrIn, In, ErrIn | Err, unknown, void> {
  const process: CH.Channel<
    R,
    ErrIn,
    CK.Chunk<In>,
    unknown,
    ErrIn | Err,
    never,
    void
  > = CH.readWithCause(
    (in_) => CH.zipRight_(CH.fromEffect(f(in_)), process),
    (halt) => CH.failCause(halt),
    (_) => CH.end(undefined)
  )

  return new SK.Sink(process)
}
