import * as _ from "@fp-ts/schema/data/UUID"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("UUID", () => {
  const schema = _.UUID

  it("property tests", () => {
    Util.property(schema)
  })
})
