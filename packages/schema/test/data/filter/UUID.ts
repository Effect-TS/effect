import * as _ from "@effect/schema/data/UUID"
import * as Util from "@effect/schema/test/util"

describe.concurrent("UUID", () => {
  it("property tests", () => {
    Util.property(_.UUID)
  })

  it("Decoder", () => {
    const schema = _.UUID
    Util.expectDecodingSuccess(schema, "123e4567-e89b-12d3-a456-426614174000")
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string matching the pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$, actual ""`
    )
  })
})
