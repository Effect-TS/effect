import * as N from "@effect/data/Number"
import * as O from "@effect/data/Option"
import * as _ from "@effect/typeclass/Applicative"
import * as U from "./util"

describe.concurrent("Applicative", () => {
  it("liftMonoid", () => {
    const liftMonoid = _.getMonoid(O.Applicative)
    const M = liftMonoid(N.MonoidSum)
    U.deepStrictEqual(M.combine(O.none(), O.none()), O.none())
    U.deepStrictEqual(M.combine(O.some(1), O.none()), O.none())
    U.deepStrictEqual(M.combine(O.none(), O.some(2)), O.none())
    U.deepStrictEqual(M.combine(O.some(1), O.some(2)), O.some(3))
  })
})
