import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("string/split", () => {
  it("split (data-last)", async () => {
    const schema = S.split(",")

    Util.assertions.testRoundtripConsistency(schema)

    // Decoding
    await Util.assertions.decoding.succeed(schema, "", [""])
    await Util.assertions.decoding.succeed(schema, ",", ["", ""])
    await Util.assertions.decoding.succeed(schema, "a", ["a"])
    await Util.assertions.decoding.succeed(schema, ",a", ["", "a"])
    await Util.assertions.decoding.succeed(schema, "a,", ["a", ""])
    await Util.assertions.decoding.succeed(schema, "a,b", ["a", "b"])

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
