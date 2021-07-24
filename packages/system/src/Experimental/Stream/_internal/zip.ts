import * as Cause from "../../../Cause"
import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import * as E from "../../../Either"
import * as Exit from "../../../Exit"
import * as O from "../../../Option"
import * as S from "./core"
import { zipChunks_ } from "./utils"

class Running<W1, W2> {
  readonly _tag = "Running"
  constructor(readonly excess: E.Either<Chunk.Chunk<W1>, Chunk.Chunk<W2>>) {}
}
class LeftDone<W1> {
  readonly _tag = "LeftDone"
  constructor(readonly excessL: Chunk.Chunk<W1>) {}
}
class RightDone<W2> {
  readonly _tag = "RightDone"
  constructor(readonly excessR: Chunk.Chunk<W2>) {}
}
class End {
  readonly _tag = "End"
}
type State<W1, W2> = Running<W1, W2> | LeftDone<W1> | RightDone<W2> | End

function handleSuccess<A, A1, B>(
  f: (a: A, a1: A1) => B,
  leftUpd: O.Option<Chunk.Chunk<A>>,
  rightUpd: O.Option<Chunk.Chunk<A1>>,
  excess: E.Either<Chunk.Chunk<A>, Chunk.Chunk<A1>>
): Exit.Exit<O.Option<never>, Tp.Tuple<[Chunk.Chunk<B>, State<A, A1>]>> {
  const [leftExcess, rightExcess] = E.fold_(
    excess,
    (l) => [l, Chunk.empty<A1>()] as const,
    (r) => [Chunk.empty<A>(), r] as const
  )
  const left = O.fold_(
    leftUpd,
    () => leftExcess,
    (upd) => Chunk.concat_(leftExcess, upd)
  )
  const right = O.fold_(
    rightUpd,
    () => rightExcess,
    (upd) => Chunk.concat_(rightExcess, upd)
  )
  const {
    tuple: [emit, newExcess]
  } = zipChunks_(left, right, f)

  if (leftUpd._tag === "Some" && rightUpd._tag === "Some") {
    return Exit.succeed(Tp.tuple(emit, new Running(newExcess)))
  }
  if (leftUpd._tag === "None" && rightUpd._tag === "None") {
    return Exit.fail(O.none)
  }
  const newState: State<A, A1> =
    newExcess._tag === "Left"
      ? Chunk.isEmpty(newExcess.left)
        ? new End()
        : new LeftDone(newExcess.left)
      : Chunk.isEmpty(newExcess.right)
      ? new End()
      : new RightDone(newExcess.right)
  return Exit.succeed(Tp.tuple(emit, newState))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, A1, B>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): S.Stream<R1 & R, E | E1, B> {
  return S.combineChunks_(
    self,
    that,
    new Running(E.left(Chunk.empty())) as State<A, A1>,
    (st, p1, p2) => {
      switch (st._tag) {
        case "End": {
          return T.succeed(Exit.fail(O.none))
        }
        case "Running": {
          return T.catchAllCause_(
            T.zipWithPar_(T.optional(p1), T.optional(p2), (l, r) =>
              handleSuccess(f, l, r, st.excess)
            ),
            (e) => T.succeed(Exit.halt(Cause.map_(e, O.some)))
          )
        }
        case "LeftDone": {
          return T.catchAllCause_(
            T.map_(T.optional(p2), (l) =>
              handleSuccess(f, O.none, l, E.left(st.excessL))
            ),
            (e) => T.succeed(Exit.halt(Cause.map_(e, O.some)))
          )
        }
        case "RightDone": {
          return T.catchAllCause_(
            T.map_(T.optional(p1), (r) =>
              handleSuccess(f, r, O.none, E.right(st.excessR))
            ),
            (e) => T.succeed(Exit.halt(Cause.map_(e, O.some)))
          )
        }
      }
    }
  )
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, R1, E1, A1, B>(
  that: S.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(self: S.Stream<R, E, A>) => S.Stream<R1 & R, E | E1, B> {
  return (self) => zipWith_(self, that, f)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 */
export function zip_<R, E, A, R1, E1, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>
): S.Stream<R1 & R, E | E1, Tp.Tuple<[A, A1]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zip_
 */
export function zip<R1, E1, A1>(
  that: S.Stream<R1, E1, A1>
): <R, E, A>(self: S.Stream<R, E, A>) => S.Stream<R1 & R, E | E1, Tp.Tuple<[A, A1]>> {
  return (self) => zip_(self, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipRight_<R, R1, E, E1, A, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>
): S.Stream<R1 & R, E | E1, A1> {
  return zipWith_(self, that, (_, o) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R, R1, E, E1, A, A1>(that: S.Stream<R1, E1, A1>) {
  return (self: S.Stream<R, E, A>) => zipRight_(self, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft_<R, R1, E, E1, A, A1>(
  self: S.Stream<R, E, A>,
  that: S.Stream<R1, E1, A1>
): S.Stream<R1 & R, E | E1, A> {
  return zipWith_(self, that, (o, _) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R, R1, E, E1, A, A1>(that: S.Stream<R1, E1, A1>) {
  return (self: S.Stream<R, E, A>) => zipLeft_(self, that)
}
