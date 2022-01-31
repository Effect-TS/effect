// ets_tracing: off

import type * as C from "../../Cause/index.js"
import type * as CL from "../../Clock/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

/**
 * Halts the stream with given cause if it does not produce a value after d duration.
 */
export function timeoutErrorCause<E1>(cause: C.Cause<E1>) {
  return (d: number) =>
    <R, E, O>(self: Stream<R, E, O>): Stream<R & CL.HasClock, E1 | E, O> =>
      new Stream(
        M.map_(
          self.proc,
          (next): T.Effect<R & CL.HasClock, O.Option<E | E1>, A.Chunk<O>> =>
            T.chain_(
              T.timeout_(next, d),
              O.fold(
                () => Pull.halt(cause),
                (a) => Pull.emitChunk(a)
              )
            )
        )
      )
}
