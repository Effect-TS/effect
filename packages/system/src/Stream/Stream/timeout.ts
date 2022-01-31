// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

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
      M.bind("timeout", () => T.toManaged(Ref.makeRef(false))),
      M.bind("next", () => self.proc),
      M.let("pull", ({ next, timeout }) =>
        T.chain_(timeout.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              T.timeout_(next, d),
              O.fold(
                () => T.zipRight_(timeout.set(true), Pull.end),
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
