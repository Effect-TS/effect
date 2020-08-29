import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import type { Finalizer } from "../../Managed"
import { noop } from "../../Managed"
import * as O from "../../Option"
import * as R from "../../Ref"
import * as Pull from "../Pull"
import { Chain, Stream } from "./definitions"

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export const chain = <O, O2, S1, R1, E1>(f0: (a: O) => Stream<S1, R1, E1, O2>) => <
  S,
  R,
  E
>(
  self: Stream<S, R, E, O>
): Stream<S | S1, R & R1, E | E1, O2> => {
  type S_ = S | S1
  type R_ = R & R1
  type E_ = E | E1

  return new Stream<S_, R_, E_, O2>(
    pipe(
      M.of,
      M.bind("outerStream", () => self.proc),
      M.bind("currOuterChunk", () =>
        T.toManaged()(
          R.makeRef<[A.Array<O>, number]>([[], 0])
        )
      ),
      M.bind("currInnerStream", () =>
        T.toManaged()(R.makeRef<T.Effect<S_, R_, O.Option<E_>, A.Array<O2>>>(Pull.end))
      ),
      M.bind(
        "innerFinalizer",
        () => M.finalizerRef(noop) as M.Managed<S_, R_, never, R.Ref<Finalizer>>
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
