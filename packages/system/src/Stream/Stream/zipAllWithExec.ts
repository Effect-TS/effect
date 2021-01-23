import * as C from "../../Cause"
import * as A from "../../Chunk"
import * as E from "../../Either"
import * as Ex from "../../Exit"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import { zipChunks_ } from "../_internal/utils"
import { combineChunks_ } from "./combineChunks"
import type { Stream } from "./definitions"

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 */
export function zipAllWithExec<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return (exec: T.ExecutionStrategy) => <O3>(
    left: (o: O) => O3,
    right: (o2: O2) => O3
  ) => (both: (o: O, o2: O2) => O3): Stream<R & R1, E | E1, O3> => {
    class Running {
      readonly _tag = "Running"
    }
    class LeftDone {
      readonly _tag = "LeftDone"
    }
    class RightDone {
      readonly _tag = "RightDone"
    }
    class End {
      readonly _tag = "End"
    }
    type Status = Running | LeftDone | RightDone | End
    type State = readonly [Status, E.Either<A.Chunk<O>, A.Chunk<O2>>]

    const handleSuccess = (
      maybeO: O.Option<A.Chunk<O>>,
      maybeO2: O.Option<A.Chunk<O2>>,
      excess: E.Either<A.Chunk<O>, A.Chunk<O2>>
    ): Ex.Exit<never, readonly [A.Chunk<O3>, State]> => {
      const [excessL, excessR] = E.fold_(
        excess,
        (l) => [l, A.empty] as const,
        (r) => [A.empty, r] as const
      )
      const chunkL = O.fold_(
        maybeO,
        () => excessL,
        (upd) => A.concat_(excessL, upd)
      )
      const chunkR = O.fold_(
        maybeO2,
        () => excessR,
        (upd) => A.concat_(excessR, upd)
      )
      const [emit, newExcess] = zipChunks_(chunkL, chunkR, both)
      const [fullEmit, status] = ((oDefined, o2Defined) => {
        if (oDefined && o2Defined) {
          return [emit, new Running()] as const
        }
        if (!oDefined && !o2Defined) {
          const leftover = E.fold_(newExcess, A.map(left), A.map(right))

          return [A.concat_(emit, leftover), new End()] as const
        }
        if (!oDefined && o2Defined) {
          return [emit, new LeftDone()] as const
        }

        return [emit, new RightDone()] as const
      })(O.isSome(maybeO), O.isSome(maybeO2))

      return Ex.succeed([fullEmit, [status, newExcess] as const] as const)
    }

    return combineChunks_(
      self,
      that,
      [new Running(), E.left(A.empty)] as State,
      ([state, excess], pullL, pullR) => {
        switch (state._tag) {
          case "Running": {
            if (exec._tag === "Sequential") {
              return pipe(
                T.optional(pullL),
                T.zipWith(T.optional(pullR), (a, b) => handleSuccess(a, b, excess)),
                T.catchAllCause((e) => T.succeed(Ex.halt(C.map_(e, O.some))))
              )
            } else {
              return pipe(
                T.optional(pullL),
                T.zipWithPar(T.optional(pullR), (a, b) => handleSuccess(a, b, excess)),
                T.catchAllCause((e) => T.succeed(Ex.halt(C.map_(e, O.some))))
              )
            }
          }
          case "LeftDone": {
            return pipe(
              T.optional(pullR),
              T.map((_) => handleSuccess(O.none, _, excess)),
              T.catchAllCause((e) => T.succeed(Ex.halt(C.map_(e, O.some))))
            )
          }
          case "RightDone": {
            return pipe(
              T.optional(pullL),
              T.map((_) => handleSuccess(_, O.none, excess)),
              T.catchAllCause((e) => T.succeed(Ex.halt(C.map_(e, O.some))))
            )
          }
          case "End": {
            return T.succeed(Ex.fail(O.none))
          }
        }
      }
    )
  }
}
