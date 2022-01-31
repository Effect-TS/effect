// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type { ExecutionStrategy } from "../../../../Effect/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as Ex from "../../../../Exit/index.js"
import { pipe } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as ZipChunks from "./_internal/zipChunks.js"
import * as CombineChunks from "./combineChunks.js"

const StatusTypeId = Symbol()

const RunningTypeId = Symbol()
class Running {
  readonly _statusTypeId: typeof StatusTypeId = StatusTypeId
  readonly _typeId: typeof RunningTypeId = RunningTypeId
}

const LeftDoneTypeId = Symbol()
class LeftDone {
  readonly _statusTypeId: typeof StatusTypeId = StatusTypeId
  readonly _typeId: typeof LeftDoneTypeId = LeftDoneTypeId
}

const RightDoneTypeId = Symbol()
class RightDone {
  readonly _statusTypeId: typeof StatusTypeId = StatusTypeId
  readonly _typeId: typeof RightDoneTypeId = RightDoneTypeId
}

const EndTypeId = Symbol()
class End {
  readonly _statusTypeId: typeof StatusTypeId = StatusTypeId
  readonly _typeId: typeof EndTypeId = EndTypeId
}

type Status = Running | LeftDone | RightDone | End

type State<A, A1> = Tp.Tuple<[Status, E.Either<CK.Chunk<A>, CK.Chunk<A1>>]>

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
export function zipAllWithExec_<R, R1, E, E1, A, A1, A2, A3, A4>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  exec: ExecutionStrategy,
  left: (a: A) => A2,
  right: (a: A1) => A3,
  both: (a: A, a1: A1) => A4
): C.Stream<R & R1, E | E1, A2 | A3 | A4> {
  const handleSuccess = (
    maybeO: O.Option<CK.Chunk<A>>,
    maybeA1: O.Option<CK.Chunk<A1>>,
    excess: E.Either<CK.Chunk<A>, CK.Chunk<A1>>
  ): Ex.Exit<
    never,
    Tp.Tuple<
      [CK.Chunk<A2 | A3 | A4>, Tp.Tuple<[Status, E.Either<CK.Chunk<A>, CK.Chunk<A1>>]>]
    >
  > => {
    const {
      tuple: [excessL, excessR]
    } = E.fold_(
      excess,
      (l) => Tp.tuple(l, CK.empty<A1>()),
      (r) => Tp.tuple(CK.empty<A>(), r)
    )
    const chunkL = O.fold_(
      maybeO,
      () => excessL,
      (upd) => CK.concat_(excessL, upd)
    )
    const chunkR = O.fold_(
      maybeA1,
      () => excessR,
      (upd) => CK.concat_(excessR, upd)
    )
    const {
      tuple: [emit, newExcess]
    } = ZipChunks.zipChunks_(chunkL, chunkR, both)
    const {
      tuple: [fullEmit, status]
    } = (() => {
      if (O.isSome(maybeO)) {
        if (O.isSome(maybeA1)) {
          return Tp.tuple(emit, new Running())
        } else {
          return Tp.tuple(emit, new RightDone())
        }
      } else {
        if (O.isSome(maybeA1)) {
          return Tp.tuple(emit, new LeftDone())
        } else {
          const leftover: CK.Chunk<A2 | A3> = E.fold_(
            newExcess,
            CK.map(left),
            CK.map(right)
          )

          return Tp.tuple(CK.concat_(emit, leftover), new End())
        }
      }
    })()

    return Ex.succeed(Tp.tuple(fullEmit, Tp.tuple(status, newExcess)))
  }

  return CombineChunks.combineChunks_(
    self,
    that,
    Tp.tuple(new Running(), E.left(CK.empty<A>())) as State<A, A1>,
    ({ tuple: [status, excess] }, pullL, pullR) => {
      switch (status._typeId) {
        case RunningTypeId: {
          if (exec._tag === "Sequential") {
            return pipe(
              pullL,
              T.unoption,
              T.zipWith(T.unoption(pullR), (a, b) => handleSuccess(a, b, excess)),
              T.catchAllCause((e) => T.succeed(Ex.failCause(CS.map_(e, O.some))))
            )
          } else {
            return pipe(
              pullL,
              T.unoption,
              T.zipWithPar(T.unoption(pullR), (a, b) => handleSuccess(a, b, excess)),
              T.catchAllCause((e) => T.succeed(Ex.failCause(CS.map_(e, O.some))))
            )
          }
        }
        case LeftDoneTypeId:
          return pipe(
            pullR,
            T.unoption,
            T.map((_) => handleSuccess(O.none, _, excess)),
            T.catchAllCause((e) => T.succeed(Ex.failCause(CS.map_(e, O.some))))
          )
        case RightDoneTypeId:
          return pipe(
            pullL,
            T.unoption,
            T.map((_) => handleSuccess(_, O.none, excess)),
            T.catchAllCause((e) => T.succeed(Ex.failCause(CS.map_(e, O.some))))
          )
        case EndTypeId:
          return T.succeed(Ex.fail(O.none))
      }
    }
  )
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 *
 * @ets_data_first zipAllWithExec_
 */
export function zipAllWithExec<R1, E1, A, A1, A2, A3, A4>(
  that: C.Stream<R1, E1, A1>,
  exec: ExecutionStrategy,
  left: (a: A) => A2,
  right: (a: A1) => A3,
  both: (a: A, a1: A1) => A4
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    zipAllWithExec_(self, that, exec, left, right, both)
}
