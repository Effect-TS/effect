import * as Either from "effect/Either"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { assert, describe, expect, it } from "vitest"

describe("record", () => {
  it("annotations()", () => {
    const schema = S.Record({ key: S.String, value: S.Number }).annotations({ identifier: "X" }).annotations({
      title: "Y"
    })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the key and the value", () => {
    const schema = S.Record({ key: S.String, value: S.Number })
    expect(schema.key).toStrictEqual(S.String)
    expect(schema.value).toStrictEqual(S.Number)
  })

  it("should compute the partial result", () => {
    const schema = S.Record({ key: S.String, value: S.Number })
    const all = S.decodeUnknownEither(schema)({ a: 1, b: "b", c: 2, d: "d" }, { errors: "all" })
    if (Either.isLeft(all)) {
      const issue = all.left.issue
      if (ParseResult.isComposite(issue)) {
        expect(issue.output).toStrictEqual({ a: 1, c: 2 })
      } else {
        assert.fail("expected an And")
      }
    } else {
      assert.fail("expected a Left")
    }
    const first = S.decodeUnknownEither(schema)({ a: 1, b: "b", c: 2, d: "d" }, { errors: "first" })
    if (Either.isLeft(first)) {
      const issue = first.left.issue
      if (ParseResult.isComposite(issue)) {
        expect(issue.output).toStrictEqual({ a: 1 })
      } else {
        assert.fail("expected an And")
      }
    } else {
      assert.fail("expected a Left")
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
      await Util.expectDecodeUnknownSuccess(schema, { [Abc.A]: "A", [Abc.B]: "B", [Abc.C]: "C" })
      await Util.expectDecodeUnknownSuccess(schema, { [1]: "A", b: "B", c: "C" })
      await Util.expectDecodeUnknownSuccess(schema, { "1": "A", b: "B", c: "C" })

      await Util.expectDecodeUnknownFailure(
        schema,
        { [Abc.B]: "B", [Abc.C]: "C" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ [1]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [Abc.A]: "A", [Abc.B]: "B" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ ["c"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [Abc.A]: null, [Abc.B]: "B", [Abc.C]: "C" },
        `{ readonly 1: string; readonly b: string; readonly c: string }
└─ [1]
   └─ Expected string, actual null`
      )
    })

    it("Record(never, number)", async () => {
      const schema = S.Record({ key: S.Never, value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
    })

    it("Record(string, number)", async () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        "Expected { readonly [x: string]: number }, actual []"
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly [x: string]: number }
└─ ["a"]
   └─ Expected number, actual "a"`
      )
      const b = Symbol.for("effect/Schema/test/b")
      await Util.expectDecodeUnknownSuccess(schema, { a: 1, [b]: "b" }, { a: 1 })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, [b]: "b" },
        `{ readonly [x: string]: number }
└─ [Symbol(effect/Schema/test/b)]
   └─ is unexpected, expected: string`,
        Util.onExcessPropertyError
      )
    })

    it("Record(symbol, number)", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Record({ key: S.SymbolFromSelf, value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { [a]: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        [],
        "Expected { readonly [x: symbol]: number }, actual []"
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: "a" },
        `{ readonly [x: symbol]: number }
└─ [Symbol(effect/Schema/test/a)]
   └─ Expected number, actual "a"`
      )
      await Util.expectDecodeUnknownSuccess(
        schema,
        { [a]: 1, b: "b" },
        { [a]: 1 }
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: 1, b: "b" },
        `{ readonly [x: symbol]: number }
└─ ["b"]
   └─ is unexpected, expected: symbol`,
        Util.onExcessPropertyError
      )
    })

    it("Record('a' | 'b', number)", async () => {
      const schema = S.Record({ key: S.Union(S.Literal("a"), S.Literal("b")), value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1, b: 2 })

      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1 },
        `{ readonly a: number; readonly b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
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
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1, "prefix-b": 2 })

      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly a: number; readonly [x: \`prefix-\${string}\`]: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, "prefix-b": "b" },
        `{ readonly a: number; readonly [x: \`prefix-\${string}\`]: number }
└─ ["prefix-b"]
   └─ Expected number, actual "b"`
      )
    })

    it("Record(keyof struct({ a, b }), number)", async () => {
      const schema = S.Record({ key: S.keyof(S.Struct({ a: S.String, b: S.String })), value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1, b: 2 })

      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1 },
        `{ readonly a: number; readonly b: number }
└─ ["b"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { b: 2 },
        `{ readonly a: number; readonly b: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
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
      await Util.expectDecodeUnknownSuccess(schema, { [a]: 1, [b]: 2 })

      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/a)]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [a]: 1 },
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/b)]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { [b]: 2 },
        `{ readonly Symbol(effect/Schema/test/a): number; readonly Symbol(effect/Schema/test/b): number }
└─ [Symbol(effect/Schema/test/a)]
   └─ is missing`
      )
    })

    it("Record(${string}-${string}, number)", async () => {
      const schema = S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { "-": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "a-": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "-b": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "a-b": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "": 1 }, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": 1 }, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": "a" }, {})

      await Util.expectDecodeUnknownFailure(
        schema,
        { "-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["-"]
   └─ Expected number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { "a-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a-"]
   └─ Expected number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { "-b": "b" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["-b"]
   └─ Expected number, actual "b"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { "a-b": "ab" },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a-b"]
   └─ Expected number, actual "ab"`
      )

      await Util.expectDecodeUnknownFailure(
        schema,
        { "a": 1 },
        `{ readonly [x: \`\${string}-\${string}\`]: number }
└─ ["a"]
   └─ is unexpected, expected: \`\${string}-\${string}\``,
        Util.onExcessPropertyError
      )
    })

    it("Record(minLength(2), number)", async () => {
      const schema = S.Record({ key: S.String.pipe(S.minLength(2)), value: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": 1 }, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": "a" }, {})
      await Util.expectDecodeUnknownSuccess(schema, { "aa": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "aaa": 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        { "aa": "aa" },
        `{ readonly [x: a string at least 2 character(s) long]: number }
└─ ["aa"]
   └─ Expected number, actual "aa"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { "a": 1 },
        `{ readonly [x: a string at least 2 character(s) long]: number }
└─ ["a"]
   └─ is unexpected, expected: a string at least 2 character(s) long`,
        Util.onExcessPropertyError
      )
    })

    it("Record(${string}-${string}, number) & record(string, string | number)", async () => {
      const schema = S.Struct(
        {},
        S.Record({ key: S.TemplateLiteral(S.String, S.Literal("-"), S.String), value: S.Number }),
        S.Record({ key: S.String, value: S.Union(S.String, S.Number) })
      )
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": "a" })
      await Util.expectDecodeUnknownSuccess(schema, { "a-": 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        { "a-": "a" },
        `{ readonly [x: \`\${string}-\${string}\`]: number; readonly [x: string]: string | number }
└─ ["a-"]
   └─ Expected number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
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
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { "a": 1 })
      await Util.expectDecodeUnknownSuccess(schema, { "": 1 }, {})
      await Util.expectDecodeUnknownSuccess(schema, { "": "" }, {})

      await Util.expectDecodeUnknownFailure(
        schema,
        { "": 1 },
        `{ readonly [x: NonEmptyString]: number }
└─ [""]
   └─ is unexpected, expected: NonEmptyString`,
        Util.onExcessPropertyError
      )
    })
  })

  describe("encoding", () => {
    it("key error", async () => {
      const schema = S.Record({ key: S.Char, value: S.String })
      await Util.expectEncodeFailure(
        schema,
        { aa: "a" },
        `{ readonly [x: Char]: string }
└─ ["aa"]
   └─ is unexpected, expected: Char`,
        Util.onExcessPropertyError
      )
    })

    it("value error", async () => {
      const schema = S.Record({ key: S.String, value: S.Char })
      await Util.expectEncodeFailure(
        schema,
        { a: "aa" },
        `{ readonly [x: string]: Char }
└─ ["a"]
   └─ Char
      └─ Predicate refinement failure
         └─ Expected Char, actual "aa"`
      )
    })
  })
})
