import * as OptionInstances from "@effect/typeclass/data/Option"
import * as StringInstances from "@effect/typeclass/data/String"
import * as _ from "@effect/typeclass/SemiApplicative"
import { describe, it } from "@effect/vitest"
import { pipe } from "effect/Function"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("SemiApplicative", () => {
  it("ap", () => {
    const ap = _.ap(OptionInstances.SemiApplicative)
    const double = (n: number) => n * 2
    U.deepStrictEqual(pipe(O.none(), ap(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), ap(O.some(1))), O.none())
    U.deepStrictEqual(pipe(O.some(double), ap(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(double), ap(O.some(1))), O.some(2))
  })

  it("andThenDiscard", () => {
    const andThenDiscard = _.zipLeft(OptionInstances.SemiApplicative)
    U.deepStrictEqual(pipe(O.none(), andThenDiscard(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), andThenDiscard(O.some(2))), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThenDiscard(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThenDiscard(O.some(2))), O.some(1))
  })

  it("andThen", () => {
    const andThen = _.zipRight(OptionInstances.SemiApplicative)
    U.deepStrictEqual(pipe(O.none(), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.none(), andThen(O.some(2))), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.none())), O.none())
    U.deepStrictEqual(pipe(O.some(1), andThen(O.some(2))), O.some(2))
  })

  it("liftSemigroup", () => {
    const liftSemigroup = _.getSemigroup(OptionInstances.SemiApplicative)
    const S = liftSemigroup(StringInstances.Semigroup)
    U.deepStrictEqual(S.combine(O.none(), O.none()), O.none())
    U.deepStrictEqual(S.combine(O.none(), O.some("b")), O.none())
    U.deepStrictEqual(S.combine(O.some("a"), O.none()), O.none())
    U.deepStrictEqual(S.combine(O.some("a"), O.some("b")), O.some("ab"))

    U.deepStrictEqual(S.combineMany(O.some("a"), [O.some("b"), O.some("c")]), O.some("abc"))
  })

  it("lift2", () => {
    const lift2 = _.lift2(OptionInstances.SemiApplicative)
    const sum = (a: number, b: number) => a + b
    const lifted = lift2(sum)
    U.deepStrictEqual(lifted(O.some(1), O.some(2)), O.some(3))
  })
})
