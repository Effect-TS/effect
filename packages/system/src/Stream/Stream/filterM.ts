// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as O from "../../Option/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import type * as Pull from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM_<R, R1, E, E1, O>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, boolean>
): Stream<R & R1, E | E1, O> {
  return new Stream(
    M.map_(M.mapM_(self.proc, BP.make), (os) => {
      const pull: Pull.Pull<R & R1, E | E1, O> = T.chain_(BP.pullElement(os), (o) =>
        T.chain_(
          T.mapError_(f(o), (v) => O.some(v)),
          (_) => {
            if (_) {
              return T.succeed(A.single(o))
            } else {
              return pull
            }
          }
        )
      )

      return pull
    })
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM<R1, E1, O>(f: (o: O) => T.Effect<R1, E1, boolean>) {
  return <R, E>(self: Stream<R, E, O>) => filterM_(self, f)
}
