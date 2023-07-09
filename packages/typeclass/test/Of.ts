import * as O from "@effect/data/Option"
import * as RA from "@effect/data/ReadonlyArray"
import * as _ from "@effect/typeclass/Of"
import * as OptionInstances from "@effect/typeclass/test/instances/Option"
import * as U from "./util"

describe.concurrent("Of", () => {
  it("ofComposition", () => {
    const of = _.ofComposition<RA.ReadonlyArrayTypeLambda, O.OptionTypeLambda>({ of: RA.of }, {
      of: O.some
    })
    U.deepStrictEqual(of(1), [O.some(1)])
  })

  it("unit", () => {
    U.deepStrictEqual(_.unit(OptionInstances.Pointed)(), O.some(undefined))
  })
})
