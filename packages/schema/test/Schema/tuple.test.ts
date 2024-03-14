import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > tuple", () => {
  it("annotations()", () => {
    const schema = S.tuple(S.string, S.number).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the elements", () => {
    const schema = S.tuple(S.string, S.number)
    expect(schema.elements).toStrictEqual([S.string, S.number])
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.tuple().annotations({ identifier: "MyDataType" })
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.tuple()
      await Util.expectDecodeUnknownSuccess(schema, [])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `Expected readonly [], actual {}`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [undefined],
        `readonly []
└─ [0]
   └─ is unexpected, expected never`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1],
        `readonly []
└─ [0]
   └─ is unexpected, expected never`
      )
    })

    it("element", async () => {
      const schema = S.tuple(S.number)
      await Util.expectDecodeUnknownSuccess(schema, [1])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `readonly [number]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [undefined],
        `readonly [number]
└─ [0]
   └─ Expected a number, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [number]
└─ [0]
   └─ Expected a number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("element with undefined", async () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number | undefined], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `readonly [number | undefined]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [number | undefined]
└─ [0]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number | undefined]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("optional element", async () => {
      const schema = S.tuple(S.optionalElement(S.number))
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number?], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [number?]
└─ [0]
   └─ Expected a number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number?]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("optional element with undefined", async () => {
      const schema = S.tuple(S.optionalElement(S.union(S.number, S.undefined)))
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number | undefined?], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [number | undefined?]
└─ [0]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "b"],
        `readonly [number | undefined?]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("element / optional element", async () => {
      const schema = S.tuple(S.string, S.optionalElement(S.number))
      await Util.expectDecodeUnknownSuccess(schema, ["a"])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1])

      await Util.expectDecodeUnknownFailure(
        schema,
        [1],
        `readonly [string, number?]
└─ [0]
   └─ Expected a string, actual 1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a", "b"],
        `readonly [string, number?]
└─ [1]
   └─ Expected a number, actual "b"`
      )
    })

    it("e + r", async () => {
      const schema = S.tuple([S.string], S.number)
      await Util.expectDecodeUnknownSuccess(schema, ["a"])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1, 2])

      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `readonly [string, ...number[]]
└─ [0]
   └─ is missing`
      )
    })

    it("e? + r", async () => {
      const schema = S.tuple([S.optionalElement(S.string)], S.number)
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, ["a"])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1, 2])

      await Util.expectDecodeUnknownFailure(
        schema,
        [1],
        `readonly [string?, ...number[]]
└─ [0]
   └─ Expected a string, actual 1`
      )
    })

    it("rest", async () => {
      const schema = S.array(S.number)
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [1, 2])

      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `ReadonlyArray<number>
└─ [0]
   └─ Expected a number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, "a"],
        `ReadonlyArray<number>
└─ [1]
   └─ Expected a number, actual "a"`
      )
    })

    it("rest / element", async () => {
      const schema = S.tuple([], S.string, S.number)
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1])
      await Util.expectDecodeUnknownSuccess(schema, ["a", "b", 1])

      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `readonly [...string[], number]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [...string[], number]
└─ [0]
   └─ Expected a number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, 2],
        `readonly [...string[], number]
└─ [0]
   └─ Expected a string, actual 1`
      )
    })

    it("element / rest / element", async () => {
      const schema = S.tuple([S.string], S.number, S.boolean)
      await Util.expectDecodeUnknownSuccess(schema, ["a", true])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1, true])
      await Util.expectDecodeUnknownSuccess(schema, ["a", 1, 2, true])

      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        ["a", 1],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ Expected a boolean, actual 1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, true],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ Expected a string, actual 1`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [true],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ is missing`
      )
    })
  })

  describe("encoding", () => {
    it("empty", async () => {
      const schema = S.tuple()
      await Util.expectEncodeSuccess(schema, [], [])
    })

    it("element", async () => {
      const schema = S.tuple(Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `readonly [NumberFromChar]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("element with undefined", async () => {
      const schema = S.tuple(S.union(Util.NumberFromChar, S.undefined))
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar | undefined]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("optional element", async () => {
      const schema = S.tuple(S.optionalElement(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `readonly [NumberFromChar?]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar?]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("optional element with undefined", async () => {
      const schema = S.tuple(S.optionalElement(S.union(Util.NumberFromChar, S.undefined)))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar | undefined?]
└─ [1]
   └─ is unexpected, expected 0`
      )
    })

    it("element / optional element", async () => {
      const schema = S.tuple(S.string, S.optionalElement(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    })

    it("e + r", async () => {
      const schema = S.tuple([S.string], Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("e? + r", async () => {
      const schema = S.tuple([S.optionalElement(S.string)], Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("rest", async () => {
      const schema = S.array(Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [1, 2], ["1", "2"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `ReadonlyArray<NumberFromChar>
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
      )
    })

    it("rest / element", async () => {
      const schema = S.tuple([], S.string, Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
      await Util.expectEncodeFailure(
        schema,
        [] as any,
        `readonly [...string[], NumberFromChar]
└─ [0]
   └─ is missing`
      )
      await Util.expectEncodeFailure(
        schema,
        [10],
        `readonly [...string[], NumberFromChar]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`
      )
    })

    it("element / rest / element", async () => {
      const schema = S.tuple([S.string], Util.NumberFromChar, S.boolean)
      await Util.expectEncodeSuccess(schema, ["a", true], ["a", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, true], ["a", "1", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
    })
  })
})
