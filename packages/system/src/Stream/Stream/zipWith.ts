import * as T from "../_internal/effect"
import { zipChunks_ } from "../_internal/utils"
import * as A from "../../Array"
import * as C from "../../Cause/core"
import * as E from "../../Either"
import * as Exit from "../../Exit/api"
import { pipe, tuple } from "../../Function"
import type * as NA from "../../NonEmptyArray"
import * as O from "../../Option"
import { combineChunks } from "./combineChunks"
import type { Stream } from "./definitions"

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semanthics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: "seq"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<S | S1, R & R1, E1 | E, O3>
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: "par" | "seq"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<unknown, R & R1, E1 | E, O3>
export function zipWith<O, O2, O3, S1, R1, E1>(
  that: Stream<S1, R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: "par" | "seq" = "par"
): <S, R, E>(self: Stream<S, R, E, O>) => Stream<unknown, R & R1, E1 | E, O3> {
  type End = { _tag: "End" }
  type RightDone<W2> = { _tag: "RightDone"; excessR: NA.NonEmptyArray<W2> }
  type LeftDone<W1> = { _tag: "LeftDone"; excessL: NA.NonEmptyArray<W1> }
  type Running<W1, W2> = { _tag: "Running"; excess: E.Either<A.Array<W1>, A.Array<W2>> }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: O.Option<A.Array<O>>,
    rightUpd: O.Option<A.Array<O2>>,
    excess: E.Either<A.Array<O>, A.Array<O2>>
  ): Exit.Exit<O.Option<never>, readonly [A.Array<O3>, State<O, O2>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.fold(
        (l) => tuple<[A.Array<O>, A.Array<O2>]>(l, []),
        (r) => tuple<[A.Array<O>, A.Array<O2>]>([], r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.fold(
          () => leftExcess,
          (upd) => [...leftExcess, ...upd] as A.Array<O>
        )
      ),
      pipe(
        rightUpd,
        O.fold(
          () => rightExcess,
          (upd) => [...rightExcess, ...upd] as A.Array<O2>
        )
      )
    ]

    const [emit, newExcess] = zipChunks_(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Exit.succeed(
        tuple<[A.Array<O3>, State<O, O2>]>(emit, {
          _tag: "Running",
          excess: newExcess
        })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Exit.fail(O.none)
    } else {
      return Exit.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            E.fold(
              (l): State<O, O2> =>
                A.isNonEmpty(l)
                  ? {
                      _tag: "LeftDone",
                      excessL: l
                    }
                  : { _tag: "End" },
              (r): State<O, O2> =>
                A.isNonEmpty(r)
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

  return combineChunks(that)<State<O, O2>>({
    _tag: "Running",
    excess: E.left([])
  })((st, p1, p2) => {
    switch (st._tag) {
      case "End": {
        return T.succeedNow(Exit.fail(O.none))
      }
      case "Running": {
        return pipe(
          p1,
          T.optional,
          ps === "par"
            ? T.zipWithPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
            : T.zipWith(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
      case "LeftDone": {
        return pipe(
          p2,
          T.optional,
          T.map((r) => handleSuccess(O.none, r, E.left(st.excessL))),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
      case "RightDone": {
        return pipe(
          p1,
          T.optional,
          T.map((l) => handleSuccess(l, O.none, E.right(st.excessR))),
          T.catchAllCause((e) => T.succeedNow(Exit.halt(pipe(e, C.map(O.some)))))
        )
      }
    }
  })
}
