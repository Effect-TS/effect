import * as OptionInstances from "@effect/typeclass/data/Option"
import * as _ from "@effect/typeclass/Of"
import { describe, it } from "@effect/vitest"
import * as RA from "effect/Array"
import * as O from "effect/Option"
import * as U from "./util.js"

describe.concurrent("Of", () => {
  it("ofComposition", () => {
    const of = _.ofComposition<RA.ReadonlyArrayTypeLambda, O.OptionTypeLambda>({ of: RA.of }, {
      of: O.some
    })
    U.deepStrictEqual(of(1), [O.some(1)])
  })

  it("unit", () => {
    U.deepStrictEqual(_.void(OptionInstances.Pointed)(), O.some(undefined))
  })
})
