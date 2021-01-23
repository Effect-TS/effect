import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  io: T.Effect<R1, E1, any>
): Stream<R1 & R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => self.proc),
      M.bind("runIO", () => T.forkManaged(io)),
      M.map(({ as, runIO }) =>
        T.chain_(
          runIO.poll,
          O.fold(
            () => as,
            Ex.fold(
              (cause) => Pull.halt<E | E1>(cause),
              (_) => Pull.end
            )
          )
        )
      )
    )
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen<R1, E1>(io: T.Effect<R1, E1, any>) {
  return <R, E, O>(self: Stream<R, E, O>) => haltWhen_(self, io)
}
