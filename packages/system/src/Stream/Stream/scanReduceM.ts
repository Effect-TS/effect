import * as A from "../../Chunk"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as BP from "../BufferedPull"
import { Stream } from "./definitions"

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanM`.
 */
export function scanReduceM_<R, R1, E, E1, O, O1 extends O>(
  self: Stream<R, E, O>,
  f: (o1: O1, o: O) => T.Effect<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("state", () => Ref.makeManagedRef<O.Option<O1>>(O.none)),
      M.bind("pull", () => M.mapM_(self.proc, (_) => BP.make(_))),
      M.map(({ pull, state }) =>
        T.chain_(BP.pullElement(pull), (curr) =>
          T.chain_(
            state.get,
            O.fold(
              (): T.Effect<R1, O.Option<E | E1>, A.Chunk<O1>> =>
                T.as_(state.set(O.some(curr as O1)), A.single(curr as O1)),
              (s) =>
                pipe(
                  f(s, curr),
                  T.tap((o) => state.set(O.some(o))),
                  T.map(A.single),
                  T.asSomeError
                )
            )
          )
        )
      )
    )
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * See also `Stream#scanM`.
 */
export function scanReduceM<R1, E1, O, O1 extends O>(
  f: (o1: O1, o: O) => T.Effect<R1, E1, O1>
) {
  return <R, E>(self: Stream<R, E, O>) => scanReduceM_(self, f)
}
