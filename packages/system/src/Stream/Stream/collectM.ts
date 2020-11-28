import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as BP from "../BufferedPull"
import { Stream } from "./definitions"

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectM_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => O.Option<T.Effect<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    pipe(
      M.do,
      M.bind("as", () => M.mapM_(self.proc, BP.make)),
      M.let("pull", ({ as }) => {
        const go: T.Effect<R & R1, O.Option<E | E1>, A.Array<O1>> = T.chain_(
          BP.pullElement(as),
          (o) =>
            O.fold_(
              f(o),
              () => go,
              (v) => T.bimap_(v, O.some, A.single)
            )
        )

        return go
      }),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectM<R1, E1, O, O1>(f: (o: O) => O.Option<T.Effect<R1, E1, O1>>) {
  return <R, E>(self: Stream<R, E, O>) => collectM_(self, f)
}
