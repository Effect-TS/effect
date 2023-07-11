import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Number", () => {
  it("clamp", async () => {
    const schema = S.number.pipe(S.clamp(-1, 1))

    await Util.expectParseSuccess(schema, 3, 1)
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseSuccess(schema, -3, -1)
  })

  it("between", async () => {
    const schema = S.number.pipe(S.between(-1, 1))

    await Util.expectParseFailure(schema, -2, "Expected a number between -1 and 1, actual -2")
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectEncodeSuccess(schema, 1, 1)
    await Util.expectParseFailure(schema, 2, "Expected a number between -1 and 1, actual 2")
  })

  it("positive", async () => {
    const schema = S.number.pipe(S.positive())

    await Util.expectParseFailure(schema, -1, "Expected a positive number, actual -1")
    await Util.expectParseFailure(schema, 0, "Expected a positive number, actual 0")
    await Util.expectEncodeSuccess(schema, 1, 1)
  })

  it("negative", async () => {
    const schema = S.number.pipe(S.negative())

    await Util.expectEncodeSuccess(schema, -1, -1)
    await Util.expectParseFailure(schema, 0, "Expected a negative number, actual 0")
    await Util.expectParseFailure(schema, 1, "Expected a negative number, actual 1")
  })

  it("nonNegative", async () => {
    const schema = S.number.pipe(S.nonNegative())

    await Util.expectEncodeFailure(schema, -1, "Expected a non-negative number, actual -1")
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseSuccess(schema, 1, 1)
  })

  it("nonPositive", async () => {
    const schema = S.number.pipe(S.nonPositive())

    await Util.expectEncodeSuccess(schema, -1, -1)
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseFailure(schema, 1, "Expected a non-positive number, actual 1")
  })

  describe.concurrent("numberFromString", () => {
    const schema = S.NumberFromString

    it("property tests", () => {
      Util.roundtrip(schema)
    })

    it("Decoder", async () => {
      await Util.expectParseSuccess(schema, "0", 0)
      await Util.expectParseSuccess(schema, "-0", -0)
      await Util.expectParseSuccess(schema, "1", 1)
      await Util.expectParseSuccess(schema, "1.2", 1.2)

      await Util.expectParseSuccess(schema, "NaN", NaN)
      await Util.expectParseSuccess(schema, "Infinity", Infinity)
      await Util.expectParseSuccess(schema, "-Infinity", -Infinity)

      await Util.expectParseFailure(schema, "", `Expected string -> number, actual ""`)
      await Util.expectParseFailure(schema, " ", `Expected string -> number, actual " "`)
      await Util.expectParseFailure(schema, "1AB", `Expected string -> number, actual "1AB"`)
      await Util.expectParseFailure(schema, "AB1", `Expected string -> number, actual "AB1"`)
      await Util.expectParseFailure(
        schema,
        "a",
        `Expected string -> number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        "a1",
        `Expected string -> number, actual "a1"`
      )
    })

    it("Encoder", async () => {
      await Util.expectEncodeSuccess(schema, 1, "1")
    })

    it("example", async () => {
      const schema = S.NumberFromString // converts string schema to number schema

      // success cases
      await Util.expectParseSuccess(schema, "1", 1)
      await Util.expectParseSuccess(schema, "-1", -1)
      await Util.expectParseSuccess(schema, "1.5", 1.5)
      await Util.expectParseSuccess(schema, "NaN", NaN)
      await Util.expectParseSuccess(schema, "Infinity", Infinity)
      await Util.expectParseSuccess(schema, "-Infinity", -Infinity)

      // failure cases
      await Util.expectParseFailure(
        schema,
        "a",
        `Expected string -> number, actual "a"`
      )
    })
  })
})
