import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import type { Finalizer } from "../../Managed"
import { noopFinalizer } from "../../Managed"
import type * as Option from "../../Option"
import * as Ref from "../../Ref"
import * as Pull from "../Pull"
import { Chain, Stream } from "./definitions"

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export const chain = <O, O2, R1, E1>(f0: (a: O) => Stream<R1, E1, O2>) => <R, E>(
  self: Stream<R, E, O>
): Stream<R & R1, E | E1, O2> => {
  type R_ = R & R1
  type E_ = E | E1

  return new Stream<R_, E_, O2>(
    pipe(
      M.do,
      M.bind("outerStream", () => self.proc),
      M.bind("currOuterChunk", () =>
        T.toManaged()(
          Ref.makeRef<[A.Array<O>, number]>([[], 0])
        )
      ),
      M.bind("currInnerStream", () =>
        T.toManaged()(
          Ref.makeRef<T.Effect<R_, Option.Option<E_>, A.Array<O2>>>(Pull.end)
        )
      ),
      M.bind(
        "innerFinalizer",
        () => M.finalizerRef(noopFinalizer) as M.Managed<R_, never, Ref.Ref<Finalizer>>
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
