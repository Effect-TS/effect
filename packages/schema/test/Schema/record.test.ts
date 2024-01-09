import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > record", () => {
  describe("decoding", () => {
    it("record(never, number)", async () => {
      const schema = S.record(S.never, S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })
    })

    it("record(string, number)", async () => {
      const schema = S.record(S.string, S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })

      await Util.expectParseFailure(
        schema,
        [],
        "Expected { [x: string]: number }, actual []"
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `{ [x: string]: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
      )
      const b = Symbol.for("@effect/schema/test/b")
      await Util.expectParseSuccess(schema, { a: 1, [b]: "b" }, { a: 1 })
      await Util.expectParseFailure(
        schema,
        { a: 1, [b]: "b" },
        `{ [x: string]: number }
└─ [Symbol(@effect/schema/test/b)]
   └─ is unexpected, expected a string`,
        Util.onExcessPropertyError
      )
    })

    it("record(symbol, number)", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const schema = S.record(S.symbolFromSelf, S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { [a]: 1 })

      await Util.expectParseFailure(
        schema,
        [],
        "Expected { [x: symbol]: number }, actual []"
      )
      await Util.expectParseFailure(
        schema,
        { [a]: "a" },
        `{ [x: symbol]: number }
└─ [Symbol(@effect/schema/test/a)]
   └─ Expected a number, actual "a"`
      )
      await Util.expectParseSuccess(
        schema,
        { [a]: 1, b: "b" },
        { [a]: 1 }
      )
      await Util.expectParseFailure(
        schema,
        { [a]: 1, b: "b" },
        `{ [x: symbol]: number }
└─ ["b"]
   └─ is unexpected, expected a symbol`,
        Util.onExcessPropertyError
      )
    })

    it("record('a' | 'b', number)", async () => {
      const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })

      await Util.expectParseFailure(
        schema,
        {},
        `{ a: number; b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1 },
        `{ a: number; b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { b: 2 },
        `{ a: number; b: number }
└─ ["a"]
   └─ is missing`
      )
    })

    it("record('a' | `prefix-${string}`, number)", async () => {
      const schema = S.record(
        S.union(S.literal("a"), S.templateLiteral(S.literal("prefix-"), S.string)),
        S.number
      )
      await Util.expectParseSuccess(schema, { a: 1 })
      await Util.expectParseSuccess(schema, { a: 1, "prefix-b": 2 })

      await Util.expectParseFailure(
        schema,
        {},
        `{ a: number; [x: \`prefix-\${string}\`]: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, "prefix-b": "b" },
        `{ a: number; [x: \`prefix-\${string}\`]: number }
└─ ["prefix-b"]
   └─ Expected a number, actual "b"`
      )
    })

    it("record(keyof struct({ a, b }), number)", async () => {
      const schema = S.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })

      await Util.expectParseFailure(
        schema,
        {},
        `{ a: number; b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1 },
        `{ a: number; b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { b: 2 },
        `{ a: number; b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `{ a: number; b: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
      )
    })

    it("record(keyof struct({ a, b } & Record<string, string>), number)", async () => {
      const schema = S.record(
        S.keyof(
          S.struct({ a: S.string, b: S.string }).pipe(S.extend(S.record(S.string, S.string)))
        ),
        S.number
      )
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })
      await Util.expectParseSuccess(schema, { b: 2 })

      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `{ [x: string]: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
      )
    })

    it("record(keyof struct({ a, b } & Record<symbol, string>), number)", async () => {
      const schema = S.record(
        S.keyof(
          S.struct({ a: S.string, b: S.string }).pipe(
            S.extend(S.record(S.symbolFromSelf, S.string))
          )
        ),
        S.number
      )
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })
      const c = Symbol.for("@effect/schema/test/c")
      await Util.expectParseSuccess(schema, { a: 1, b: 2, [c]: 3 })

      await Util.expectParseFailure(
        schema,
        {},
        `{ a: number; b: number; [x: symbol]: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1 },
        `{ a: number; b: number; [x: symbol]: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { b: 2 },
        `{ a: number; b: number; [x: symbol]: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: 2, [c]: "c" },
        `{ a: number; b: number; [x: symbol]: number }
└─ [Symbol(@effect/schema/test/c)]
   └─ Expected a number, actual "c"`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `{ a: number; b: number; [x: symbol]: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
      )
    })

    it("record(Symbol('a') | Symbol('b'), number)", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.record(S.union(S.uniqueSymbol(a), S.uniqueSymbol(b)), S.number)
      await Util.expectParseSuccess(schema, { [a]: 1, [b]: 2 })

      await Util.expectParseFailure(
        schema,
        {},
        `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/a)]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { [a]: 1 },
        `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/b)]
   └─ is missing`
      )
      await Util.expectParseFailure(
        schema,
        { [b]: 2 },
        `{ Symbol(@effect/schema/test/a): number; Symbol(@effect/schema/test/b): number }
└─ [Symbol(@effect/schema/test/a)]
   └─ is missing`
      )
    })

    it("record(${string}-${string}, number)", async () => {
      const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "-": 1 })
      await Util.expectParseSuccess(schema, { "a-": 1 })
      await Util.expectParseSuccess(schema, { "-b": 1 })
      await Util.expectParseSuccess(schema, { "a-b": 1 })
      await Util.expectParseSuccess(schema, { "": 1 }, {})
      await Util.expectParseSuccess(schema, { "a": 1 }, {})
      await Util.expectParseSuccess(schema, { "a": "a" }, {})

      await Util.expectParseFailure(
        schema,
        { "-": "a" },
        `{ [x: \`\${string}-\${string}\`]: number }
└─ ["-"]
   └─ Expected a number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { "a-": "a" },
        `{ [x: \`\${string}-\${string}\`]: number }
└─ ["a-"]
   └─ Expected a number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { "-b": "b" },
        `{ [x: \`\${string}-\${string}\`]: number }
└─ ["-b"]
   └─ Expected a number, actual "b"`
      )
      await Util.expectParseFailure(
        schema,
        { "a-b": "ab" },
        `{ [x: \`\${string}-\${string}\`]: number }
└─ ["a-b"]
   └─ Expected a number, actual "ab"`
      )

      await Util.expectParseFailure(
        schema,
        { "a": 1 },
        `{ [x: \`\${string}-\${string}\`]: number }
└─ ["a"]
   └─ is unexpected, expected \`\${string}-\${string}\``,
        Util.onExcessPropertyError
      )
    })

    it("record(minLength(2), number)", async () => {
      const schema = S.record(S.string.pipe(S.minLength(2)), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "a": 1 }, {})
      await Util.expectParseSuccess(schema, { "a": "a" }, {})
      await Util.expectParseSuccess(schema, { "aa": 1 })
      await Util.expectParseSuccess(schema, { "aaa": 1 })

      await Util.expectParseFailure(
        schema,
        { "aa": "aa" },
        `{ [x: string]: number }
└─ ["aa"]
   └─ Expected a number, actual "aa"`
      )
      await Util.expectParseFailure(
        schema,
        { "a": 1 },
        `{ [x: string]: number }
└─ ["a"]
   └─ is unexpected, expected a string at least 2 character(s) long`,
        Util.onExcessPropertyError
      )
    })

    it("record(${string}-${string}, number) & record(string, string | number)", async () => {
      const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number).pipe(
        S.extend(S.record(S.string, S.union(S.string, S.number)))
      )
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "a": "a" })
      await Util.expectParseSuccess(schema, { "a-": 1 })

      await Util.expectParseFailure(
        schema,
        { "a-": "a" },
        `{ [x: \`\${string}-\${string}\`]: number; [x: string]: string | number }
└─ ["a-"]
   └─ Expected a number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { "a": true },
        `{ [x: \`\${string}-\${string}\`]: number; [x: string]: string | number }
└─ ["a"]
   └─ string | number
      ├─ Union member
      │  └─ Expected a string, actual true
      └─ Union member
         └─ Expected a number, actual true`
      )
    })

    it("should support branded keys", async () => {
      const schema = S.record(S.NonEmpty.pipe(S.brand("UserId")), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "a": 1 })
      await Util.expectParseSuccess(schema, { "": 1 }, {})
      await Util.expectParseSuccess(schema, { "": "" }, {})

      await Util.expectParseFailure(
        schema,
        { "": 1 },
        `{ [x: string]: number }
└─ [""]
   └─ is unexpected, expected NonEmpty (a non empty string)`,
        Util.onExcessPropertyError
      )
    })
  })

  describe("encoding", () => {
    it("key error", async () => {
      const schema = S.record(S.Char, S.string)
      await Util.expectEncodeFailure(
        schema,
        { aa: "a" },
        `{ [x: string]: string }
└─ ["aa"]
   └─ is unexpected, expected Char (a single character)`,
        Util.onExcessPropertyError
      )
    })

    it("value error", async () => {
      const schema = S.record(S.string, S.Char)
      await Util.expectEncodeFailure(
        schema,
        { a: "aa" },
        `{ [x: string]: Char }
└─ ["a"]
   └─ Char
      └─ Predicate refinement failure
         └─ Expected Char (a single character), actual "aa"`
      )
    })
  })
})
