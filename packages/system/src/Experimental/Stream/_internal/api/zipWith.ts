// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as E from "../../../../Either/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as ZipChunks from "./_internal/zipChunks.js"
import * as CombineChunks from "./combineChunks.js"

class Running<W1, W2> {
  readonly _tag = "Running"
  constructor(readonly excess: E.Either<CK.Chunk<W1>, CK.Chunk<W2>>) {}
}
class LeftDone<W1> {
  readonly _tag = "LeftDone"
  constructor(readonly excessL: CK.Chunk<W1>) {}
}
class RightDone<W2> {
  readonly _tag = "RightDone"
  constructor(readonly excessR: CK.Chunk<W2>) {}
}
class End {
  readonly _tag = "End"
}
type State<W1, W2> = Running<W1, W2> | LeftDone<W1> | RightDone<W2> | End

function handleSuccess<A, A1, B>(
  f: (a: A, a1: A1) => B,
  leftUpd: O.Option<CK.Chunk<A>>,
  rightUpd: O.Option<CK.Chunk<A1>>,
  excess: E.Either<CK.Chunk<A>, CK.Chunk<A1>>
): Ex.Exit<O.Option<never>, Tp.Tuple<[CK.Chunk<B>, State<A, A1>]>> {
  const [leftExcess, rightExcess] = E.fold_(
    excess,
    (l) => [l, CK.empty<A1>()] as const,
    (r) => [CK.empty<A>(), r] as const
  )
  const left = O.fold_(
    leftUpd,
    () => leftExcess,
    (upd) => CK.concat_(leftExcess, upd)
  )
  const right = O.fold_(
    rightUpd,
    () => rightExcess,
    (upd) => CK.concat_(rightExcess, upd)
  )
  const {
    tuple: [emit, newExcess]
  } = ZipChunks.zipChunks_(left, right, f)

  if (leftUpd._tag === "Some" && rightUpd._tag === "Some") {
    return Ex.succeed(Tp.tuple(emit, new Running(newExcess)))
  }
  if (leftUpd._tag === "None" && rightUpd._tag === "None") {
    return Ex.fail(O.none)
  }
  const newState: State<A, A1> =
    newExcess._tag === "Left"
      ? CK.isEmpty(newExcess.left)
        ? new End()
        : new LeftDone(newExcess.left)
      : CK.isEmpty(newExcess.right)
      ? new End()
      : new RightDone(newExcess.right)
  return Ex.succeed(Tp.tuple(emit, newState))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, A1, B>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): C.Stream<R1 & R, E | E1, B> {
  return CombineChunks.combineChunks_(
    self,
    that,
    new Running(E.left(CK.empty())) as State<A, A1>,
    (st, p1, p2) => {
      switch (st._tag) {
        case "End": {
          return T.succeed(Ex.fail(O.none))
        }
        case "Running": {
          return T.catchAllCause_(
            T.zipWithPar_(T.optional(p1), T.optional(p2), (l, r) =>
              handleSuccess(f, l, r, st.excess)
            ),
            (e) => T.succeed(Ex.halt(CS.map_(e, O.some)))
          )
        }
        case "LeftDone": {
          return T.catchAllCause_(
            T.map_(T.optional(p2), (l) =>
              handleSuccess(f, O.none, l, E.left(st.excessL))
            ),
            (e) => T.succeed(Ex.halt(CS.map_(e, O.some)))
          )
        }
        case "RightDone": {
          return T.catchAllCause_(
            T.map_(T.optional(p1), (r) =>
              handleSuccess(f, r, O.none, E.right(st.excessR))
            ),
            (e) => T.succeed(Ex.halt(CS.map_(e, O.some)))
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
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(self: C.Stream<R, E, A>) => C.Stream<R1 & R, E | E1, B> {
  return (self) => zipWith_(self, that, f)
}
