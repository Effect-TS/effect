import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("UUID", () => {
  it("property tests", () => {
    Util.roundtrip(S.UUID)
  })

  it("Decoder", () => {
    const schema = S.UUID
    Util.expectDecodingSuccess(schema, "123e4567-e89b-12d3-a456-426614174000")
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string matching the pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$, actual ""`
    )
  })
})
