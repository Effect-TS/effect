// tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import type * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as BP from "../BufferedPull"
import { Stream } from "./definitions"

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 *
 * @dataFirst mapAccumM_
 */
export function mapAccumM<Z, O, R1, E1, O1>(
  z: Z,
  f: (z: Z, o: O) => T.Effect<R1, E1, Tp.Tuple<[Z, O1]>>
) {
  return <R, E>(self: Stream<R, E, O>) => mapAccumM_(self, z, f)
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM_<R, E, Z, O, R1, E1, O1>(
  self: Stream<R, E, O>,
  z: Z,
  f: (z: Z, o: O) => T.Effect<R1, E1, Tp.Tuple<[Z, O1]>>
) {
  return new Stream<R & R1, E | E1, O1>(
    pipe(
      M.do,
      M.bind("state", () => Ref.makeManagedRef(z)),
      M.bind("pull", () => pipe(self.proc, M.mapM(BP.make))),
      M.map(({ pull, state }) =>
        pipe(
          pull,
          BP.pullElement,
          T.chain((o) =>
            pipe(
              T.do,
              T.bind("s", () => state.get),
              T.bind("t", ({ s }) => f(s, o)),
              T.tap(({ t }) => state.set(t.get(0))),
              T.map(({ t }) => A.single(t.get(1))),
              T.mapError(O.some)
            )
          )
        )
      )
    )
  )
}
