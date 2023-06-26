import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as String from "@effect/data/String"
import * as _ from "@effect/typeclass/SemiApplicative"
import * as U from "./util"

describe.concurrent("SemiApplicative", () => {
  it("ap", () => {
    const ap = _.ap(O.SemiApplicative)
    const double = (n: number) => n * 2
    U.deepStrictEqual(pipe(O.none(), ap(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), ap(O.some(1))), O.none())
    U.deepStrictEqual(pipe(O.some(double), ap(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(double), ap(O.some(1))), O.some(2))
  })

  it("andThenDiscard", () => {
    const andThenDiscard = _.zipLeft(O.SemiApplicative)
    U.deepStrictEqual(pipe(O.none(), andThenDiscard(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), andThenDiscard(O.some(2))), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThenDiscard(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThenDiscard(O.some(2))), O.some(1))
  })

  it("andThen", () => {
    const andThen = _.zipRight(O.SemiApplicative)
    U.deepStrictEqual(pipe(O.none(), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), andThen(O.some(2))), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.some(2))), O.some(2))
  })

  it("liftSemigroup", () => {
    const liftSemigroup = _.getSemigroup(O.SemiApplicative)
    const S = liftSemigroup(String.Semigroup)
    U.deepStrictEqual(S.combine(O.none(), O.none()), O.none())
    U.deepStrictEqual(S.combine(O.none(), O.some("b")), O.none())
    U.deepStrictEqual(S.combine(O.some("a"), O.none()), O.none())
    U.deepStrictEqual(S.combine(O.some("a"), O.some("b")), O.some("ab"))

    U.deepStrictEqual(S.combineMany(O.some("a"), [O.some("b"), O.some("c")]), O.some("abc"))
  })
})
