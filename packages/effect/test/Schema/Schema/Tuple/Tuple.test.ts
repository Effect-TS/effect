import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Tuple", () => {
  it("should expose the elements", () => {
    const schema = S.Tuple(S.String, S.Number)
    deepStrictEqual(schema.elements, [S.String, S.Number])
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.Tuple().annotations({ identifier: "MyDataType" })
      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.Tuple()
      await Util.assertions.decoding.succeed(schema, [])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected readonly [], actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        {},
        `Expected readonly [], actual {}`
      )
      await Util.assertions.decoding.fail(
        schema,
        [undefined],
        `readonly []
└─ [0]
   └─ is unexpected, expected: never`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1],
        `readonly []
└─ [0]
   └─ is unexpected, expected: never`
      )
    })

    it("element", async () => {
      const schema = S.Tuple(S.Number)
      await Util.assertions.decoding.succeed(schema, [1])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected readonly [number], actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        [],
        `readonly [number]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        [undefined],
        `readonly [number]
└─ [0]
   └─ Expected number, actual undefined`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [number]
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("element with undefined", async () => {
      const schema = S.Tuple(S.Union(S.Number, S.Undefined))
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [undefined])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected readonly [number | undefined], actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        [],
        `readonly [number | undefined]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [number | undefined]
└─ [0]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number | undefined]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("optional element", async () => {
      const schema = S.Tuple(S.optionalElement(S.Number))
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected readonly [number?], actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [number?]
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number?]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("optional element with undefined", async () => {
      const schema = S.Tuple(S.optionalElement(S.Union(S.Number, S.Undefined)))
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [undefined])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected readonly [number | undefined?], actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [number | undefined?]
└─ [0]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "b"],
        `readonly [number | undefined?]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("element / optional element", async () => {
      const schema = S.Tuple(S.String, S.optionalElement(S.Number))
      await Util.assertions.decoding.succeed(schema, ["a"])
      await Util.assertions.decoding.succeed(schema, ["a", 1])

      await Util.assertions.decoding.fail(
        schema,
        [1],
        `readonly [string, number?]
└─ [0]
   └─ Expected string, actual 1`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a", "b"],
        `readonly [string, number?]
└─ [1]
   └─ Expected number, actual "b"`
      )
    })

    it("e + r", async () => {
      const schema = S.Tuple([S.String], S.Number)
      await Util.assertions.decoding.succeed(schema, ["a"])
      await Util.assertions.decoding.succeed(schema, ["a", 1])
      await Util.assertions.decoding.succeed(schema, ["a", 1, 2])

      await Util.assertions.decoding.fail(
        schema,
        [],
        `readonly [string, ...number[]]
└─ [0]
   └─ is missing`
      )
    })

    it("e? + r", async () => {
      const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, ["a"])
      await Util.assertions.decoding.succeed(schema, ["a", 1])
      await Util.assertions.decoding.succeed(schema, ["a", 1, 2])

      await Util.assertions.decoding.fail(
        schema,
        [1],
        `readonly [string?, ...number[]]
└─ [0]
   └─ Expected string, actual 1`
      )
    })

    it("rest", async () => {
      const schema = S.Array(S.Number)
      await Util.assertions.decoding.succeed(schema, [])
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, [1, 2])

      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `ReadonlyArray<number>
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, "a"],
        `ReadonlyArray<number>
└─ [1]
   └─ Expected number, actual "a"`
      )
    })

    it("rest / element", async () => {
      const schema = S.Tuple([], S.String, S.Number)
      await Util.assertions.decoding.succeed(schema, [1])
      await Util.assertions.decoding.succeed(schema, ["a", 1])
      await Util.assertions.decoding.succeed(schema, ["a", "b", 1])

      await Util.assertions.decoding.fail(
        schema,
        [],
        `readonly [...string[], number]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [...string[], number]
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, 2],
        `readonly [...string[], number]
└─ [0]
   └─ Expected string, actual 1`
      )
    })

    it("element / rest / element", async () => {
      const schema = S.Tuple([S.String], S.Number, S.Boolean)
      await Util.assertions.decoding.succeed(schema, ["a", true])
      await Util.assertions.decoding.succeed(schema, ["a", 1, true])
      await Util.assertions.decoding.succeed(schema, ["a", 1, 2, true])

      await Util.assertions.decoding.fail(
        schema,
        [],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a"],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        ["a", 1],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ Expected boolean, actual 1`
      )
      await Util.assertions.decoding.fail(
        schema,
        [1, true],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ Expected string, actual 1`
      )
      await Util.assertions.decoding.fail(
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
      const schema = S.Tuple()
      await Util.assertions.encoding.succeed(schema, [], [])
    })

    it("element", async () => {
      const schema = S.Tuple(Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.fail(
        schema,
        [10],
        `readonly [NumberFromChar]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
      )
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("element with undefined", async () => {
      const schema = S.Tuple(S.Union(Util.NumberFromChar, S.Undefined))
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.succeed(schema, [undefined], [undefined])
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar | undefined]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("optional element", async () => {
      const schema = S.Tuple(S.optionalElement(Util.NumberFromChar))
      await Util.assertions.encoding.succeed(schema, [], [])
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.fail(
        schema,
        [10],
        `readonly [NumberFromChar?]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
      )
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar?]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("optional element with undefined", async () => {
      const schema = S.Tuple(S.optionalElement(S.Union(Util.NumberFromChar, S.Undefined)))
      await Util.assertions.encoding.succeed(schema, [], [])
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.succeed(schema, [undefined], [undefined])
      await Util.assertions.encoding.fail(
        schema,
        [1, "b"] as any,
        `readonly [NumberFromChar | undefined?]
└─ [1]
   └─ is unexpected, expected: 0`
      )
    })

    it("element / optional element", async () => {
      const schema = S.Tuple(S.String, S.optionalElement(Util.NumberFromChar))
      await Util.assertions.encoding.succeed(schema, ["a"], ["a"])
      await Util.assertions.encoding.succeed(schema, ["a", 1], ["a", "1"])
    })

    it("e + r", async () => {
      const schema = S.Tuple([S.String], Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, ["a"], ["a"])
      await Util.assertions.encoding.succeed(schema, ["a", 1], ["a", "1"])
      await Util.assertions.encoding.succeed(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("e? + r", async () => {
      const schema = S.Tuple([S.optionalElement(S.String)], Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, [], [])
      await Util.assertions.encoding.succeed(schema, ["a"], ["a"])
      await Util.assertions.encoding.succeed(schema, ["a", 1], ["a", "1"])
      await Util.assertions.encoding.succeed(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("rest", async () => {
      const schema = S.Array(Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, [], [])
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.succeed(schema, [1, 2], ["1", "2"])
      await Util.assertions.encoding.fail(
        schema,
        [10],
        `ReadonlyArray<NumberFromChar>
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
      )
    })

    it("rest / element", async () => {
      const schema = S.Tuple([], S.String, Util.NumberFromChar)
      await Util.assertions.encoding.succeed(schema, [1], ["1"])
      await Util.assertions.encoding.succeed(schema, ["a", 1], ["a", "1"])
      await Util.assertions.encoding.succeed(schema, ["a", "b", 1], ["a", "b", "1"])
      await Util.assertions.encoding.fail(
        schema,
        [] as any,
        `readonly [...string[], NumberFromChar]
└─ [0]
   └─ is missing`
      )
      await Util.assertions.encoding.fail(
        schema,
        [10],
        `readonly [...string[], NumberFromChar]
└─ [0]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
      )
    })

    it("element / rest / element", async () => {
      const schema = S.Tuple([S.String], Util.NumberFromChar, S.Boolean)
      await Util.assertions.encoding.succeed(schema, ["a", true], ["a", true])
      await Util.assertions.encoding.succeed(schema, ["a", 1, true], ["a", "1", true])
      await Util.assertions.encoding.succeed(schema, ["a", 1, 2, true], ["a", "1", "2", true])
    })
  })
})
