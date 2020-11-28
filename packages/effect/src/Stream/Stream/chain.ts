import type * as A from "../../Array"
import { pipe } from "../../Function"
import * as RM from "../../Managed/ReleaseMap"
import type * as Option from "../../Option"
import * as Ref from "../../Ref"
import type * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import { Chain, Stream } from "./definitions"

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  f0: (a: O) => Stream<R1, E1, O2>
): Stream<R & R1, E | E1, O2> {
  type R_ = R & R1
  type E_ = E | E1

  return new Stream<R_, E_, O2>(
    pipe(
      M.do,
      M.bind("outerStream", () => self.proc),
      M.bind("currOuterChunk", () =>
        M.fromEffect(
          Ref.makeRef<[A.Array<O>, number]>([[], 0])
        )
      ),
      M.bind("currInnerStream", () =>
        M.fromEffect(
          Ref.makeRef<T.Effect<R_, Option.Option<E_>, A.Array<O2>>>(Pull.end)
        )
      ),
      M.bind(
        "innerFinalizer",
        () =>
          M.finalizerRef(RM.noopFinalizer) as M.Managed<
            R_,
            never,
            Ref.Ref<RM.Finalizer>
          >
      ),
      M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
        new Chain(
          f0,
          outerStream,
          currOuterChunk,
          currInnerStream,
          innerFinalizer
        ).apply()
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain<O, O2, R1, E1>(f0: (a: O) => Stream<R1, E1, O2>) {
  return <R, E>(self: Stream<R, E, O>) => chain_(self, f0)
}
