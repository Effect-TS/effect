import * as JsonObject from "@fp-ts/schema/data/JsonObject"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonObject", () => {
  it("property tests", () => {
    Util.property(JsonObject.Schema)
  })
})
