import * as CS from "../../../Cause"
import * as A from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import type { ExecutionStrategy } from "../../../Effect"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import * as Ex from "../../../Exit"
import { identity, pipe } from "../../../Function"
import * as O from "../../../Option"
import * as S from "./core"
import { zipChunks_ } from "./utils"

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAll_<R, R1, E, E1, A, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  defaultLeft: A,
  defaultRight: A1
): S.Stream<R & R1, E | E1, Tp.Tuple<[A, A1]>> {
  return zipAllWith_(
    self,
    that,
    (_) => Tp.tuple(_, defaultRight),
    (_) => Tp.tuple(defaultLeft, _),
    (a, b) => Tp.tuple(a, b)
  )
}

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of elements
 * from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * @ets_data_first zipAll_
 */
export function zipAll<R1, E1, A, A1>(
  that: S.Stream<R1, E1, A1>,
  defaultLeft: A,
  defaultRight: A1
) {
  return <R, E>(self: S.Stream<R, E, A>) =>
    zipAll_(self, that, defaultLeft, defaultRight)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 */
export function zipAllLeft_<R, R1, E, E1, A, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  default_: A
): S.Stream<R & R1, E | E1, A> {
  return zipAllWith_(
    self,
    that,
    identity,
    (_) => default_,
    (o, _) => o
  )
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 *
 * @ets_data_first zipAllLeft_
 */
export function zipAllLeft<R1, E1, A, A1>(that: S.Stream<R1, E1, A1>, default_: A) {
  return <R, E>(self: S.Stream<R, E, A>) => zipAllLeft_(self, that, default_)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 */
export function zipAllRight_<R, R1, E, E1, A, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  default_: A1
): S.Stream<R & R1, E | E1, A1> {
  return zipAllWith_(
    self,
    that,
    (_) => default_,
    identity,
    (_, o) => o
  )
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 *
 * @ets_data_first zipAllRight_
 */
export function zipAllRight<R1, E1, A1>(that: S.Stream<R1, E1, A1>, default_: A1) {
  return <R, E, A>(self: S.Stream<R, E, A>) => zipAllRight_(self, that, default_)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith_<R, R1, E, E1, A, A1, A2, A3, A4>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  left: (a: A) => A2,
  right: (a1: A1) => A3,
  both: (a: A, a1: A1) => A4
): S.Stream<R & R1, E | E1, A2 | A3 | A4> {
  return zipAllWithExec_(self, that, T.parallel, left, right, both)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * @ets_data_first zipAllWith_
 */
export function zipAllWith<R1, E1, A, A1, A2, A3, A4>(
  that: S.Stream<R1, E1, A1>,
  left: (a: A) => A2,
  right: (a1: A1) => A3,
  both: (a: A, a1: A1) => A4
) {
  return <R, E>(self: S.Stream<R, E, A>) => zipAllWith_(self, that, left, right, both)
}

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

type State<A, A1> = Tp.Tuple<[Status, E.Either<A.Chunk<A>, A.Chunk<A1>>]>

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
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  exec: ExecutionStrategy,
  left: (a: A) => A2,
  right: (a: A1) => A3,
  both: (a: A, a1: A1) => A4
): S.Stream<R & R1, E | E1, A2 | A3 | A4> {
  const handleSuccess = (
    maybeO: O.Option<A.Chunk<A>>,
    maybeA1: O.Option<A.Chunk<A1>>,
    excess: E.Either<A.Chunk<A>, A.Chunk<A1>>
  ): Ex.Exit<
    never,
    Tp.Tuple<
      [A.Chunk<A2 | A3 | A4>, Tp.Tuple<[Status, E.Either<A.Chunk<A>, A.Chunk<A1>>]>]
    >
  > => {
    const {
      tuple: [excessL, excessR]
    } = E.fold_(
      excess,
      (l) => Tp.tuple(l, A.empty<A1>()),
      (r) => Tp.tuple(A.empty<A>(), r)
    )
    const chunkL = O.fold_(
      maybeO,
      () => excessL,
      (upd) => A.concat_(excessL, upd)
    )
    const chunkR = O.fold_(
      maybeA1,
      () => excessR,
      (upd) => A.concat_(excessR, upd)
    )
    const {
      tuple: [emit, newExcess]
    } = zipChunks_(chunkL, chunkR, both)
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
          const leftover: A.Chunk<A2 | A3> = E.fold_(
            newExcess,
            A.map(left),
            A.map(right)
          )

          return Tp.tuple(A.concat_(emit, leftover), new End())
        }
      }
    })()

    return Ex.succeed(Tp.tuple(fullEmit, Tp.tuple(status, newExcess)))
  }

  return S.combineChunks_(
    self,
    that,
    Tp.tuple(new Running(), E.left(A.empty<A>())) as State<A, A1>,
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
  that: S.Stream<R1, E1, A1>,
  exec: ExecutionStrategy,
  left: (a: A) => A2,
  right: (a: A1) => A3,
  both: (a: A, a1: A1) => A4
) {
  return <R, E>(self: S.Stream<R, E, A>) =>
    zipAllWithExec_(self, that, exec, left, right, both)
}
