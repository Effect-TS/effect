import * as alternative from "@effect/typeclass/Alternative"
import * as NumberInstances from "@effect/typeclass/data/Number"
import * as OptionInstances from "@effect/typeclass/data/Option"
import * as Option from "effect/Option"
import { describe, it } from "vitest"
import * as Util from "./util.js"

describe.concurrent("Alternative", () => {
  it("getAlternativeMonoid", () => {
    const liftMonoid = alternative.getAlternativeMonoid(OptionInstances.Alternative)
    const M = liftMonoid(NumberInstances.MonoidSum)
    Util.deepStrictEqual(M.combine(Option.some(1), Option.some(2)), Option.some(3))
    Util.deepStrictEqual(M.combine(Option.some(1), Option.none()), Option.some(1))
    Util.deepStrictEqual(M.combine(Option.none(), Option.some(2)), Option.some(2))
    Util.deepStrictEqual(M.combine(Option.none(), Option.none()), Option.none())
  })
})
