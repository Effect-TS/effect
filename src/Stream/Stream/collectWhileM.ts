import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as BP from "../../Stream/BufferedPull"
import * as Pull from "../../Stream/Pull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

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
      M.bind("done", () => T.toManaged_(Ref.makeRef(false))),
      M.let("pull", ({ as, done }) =>
        T.chain_(done.get, (_) => {
          if (_) {
            return Pull.end
          } else {
            return T.chain_(
              BP.pullElement(as),
              (a): T.Effect<R & R1, O.Option<E | E1>, A.Array<O2>> =>
                O.fold_(
                  pf(a),
                  () => T.andThen_(done.set(true), Pull.end),
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
