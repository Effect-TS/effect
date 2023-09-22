import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.number.pipe(S.finite())

describe("number/finite", () => {
  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(
      schema,
      Infinity,
      `Expected a finite number, actual Infinity`
    )
    await Util.expectParseFailure(
      schema,
      -Infinity,
      `Expected a finite number, actual -Infinity`
    )
  })
})
