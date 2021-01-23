import type * as CL from "../../Clock"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

/**
 * Ends the stream if it does not produce a value after d duration.
 */
export function timeout_<R, E, O>(
  self: Stream<R, E, O>,
  d: number
): Stream<R & CL.HasClock, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("timeout", () => T.toManaged_(Ref.makeRef(false))),
      M.bind("next", () => self.proc),
      M.let("pull", ({ next, timeout }) =>
        T.chain_(timeout.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              T.timeout_(next, d),
              O.fold(
                () => T.andThen_(timeout.set(true), Pull.end),
                (a) => Pull.emitChunk(a)
              )
            )
          }
        })
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Ends the stream if it does not produce a value after d duration.
 */
export function timeout(d: number) {
  return <R, E, O>(self: Stream<R, E, O>) => timeout_(self, d)
}
