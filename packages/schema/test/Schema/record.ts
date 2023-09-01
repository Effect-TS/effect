import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Schema/record", () => {
  describe.concurrent("decoding", () => {
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
        "Expected a generic object, actual []"
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a Expected number, actual "a"`
      )
      const b = Symbol.for("@effect/schema/test/b")
      await Util.expectParseFailure(
        schema,
        { a: 1, [b]: "b" },
        "/Symbol(@effect/schema/test/b) is unexpected",
        Util.onExcessPropertyError
      )
      await Util.expectParseSuccess(
        schema,
        { a: 1, [b]: "b" },
        { a: 1 }
      )
    })

    it("record(symbol, number)", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const schema = S.record(S.symbol, S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { [a]: 1 })

      await Util.expectParseFailure(
        schema,
        [],
        "Expected a generic object, actual []"
      )
      await Util.expectParseFailure(
        schema,
        { [a]: "a" },
        `/Symbol(@effect/schema/test/a) Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { [a]: 1, b: "b" },
        "/b is unexpected",
        Util.onExcessPropertyError
      )
      await Util.expectParseSuccess(
        schema,
        { [a]: 1, b: "b" },
        { [a]: 1 }
      )
    })

    it("record(never, number)", async () => {
      const schema = S.record(S.never, S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })
    })

    it("record('a' | 'b', number)", async () => {
      const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })

      await Util.expectParseFailure(schema, {}, `/a is missing`)
      await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
      await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
    })

    it("record(keyof struct({ a, b }), number)", async () => {
      const schema = S.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })

      await Util.expectParseFailure(schema, {}, `/a is missing`)
      await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
      await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
      await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
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

      await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
    })

    it("record(keyof struct({ a, b } & Record<symbol, string>), number)", async () => {
      const schema = S.record(
        S.keyof(
          S.struct({ a: S.string, b: S.string }).pipe(S.extend(S.record(S.symbol, S.string)))
        ),
        S.number
      )
      await Util.expectParseSuccess(schema, { a: 1, b: 2 })
      const c = Symbol.for("@effect/schema/test/c")
      await Util.expectParseSuccess(schema, { a: 1, b: 2, [c]: 3 })

      await Util.expectParseFailure(schema, {}, `/a is missing`)
      await Util.expectParseFailure(schema, { a: 1 }, `/b is missing`)
      await Util.expectParseFailure(schema, { b: 2 }, `/a is missing`)
      await Util.expectParseFailure(
        schema,
        { a: 1, b: 2, [c]: "c" },
        `/Symbol(@effect/schema/test/c) Expected number, actual "c"`
      )
      await Util.expectParseFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
    })

    it("record(Symbol('a') | Symbol('b'), number)", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.record(S.union(S.uniqueSymbol(a), S.uniqueSymbol(b)), S.number)
      await Util.expectParseSuccess(schema, { [a]: 1, [b]: 2 })

      await Util.expectParseFailure(schema, {}, `/Symbol(@effect/schema/test/a) is missing`)
      await Util.expectParseFailure(
        schema,
        { [a]: 1 },
        `/Symbol(@effect/schema/test/b) is missing`
      )
      await Util.expectParseFailure(
        schema,
        { [b]: 2 },
        `/Symbol(@effect/schema/test/a) is missing`
      )
    })

    it("record(${string}-${string}, number)", async () => {
      const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "-": 1 })
      await Util.expectParseSuccess(schema, { "a-": 1 })
      await Util.expectParseSuccess(schema, { "-b": 1 })
      await Util.expectParseSuccess(schema, { "a-b": 1 })

      await Util.expectParseFailure(
        schema,
        { "": 1 },
        "/ Expected ${string}-${string}, actual \"\""
      )
      await Util.expectParseFailure(
        schema,
        { "-": "a" },
        `/- Expected number, actual "a"`
      )
    })

    it("record(minLength(2), number)", async () => {
      const schema = S.record(S.string.pipe(S.minLength(2)), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "aa": 1 })
      await Util.expectParseSuccess(schema, { "aaa": 1 })

      await Util.expectParseFailure(
        schema,
        { "": 1 },
        `/ Expected a string at least 2 character(s) long, actual ""`
      )
      await Util.expectParseFailure(
        schema,
        { "a": 1 },
        `/a Expected a string at least 2 character(s) long, actual "a"`
      )
    })

    it("should support branded keys", async () => {
      const schema = S.record(S.NonEmpty.pipe(S.brand("UserId")), S.number)
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { "a": 1 })

      await Util.expectParseFailure(
        schema,
        { "": 1 },
        `/ Expected a non empty string, actual ""`
      )
    })
  })

  describe.concurrent("encoding", () => {
    // raises an error while encoding if the string is not a char
    const Char = S.string.pipe(S.length(1))

    it("key error", async () => {
      const schema = S.record(Char, S.string)
      await Util.expectEncodeFailure(
        schema,
        { aa: "a" },
        `/aa Expected a character, actual "aa"`
      )
    })

    it("value error", async () => {
      const schema = S.record(S.string, Char)
      await Util.expectEncodeFailure(
        schema,
        { a: "aa" },
        `/a Expected a character, actual "aa"`
      )
    })
  })
})
