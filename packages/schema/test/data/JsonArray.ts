import * as JsonArray from "@fp-ts/schema/data/JsonArray"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonArray", () => {
  it("property tests", () => {
    Util.property(JsonArray.Schema)
  })
})
