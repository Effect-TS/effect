import * as _ from "@effect/typeclass/Coproduct"
import * as OptionInstances from "@effect/typeclass/data/Option"
import { describe, it } from "@effect/vitest"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("Coproduct", () => {
  it("getMonoid", () => {
    const M = _.getMonoid(OptionInstances.Alternative)<unknown, never, never, number>()
    U.deepStrictEqual(M.combine(O.none(), O.none()), O.none())
    U.deepStrictEqual(M.combine(O.some(1), O.none()), O.some(1))
    U.deepStrictEqual(M.combine(O.none(), O.some(2)), O.some(2))
    U.deepStrictEqual(M.combine(O.some(1), O.some(2)), O.some(1))

    U.deepStrictEqual(M.combine(M.empty, O.none()), O.none())
    U.deepStrictEqual(M.combine(M.empty, O.some(2)), O.some(2))
    U.deepStrictEqual(M.combine(O.some(1), M.empty), O.some(1))
  })
})
