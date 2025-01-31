import * as applicative from "@effect/typeclass/Applicative"
import * as NumberInstances from "@effect/typeclass/data/Number"
import * as OptionInstances from "@effect/typeclass/data/Option"
import { describe, it } from "@effect/vitest"
import * as Option from "effect/Option"
import * as Util from "./util.js"

describe.concurrent("Applicative", () => {
  it("liftMonoid", () => {
    const liftMonoid = applicative.getMonoid(OptionInstances.Applicative)
    const M = liftMonoid(NumberInstances.MonoidSum)
    Util.deepStrictEqual(M.combine(Option.none(), Option.none()), Option.none())
    Util.deepStrictEqual(M.combine(Option.some(1), Option.none()), Option.none())
    Util.deepStrictEqual(M.combine(Option.none(), Option.some(2)), Option.none())
    Util.deepStrictEqual(M.combine(Option.some(1), Option.some(2)), Option.some(3))
  })
})
