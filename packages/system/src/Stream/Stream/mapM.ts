// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as BP from "../BufferedPull/index.js"
import { Stream } from "./definitions.js"
/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM_<O, R, R1, E, E1, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream<R & R1, E | E1, O1>(
    pipe(
      self.proc,
      M.mapM(BP.make),
      M.map((pull) =>
        pipe(
          pull,
          BP.pullElement,
          T.chain((o) =>
            pipe(
              f(o),
              T.bimap(O.some, (o1) => A.single(o1))
            )
          )
        )
      )
    )
  )
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM<O, R1, E1, O1>(f: (o: O) => T.Effect<R1, E1, O1>) {
  return <R, E>(self: Stream<R, E, O>): Stream<R & R1, E | E1, O1> => mapM_(self, f)
}
