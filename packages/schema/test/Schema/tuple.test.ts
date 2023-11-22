import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/tuple", () => {
  it("rest: should throw on unsupported schemas", () => {
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.rest(S.number))).toThrow(
      new Error("`rest` is not supported on this schema")
    )
  })

  it("element: should throw on unsupported schemas", () => {
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.element(S.number))).toThrow(
      new Error("`element` is not supported on this schema")
    )
  })

  it("optionalElement: should throw on unsupported schemas", () => {
    const schema = S.tuple().pipe(S.filter(() => true))
    expect(() => schema.pipe(S.optionalElement(S.number))).toThrow(
      new Error("`optionalElement` is not supported on this schema")
    )
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.tuple().pipe(S.identifier("MyDataType"))
      await Util.expectParseFailure(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
      await Util.expectParseFailureTree(
        schema,
        null,
        `error(s) found
└─ Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.tuple()
      await Util.expectParseSuccess(schema, [])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        {},
        `Expected <anonymous tuple or array schema>, actual {}`
      )
      await Util.expectParseFailure(schema, [undefined], `/0 is unexpected`)
      await Util.expectParseFailure(schema, [1], `/0 is unexpected`)
    })

    it("required element", async () => {
      const schema = S.tuple(S.number)
      await Util.expectParseSuccess(schema, [1])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(schema, [], `/0 is missing`)
      await Util.expectParseFailure(
        schema,
        [undefined],
        `/0 Expected number, actual undefined`
      )
      await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
      await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
    })

    it("required element with undefined", async () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, [undefined])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(schema, [], `/0 is missing`)
      await Util.expectParseFailure(
        schema,
        ["a"],
        `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
    })

    it("optional element", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.number))
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, [1])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `/0 Expected number, actual "a"`
      )
      await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
    })

    it("optional element with undefined", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.union(S.number, S.undefined)))
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, [undefined])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(schema, [1, "b"], `/1 is unexpected`)
    })

    it("e e?", async () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(S.number))
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])

      await Util.expectParseFailure(schema, [1], `/0 Expected string, actual 1`)
      await Util.expectParseFailure(schema, ["a", "b"], `/1 Expected number, actual "b"`)
    })

    it("e r", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(S.number))
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", 1, 2])

      await Util.expectParseFailure(schema, [], `/0 is missing`)
    })

    it("e? r", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.number))
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", 1, 2])

      await Util.expectParseFailure(schema, [1], `/0 Expected string, actual 1`)
    })

    it("r", async () => {
      const schema = S.array(S.number)
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, [1, 2])

      await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
      await Util.expectParseFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
    })

    it("r e", async () => {
      const schema = S.array(S.string).pipe(S.element(S.number))
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", "b", 1])

      await Util.expectParseFailure(schema, [], `/0 is missing`)
      await Util.expectParseFailure(schema, ["a"], `/0 Expected number, actual "a"`)
      await Util.expectParseFailure(schema, [1, 2], `/0 Expected string, actual 1`)
    })

    it("e r e", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean))
      await Util.expectParseSuccess(schema, ["a", true])
      await Util.expectParseSuccess(schema, ["a", 1, true])
      await Util.expectParseSuccess(schema, ["a", 1, 2, true])

      await Util.expectParseFailure(schema, [], `/0 is missing`)
      await Util.expectParseFailure(schema, ["a"], `/1 is missing`)
      await Util.expectParseFailure(schema, ["a", 1], `/1 Expected boolean, actual 1`)
      await Util.expectParseFailure(schema, [1, true], `/0 Expected string, actual 1`)
      await Util.expectParseFailure(schema, [true], `/1 is missing`)
    })
  })

  describe("encoding", () => {
    // raises an error while encoding from a number if the string is not a char
    const NumberFromChar = S.string.pipe(S.length(1), S.numberFromString)

    it("empty", async () => {
      const schema = S.tuple()
      await Util.expectEncodeSuccess(schema, [], [])
    })

    it("e", async () => {
      const schema = S.tuple(NumberFromChar)
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `/0 Expected a character, actual "10"`
      )
      await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
    })

    it("e with undefined", async () => {
      const schema = S.tuple(S.union(NumberFromChar, S.undefined))
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
    })

    it("e?", async () => {
      const schema = S.tuple().pipe(S.optionalElement(NumberFromChar))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `/0 Expected a character, actual "10"`
      )
      await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
    })

    it("e? with undefined", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.union(NumberFromChar, S.undefined)))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(schema, [1, "b"] as any, `/1 is unexpected`)
    })

    it("e + e?", async () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(NumberFromChar))
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    })

    it("e + r", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(NumberFromChar))
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("e? + r", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(NumberFromChar))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("r", async () => {
      const schema = S.array(NumberFromChar)
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [1, 2], ["1", "2"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `/0 Expected a character, actual "10"`
      )
    })

    it("r + e", async () => {
      const schema = S.array(S.string).pipe(S.element(NumberFromChar))
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
      await Util.expectEncodeFailure(schema, [] as any, `/0 is missing`)
      await Util.expectEncodeFailure(
        schema,
        [10],
        `/0 Expected a character, actual "10"`
      )
    })

    it("e + r + e", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(NumberFromChar), S.element(S.boolean))
      await Util.expectEncodeSuccess(schema, ["a", true], ["a", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, true], ["a", "1", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
    })
  })
})
