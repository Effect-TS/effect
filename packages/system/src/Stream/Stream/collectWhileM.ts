// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import * as Pull from "../../Stream/Pull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  pf: (o: O) => O.Option<T.Effect<R1, E1, O2>>
): Stream<R & R1, E | E1, O2> {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => M.mapM_(self.proc, BP.make)),
      M.bind("done", () => T.toManaged(Ref.makeRef(false))),
      M.let("pull", ({ as, done }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              BP.pullElement(as),
              (a): T.Effect<R & R1, O.Option<E | E1>, A.Chunk<O2>> =>
                O.fold_(
                  pf(a),
                  () => T.zipRight_(done.set(true), Pull.end),
                  (v) => T.bimap_(v, O.some, A.single)
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
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM<R1, E1, O, O2>(
  pf: (o: O) => O.Option<T.Effect<R1, E1, O2>>
) {
  return <R, E>(self: Stream<R, E, O>) => collectWhileM_(self, pf)
}
