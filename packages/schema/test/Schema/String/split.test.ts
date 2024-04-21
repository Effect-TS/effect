import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("string/split", () => {
  it("split (data-last)", async () => {
    const schema = S.split(",")

    Util.roundtrip(schema)

    // Decoding
    await Util.expectDecodeUnknownSuccess(schema, "", [""])
    await Util.expectDecodeUnknownSuccess(schema, ",", ["", ""])
    await Util.expectDecodeUnknownSuccess(schema, "a", ["a"])
    await Util.expectDecodeUnknownSuccess(schema, ",a", ["", "a"])
    await Util.expectDecodeUnknownSuccess(schema, "a,", ["a", ""])
    await Util.expectDecodeUnknownSuccess(schema, "a,b", ["a", "b"])

    // Encoding
    await Util.expectEncodeSuccess(schema, [], "")
    await Util.expectEncodeSuccess(schema, [""], "")
    await Util.expectEncodeSuccess(schema, ["", ""], ",")
    await Util.expectEncodeSuccess(schema, ["a"], "a")
    await Util.expectEncodeSuccess(schema, ["", "a"], ",a")
    await Util.expectEncodeSuccess(schema, ["a", ""], "a,")
    await Util.expectEncodeSuccess(schema, ["a", "b"], "a,b")
  })
})
