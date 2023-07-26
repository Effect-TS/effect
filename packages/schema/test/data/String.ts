import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("String", () => {
  it("split (data-last)", async () => {
    const schema = S.string.pipe(S.split(","))

    Util.roundtrip(schema)

    // Decoding
    await Util.expectParseSuccess(schema, "", [""])
    await Util.expectParseSuccess(schema, ",", ["", ""])
    await Util.expectParseSuccess(schema, "a", ["a"])
    await Util.expectParseSuccess(schema, ",a", ["", "a"])
    await Util.expectParseSuccess(schema, "a,", ["a", ""])
    await Util.expectParseSuccess(schema, "a,b", ["a", "b"])

    // Encoding
    await Util.expectEncodeSuccess(schema, [], "")
    await Util.expectEncodeSuccess(schema, [""], "")
    await Util.expectEncodeSuccess(schema, ["", ""], ",")
    await Util.expectEncodeSuccess(schema, ["a"], "a")
    await Util.expectEncodeSuccess(schema, ["", "a"], ",a")
    await Util.expectEncodeSuccess(schema, ["a", ""], "a,")
    await Util.expectEncodeSuccess(schema, ["a", "b"], "a,b")
  })

  it("split (data-first)", async () => {
    const schema = S.split(S.string, ",")

    await Util.expectParseSuccess(schema, "a,b", ["a", "b"])
  })
})
