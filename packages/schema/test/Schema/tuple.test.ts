import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > tuple", () => {
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
      await Util.expectParseFailure(
        schema,
        [undefined],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is unexpected`
      )
      await Util.expectParseFailure(
        schema,
        [1],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is unexpected`
      )
    })

    it("required element", async () => {
      const schema = S.tuple(S.number)
      await Util.expectParseSuccess(schema, [1])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous tuple or array schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        [],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        [undefined],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected number, actual undefined`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, "b"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
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
      await Util.expectParseFailure(
        schema,
        [],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Union (2 members): number or undefined
      ├─ Union member: number
      │  └─ Expected number, actual "a"
      └─ Union member: undefined
         └─ Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, "b"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
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
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, "b"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
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
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Union (2 members): number or undefined
      ├─ Union member: number
      │  └─ Expected number, actual "a"
      └─ Union member: undefined
         └─ Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, "b"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
    })

    it("e e?", async () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(S.number))
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])

      await Util.expectParseFailure(
        schema,
        [1],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected string, actual 1`
      )
      await Util.expectParseFailure(
        schema,
        ["a", "b"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ Expected number, actual "b"`
      )
    })

    it("e r", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(S.number))
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", 1, 2])

      await Util.expectParseFailure(
        schema,
        [],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
    })

    it("e? r", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(S.number))
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, ["a"])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", 1, 2])

      await Util.expectParseFailure(
        schema,
        [1],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected string, actual 1`
      )
    })

    it("r", async () => {
      const schema = S.array(S.number)
      await Util.expectParseSuccess(schema, [])
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, [1, 2])

      await Util.expectParseFailure(
        schema,
        ["a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, "a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ Expected number, actual "a"`
      )
    })

    it("r e", async () => {
      const schema = S.array(S.string).pipe(S.element(S.number))
      await Util.expectParseSuccess(schema, [1])
      await Util.expectParseSuccess(schema, ["a", 1])
      await Util.expectParseSuccess(schema, ["a", "b", 1])

      await Util.expectParseFailure(
        schema,
        [],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        [1, 2],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected string, actual 1`
      )
    })

    it("e r e", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean))
      await Util.expectParseSuccess(schema, ["a", true])
      await Util.expectParseSuccess(schema, ["a", 1, true])
      await Util.expectParseSuccess(schema, ["a", 1, 2, true])

      await Util.expectParseFailure(
        schema,
        [],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        ["a"],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        ["a", 1],
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ Expected boolean, actual 1`
      )
      await Util.expectParseFailure(
        schema,
        [1, true],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected string, actual 1`
      )
      await Util.expectParseFailure(
        schema,
        [true],
        `Tuple or array: <anonymous tuple or array schema>
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

    it("e", async () => {
      const schema = S.tuple(Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected a character, actual "10"`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
    })

    it("e with undefined", async () => {
      const schema = S.tuple(S.union(Util.NumberFromChar, S.undefined))
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
    })

    it("e?", async () => {
      const schema = S.tuple().pipe(S.optionalElement(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected a character, actual "10"`
      )
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
    })

    it("e? with undefined", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.union(Util.NumberFromChar, S.undefined)))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [undefined], [undefined])
      await Util.expectEncodeFailure(
        schema,
        [1, "b"] as any,
        `Tuple or array: <anonymous tuple or array schema>
└─ [1]
   └─ is unexpected`
      )
    })

    it("e e?", async () => {
      const schema = S.tuple(S.string).pipe(S.optionalElement(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
    })

    it("e r", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("e? r", async () => {
      const schema = S.tuple().pipe(S.optionalElement(S.string), S.rest(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, ["a"], ["a"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2], ["a", "1", "2"])
    })

    it("r", async () => {
      const schema = S.array(Util.NumberFromChar)
      await Util.expectEncodeSuccess(schema, [], [])
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, [1, 2], ["1", "2"])
      await Util.expectEncodeFailure(
        schema,
        [10],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected a character, actual "10"`
      )
    })

    it("r e", async () => {
      const schema = S.array(S.string).pipe(S.element(Util.NumberFromChar))
      await Util.expectEncodeSuccess(schema, [1], ["1"])
      await Util.expectEncodeSuccess(schema, ["a", 1], ["a", "1"])
      await Util.expectEncodeSuccess(schema, ["a", "b", 1], ["a", "b", "1"])
      await Util.expectEncodeFailure(
        schema,
        [] as any,
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ is missing`
      )
      await Util.expectEncodeFailure(
        schema,
        [10],
        `Tuple or array: <anonymous tuple or array schema>
└─ [0]
   └─ Expected a character, actual "10"`
      )
    })

    it("e r e", async () => {
      const schema = S.tuple(S.string).pipe(S.rest(Util.NumberFromChar), S.element(S.boolean))
      await Util.expectEncodeSuccess(schema, ["a", true], ["a", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, true], ["a", "1", true])
      await Util.expectEncodeSuccess(schema, ["a", 1, 2, true], ["a", "1", "2", true])
    })
  })
})
