import * as T from "../_internal/effect"
import { zipChunks_ } from "../_internal/utils"
import * as Array from "../../Array"
import * as C from "../../Cause/core"
import * as Either from "../../Either"
import * as Exit from "../../Exit/api"
import { pipe, tuple } from "../../Function"
import type * as NA from "../../NonEmptyArray"
import * as Option from "../../Option"
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
export function zipWith<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
  type End = { _tag: "End" }
  type RightDone<W2> = { _tag: "RightDone"; excessR: NA.NonEmptyArray<W2> }
  type LeftDone<W1> = { _tag: "LeftDone"; excessL: NA.NonEmptyArray<W1> }
  type Running<W1, W2> = {
    _tag: "Running"
    excess: Either.Either<Array.Array<W1>, Array.Array<W2>>
  }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: Option.Option<Array.Array<O>>,
    rightUpd: Option.Option<Array.Array<O2>>,
    excess: Either.Either<Array.Array<O>, Array.Array<O2>>
  ): Exit.Exit<Option.Option<never>, readonly [Array.Array<O3>, State<O, O2>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      Either.fold(
        (l) => tuple<[Array.Array<O>, Array.Array<O2>]>(l, []),
        (r) => tuple<[Array.Array<O>, Array.Array<O2>]>([], r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        Option.fold(
          () => leftExcess,
          (upd) => [...leftExcess, ...upd] as Array.Array<O>
        )
      ),
      pipe(
        rightUpd,
        Option.fold(
          () => rightExcess,
          (upd) => [...rightExcess, ...upd] as Array.Array<O2>
        )
      )
    ]

    const [emit, newExcess] = zipChunks_(left, right, f)

    if (Option.isSome(leftUpd) && Option.isSome(rightUpd)) {
      return Exit.succeed(
        tuple<[Array.Array<O3>, State<O, O2>]>(emit, {
          _tag: "Running",
          excess: newExcess
        })
      )
    } else if (Option.isNone(leftUpd) && Option.isNone(rightUpd)) {
      return Exit.fail(Option.none)
    } else {
      return Exit.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            Either.fold(
              (l): State<O, O2> =>
                Array.isNonEmpty(l)
                  ? {
                      _tag: "LeftDone",
                      excessL: l
                    }
                  : { _tag: "End" },
              (r): State<O, O2> =>
                Array.isNonEmpty(r)
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

  return combineChunks(
    that,
    <State<O, O2>>{
      _tag: "Running",
      excess: Either.left([])
    },
    (st, p1, p2) => {
      switch (st._tag) {
        case "End": {
          return T.succeed(Exit.fail(Option.none))
        }
        case "Running": {
          return pipe(
            p1,
            T.optional,
            T.zipWithPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
            T.catchAllCause((e) => T.succeed(Exit.halt(pipe(e, C.map(Option.some)))))
          )
        }
        case "LeftDone": {
          return pipe(
            p2,
            T.optional,
            T.map((r) => handleSuccess(Option.none, r, Either.left(st.excessL))),
            T.catchAllCause((e) => T.succeed(Exit.halt(pipe(e, C.map(Option.some)))))
          )
        }
        case "RightDone": {
          return pipe(
            p1,
            T.optional,
            T.map((l) => handleSuccess(l, Option.none, Either.right(st.excessR))),
            T.catchAllCause((e) => T.succeed(Exit.halt(pipe(e, C.map(Option.some)))))
          )
        }
      }
    }
  )
}
