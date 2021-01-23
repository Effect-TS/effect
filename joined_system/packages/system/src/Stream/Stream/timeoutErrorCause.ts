import type * as C from "../../Cause"
import type * as A from "../../Chunk"
import type * as CL from "../../Clock"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Halts the stream with given cause if it does not produce a value after d duration.
 */
export function timeoutErrorCause<E1>(cause: C.Cause<E1>) {
  return (d: number) => <R, E, O>(
    self: Stream<R, E, O>
  ): Stream<R & CL.HasClock, E1 | E, O> =>
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
