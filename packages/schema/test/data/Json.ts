import * as Json from "@fp-ts/schema/data/Json"
import * as Util from "@fp-ts/schema/test/util"

describe("Json", () => {
  it("property tests", () => {
    Util.property(Json.Schema)
  })
})
