import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("record", () => {
  it("should expose the key and the value", () => {
    const schema = S.Record({ key: S.String, value: S.Number })
    strictEqual(schema.key, S.String)
    strictEqual(schema.value, S.Number)
  })

  it("should compute the partial result", () => {
    const schema = S.Record({ key: S.String, value: S.Number })
    const all = S.decodeUnknownEither(schema)({ a: 1, b: "b", c: 2, d: "d" }, { errors: "all" })
    if (Either.isLeft(all)) {
      const issue = all.left.issue
      if (ParseResult.isComposite(issue)) {
        deepStrictEqual(issue.output, { a: 1, c: 2 })
      } else {
        throw new Error("expected an And")
      }
    } else {
      throw new Error("expected a Left")
    }
    const first = S.decodeUnknownEither(schema)({ a: 1, b: "b", c: 2, d: "d" }, { errors: "first" })
    if (Either.isLeft(first)) {
      const issue = first.left.issue
      if (ParseResult.isComposite(issue)) {
        deepStrictEqual(issue.output, { a: 1 })
      } else {
        throw new Error("expected an And")
      }
    } else {
      throw new Error("expected a Left")
    }
  })

  describe("decoding", () => {
    it("Record(enum, number)", async () => {
      enum Abc {
        A = 1,
        B = "b",
        C = "c"
      }
      const AbcSchema = S.Enums(Abc)
      const schema = S.Record({ key: AbcSchema, value: S.String })
      await Util.assertions.decoding.succeed(schema, { [Abc.A]: "A", [Abc.B]: "B", [Abc.C]: "C" })
      await Util.assertions.decoding.succeed(schema, { [1]: "A", b: "B", c: "C" })
      await Util.assertions.decoding.succeed(schema, { "1": "A", b: "B", c: "C" })

      await Util.assertions.decoding.fail(
        schema,
        { [Abc.B]: "B", [Abc.C]: "C" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ [1]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { [Abc.A]: "A", [Abc.B]: "B" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ ["c"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { [Abc.A]: null, [Abc.B]: "B", [Abc.C]: "C" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ [1]
   └─ Expected string, actual null`
      )
    })

    it("Record(never, number)", async () => {
      const schema = S.Record({ key: S.Never, value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })
    })

    it("Record(string, number)", async () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })

      await Util.assertions.decoding.fail(
        schema,
        [],
        "Expected { readonly [x: string]: number }, actual []"
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly [x: string]: number }
└─ ["a"]
   └─ Expected number, actual "a"`
      )
      const b = Symbol.for("effect/Schema/test/b")
      await Util.assertions.decoding.succeed(schema, { a: 1, [b]: "b" }, { a: 1 })
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, [b]: "b" },
        `{ readonly [x: string]: number }
└─ [Symbol(effect/Schema/test/b)]
   └─ is unexpected, expected: string`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("Record(symbol, number)", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { [a]: 1 })

      await Util.assertions.decoding.fail(
        schema,
        [],
        "Expected { readonly [x: symbol]: number }, actual []"
      )
      await Util.assertions.decoding.fail(
        schema,
        { [a]: "a" },
        `{ readonly [x: symbol]: number }
└─ [Symbol(effect/Schema/test/a)]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.succeed(
        schema,
        { [a]: 1, b: "b" },
        { [a]: 1 }
      )
      await Util.assertions.decoding.fail(
        schema,
        { [a]: 1, b: "b" },
        `{ readonly [x: symbol]: number }
└─ ["b"]
   └─ is unexpected, expected: symbol`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("Record('a' | 'b', number)", async () => {
      const schema = S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.Number })
      await Util.assertions.decoding.succeed(schema, { a: 1, b: 2 })

      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1 },
        `{ readonly a: number; readonly b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { b: 2 },
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
    })

    it("Record('a' | `prefix-${string}`, number)", async () => {
      const schema = S.Record(
        { key: S.Union(S.Literal("a"), S.TemplateLiteral(S.Literal("prefix-"), S.String)), value: S.Number }
      )
      await Util.assertions.decoding.succeed(schema, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: 1, "prefix-b": 2 })

      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: number; readonly [x: \`prefix-\${string}\`]: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, "prefix-b": "b" },
        `{ readonly a: number; readonly [x: \`prefix-\${string}\`]: number }
└─ ["prefix-b"]
   └─ Expected number, actual "b"`
      )
    })

    it("Record(keyof struct({ a, b }), number)", async () => {
      const schema = S.Record({ key: S.keyof(S.Struct({ a: S.String, b: S.String })), value: S.Number })
      await Util.assertions.decoding.succeed(schema, { a: 1, b: 2 })

      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1 },
        `{ readonly a: number; readonly b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { b: 2 },
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ Expected number, actual "a"`
      )
    })

    it("Record(Symbol('a') | Symbol('b'), number)", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Record({ key: S.Union(S.UniqueSymbolFromSelf(a), S.UniqueSymbolFromSelf(b)), value: S.Number })
      await Util.assertions.decoding.succeed(schema, { [a]: 1, [b]: 2 })

      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/a)]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { [a]: 1 },
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/b)]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { [b]: 2 },
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/a)]
   └─ is missing`
      )
    })

    it("Record(${string}-${string}, number)", async () => {
      const schema = S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { "-": 1 })
      await Util.assertions.decoding.succeed(schema, { "a-": 1 })
      await Util.assertions.decoding.succeed(schema, { "-b": 1 })
      await Util.assertions.decoding.succeed(schema, { "a-b": 1 })
      await Util.assertions.decoding.succeed(schema, { "": 1 }, {})
      await Util.assertions.decoding.succeed(schema, { "a": 1 }, {})
      await Util.assertions.decoding.succeed(schema, { "a": "a" }, {})

      await Util.assertions.decoding.fail(
        schema,
        { "-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["-"]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { "a-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a-"]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { "-b": "b" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["-b"]
   └─ Expected number, actual "b"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { "a-b": "ab" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a-b"]
   └─ Expected number, actual "ab"`
      )

      await Util.assertions.decoding.fail(
        schema,
        { "a": 1 },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a"]
   └─ is unexpected, expected: \`\${string}-\${string}\``,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("Record(minLength(2), number)", async () => {
      const schema = S.Record({ key: S.String.pipe(S.minLength(2)), value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { "a": 1 }, {})
      await Util.assertions.decoding.succeed(schema, { "a": "a" }, {})
      await Util.assertions.decoding.succeed(schema, { "aa": 1 })
      await Util.assertions.decoding.succeed(schema, { "aaa": 1 })

      await Util.assertions.decoding.fail(
        schema,
        { "aa": "aa" },
        `{ readonly [x: minLength(2)]: number }
└─ ["aa"]
   └─ Expected number, actual "aa"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { "a": 1 },
        `{ readonly [x: minLength(2)]: number }
└─ ["a"]
   └─ is unexpected, expected: minLength(2)`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("Record(${string}-${string}, number) & record(string, string | number)", async () => {
      const schema = S.Struct(
        {},
        S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number }),
        S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
      )
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { "a": "a" })
      await Util.assertions.decoding.succeed(schema, { "a-": 1 })

      await Util.assertions.decoding.fail(
        schema,
        { "a-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number; readonly [x: string]: string | number }
└─ ["a-"]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { "a": true },
        `{ readonly [x: \`\${string}-\${string}\`]: number; readonly [x: string]: string | number }
└─ ["a"]
   └─ string | number
      ├─ Expected string, actual true
      └─ Expected number, actual true`
      )
    })

    it("should support branded keys", async () => {
      const schema = S.Record({ key: S.NonEmptyString.pipe(S.brand("UserId")), value: S.Number })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { "a": 1 })
      await Util.assertions.decoding.succeed(schema, { "": 1 }, {})
      await Util.assertions.decoding.succeed(schema, { "": "" }, {})

      await Util.assertions.decoding.fail(
        schema,
        { "": 1 },
        `{ readonly [x: nonEmptyString & Brand<"UserId">]: number }
└─ [""]
   └─ is unexpected, expected: nonEmptyString & Brand<"UserId">`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })
  })

  describe("encoding", () => {
    it("key error", async () => {
      const schema = S.Record({ key: S.Char, value: S.String })
      await Util.assertions.encoding.fail(
        schema,
        { aa: "a" },
        `{ readonly [x: Char]: string }
└─ ["aa"]
   └─ is unexpected, expected: Char`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("value error", async () => {
      const schema = S.Record({ key: S.String, value: S.Char })
      await Util.assertions.encoding.fail(
        schema,
        { a: "aa" },
        `{ readonly [x: string]: Char }
└─ ["a"]
   └─ Char
      └─ Predicate refinement failure
         └─ Expected a single character, actual "aa"`
      )
    })
  })
})
