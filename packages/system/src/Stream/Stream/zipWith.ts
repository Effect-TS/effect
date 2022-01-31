// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as E from "../../Either/index.js"
import * as Ex from "../../Exit/api.js"
import { pipe, tuple } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import { zipChunks_ } from "../_internal/utils.js"
import { combineChunks_ } from "./combineChunks.js"
import type { Stream } from "./definitions.js"

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semanthics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWith_<R, R1, E, E1, O, O2, O3>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3
): Stream<R & R1, E1 | E, O3> {
  type End = { _tag: "End" }
  type RightDone<W2> = { _tag: "RightDone"; excessR: A.Chunk<W2> }
  type LeftDone<W1> = { _tag: "LeftDone"; excessL: A.Chunk<W1> }
  type Running<W1, W2> = {
    _tag: "Running"
    excess: E.Either<A.Chunk<W1>, A.Chunk<W2>>
  }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: O.Option<A.Chunk<O>>,
    rightUpd: O.Option<A.Chunk<O2>>,
    excess: E.Either<A.Chunk<O>, A.Chunk<O2>>
  ): Ex.Exit<O.Option<never>, Tp.Tuple<[A.Chunk<O3>, State<O, O2>]>> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.fold(
        (l) => tuple<[A.Chunk<O>, A.Chunk<O2>]>(l, A.empty()),
        (r) => tuple<[A.Chunk<O>, A.Chunk<O2>]>(A.empty(), r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.fold(
          () => leftExcess,
          (upd) => A.concat_(leftExcess, upd) as A.Chunk<O>
        )
      ),
      pipe(
        rightUpd,
        O.fold(
          () => rightExcess,
          (upd) => A.concat_(rightExcess, upd) as A.Chunk<O2>
        )
      )
    ]

    const [emit, newExcess] = zipChunks_(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Ex.succeed(
        Tp.tuple<[A.Chunk<O3>, State<O, O2>]>(emit, {
          _tag: "Running",
          excess: newExcess
        })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Ex.fail(O.none)
    } else {
      return Ex.succeed(
        Tp.tuple(
          emit,
          pipe(
            newExcess,
            E.fold(
              (l): State<O, O2> =>
                !A.isEmpty(l)
                  ? {
                      _tag: "LeftDone",
                      excessL: l
                    }
                  : { _tag: "End" },
              (r): State<O, O2> =>
                !A.isEmpty(r)
                  ? {
                      _tag: "RightDone",
                      excessR: r
                    }
                  : { _tag: "End" }
            )
          )
        )
      )
    }
  }

  return combineChunks_(
    self,
    that,
    <State<O, O2>>{
      _tag: "Running",
      excess: E.left(A.empty())
    },
    (st, p1, p2) => {
      switch (st._tag) {
        case "End": {
          return T.succeed(Ex.fail(O.none))
        }
        case "Running": {
          return pipe(
            p1,
            T.optional,
            T.zipWithPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
            T.catchAllCause((e) => T.succeed(Ex.halt(pipe(e, C.map(O.some)))))
          )
        }
        case "LeftDone": {
          return pipe(
            p2,
            T.optional,
            T.map((r) => handleSuccess(O.none, r, E.left(st.excessL))),
            T.catchAllCause((e) => T.succeed(Ex.halt(pipe(e, C.map(O.some)))))
          )
        }
        case "RightDone": {
          return pipe(
            p1,
            T.optional,
            T.map((l) => handleSuccess(l, O.none, E.right(st.excessR))),
            T.catchAllCause((e) => T.succeed(Ex.halt(pipe(e, C.map(O.some)))))
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
 * By default pull is executed in parallel to preserve async semanthics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWith<R1, E1, O, O2, O3>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3
) {
  return <R, E>(self: Stream<R, E, O>) => zipWith_(self, that, f)
}
