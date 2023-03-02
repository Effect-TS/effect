import { UUID } from "@effect/schema/data/String"
import * as Util from "@effect/schema/test/util"

describe.concurrent("UUID", () => {
  it("property tests", () => {
    Util.property(UUID)
  })

  it("Decoder", () => {
    const schema = UUID
    Util.expectDecodingSuccess(schema, "123e4567-e89b-12d3-a456-426614174000")
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string matching the pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$, actual ""`
    )
  })
})
