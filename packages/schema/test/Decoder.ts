import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as S from "@effect/schema"
import type { ParseOptions } from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Decoder", () => {
  it("exports", () => {
    expect(P.make).exist
    expect(P.decode).exist
    expect(P.decodeOrThrow).exist
  })

  it("asserts", () => {
    const schema = S.string
    expect(P.asserts(schema)("a")).toEqual(undefined)
    expect(() => P.asserts(schema)(1)).toThrowError(
      new Error(`1 error(s) found
└─ Expected string, actual 1`)
    )
  })

  it("decodeOrThrow", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })
    expect(P.decodeOrThrow(schema)({ name: "Alice", age: 30 })).toEqual({
      name: "Alice",
      age: 30
    })
    expect(() => P.decodeOrThrow(schema)({})).toThrowError(
      new Error(`1 error(s) found
└─ key "name"
   └─ is missing`)
    )
  })

  it(`transform. { a: 'a' } -> { a: 'a', b: none }`, () => {
    const from = S.struct({
      a: S.string,
      b: S.optional(S.union(S.undefined, S.nullable(S.number)))
    })

    const to = S.struct({
      a: S.string,
      b: S.option(S.number)
    })

    const schema = pipe(
      from,
      pipe(S.transform(to, (o) => ({ ...o, b: O.fromNullable(o.b) }), (o) => {
        const { b: b, ...rest } = o
        if (O.isSome(b)) {
          rest["b"] = b.value
        }
        return rest
      }))
    )

    Util.expectDecodingSuccess(schema, { a: "a" }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: undefined }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: null }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: O.some(1) })

    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: "b" },
      `1 error(s) found
└─ key "b"
   ├─ union member
   │  └─ Expected undefined, actual "b"
   ├─ union member
   │  └─ Expected null, actual "b"
   └─ union member
      └─ Expected number, actual "b"`
    )

    Util.expectEncodingSuccess(schema, { a: "a", b: O.none() }, { a: "a" })
    Util.expectEncodingSuccess(schema, { a: "a", b: O.some(1) }, { a: "a", b: 1 })
  })

  it("type alias without annotations", () => {
    const schema = S.typeAlias([], S.string)
    Util.expectDecodingSuccess(schema, "a", "a")

    Util.expectDecodingFailure(schema, 1, `Expected string, actual 1`)
  })

  it("annotations/message refinement", () => {
    const schema = pipe(
      // initial schema, a string
      S.string,
      // add an error message for non-string values
      S.message(() => "not a string"),
      // add a constraint to the schema, only non-empty strings are valid
      S.nonEmpty({ message: () => "required" }),
      // add a constraint to the schema, only strings with a length less or equal than 10 are valid
      S.maxLength(10, { message: (s) => `${s} is too long` })
    )

    Util.expectDecodingFailure(schema, null, "not a string")
    Util.expectDecodingFailure(schema, "", "required")
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingFailure(schema, "aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa is too long")
  })

  it("void", () => {
    const schema = S.void
    Util.expectDecodingSuccess(schema, undefined, undefined)
    Util.expectDecodingFailure(schema, 1, `Expected void, actual 1`)
  })

  it("any", () => {
    const schema = S.any
    Util.expectDecodingSuccess(schema, undefined, undefined)
    Util.expectDecodingSuccess(schema, null, null)
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, 1, 1)
    Util.expectDecodingSuccess(schema, true, true)
    Util.expectDecodingSuccess(schema, [], [])
    Util.expectDecodingSuccess(schema, {}, {})
  })

  it("unknown", () => {
    const schema = S.unknown
    Util.expectDecodingSuccess(schema, undefined, undefined)
    Util.expectDecodingSuccess(schema, null, null)
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, 1, 1)
    Util.expectDecodingSuccess(schema, true, true)
    Util.expectDecodingSuccess(schema, [], [])
    Util.expectDecodingSuccess(schema, {}, {})
  })

  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    Util.expectDecodingSuccess(schema, "a", "a")

    Util.expectDecodingFailure(schema, "ab", `Expected "a", actual "ab"`)
    Util.expectDecodingFailure(schema, "", `Expected "a", actual ""`)
    Util.expectDecodingFailure(schema, null, `Expected "a", actual null`)
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    Util.expectDecodingSuccess(schema, "a b", "a b")

    Util.expectDecodingFailure(schema, "a  b", `Expected "a b", actual "a  b"`)
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, "ab", "ab")

    Util.expectDecodingFailure(
      schema,
      null,
      "Expected a${string}, actual null"
    )
    Util.expectDecodingFailure(
      schema,
      "",
      "Expected a${string}, actual \"\""
    )
  })

  it("templateLiteral. a${number}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.number)
    Util.expectDecodingSuccess(schema, "a1", "a1")
    Util.expectDecodingSuccess(schema, "a1.2", "a1.2")

    Util.expectDecodingFailure(
      schema,
      null,
      "Expected a${number}, actual null"
    )
    Util.expectDecodingFailure(
      schema,
      "",
      "Expected a${number}, actual \"\""
    )
    Util.expectDecodingFailure(
      schema,
      "aa",
      "Expected a${number}, actual \"aa\""
    )
  })

  it("templateLiteral. ${string}", () => {
    const schema = S.templateLiteral(S.string)
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, "ab", "ab")
    Util.expectDecodingSuccess(schema, "", "")
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    Util.expectDecodingSuccess(schema, "ab", "ab")
    Util.expectDecodingSuccess(schema, "acb", "acb")
    Util.expectDecodingSuccess(schema, "abb", "abb")
    Util.expectDecodingFailure(
      schema,
      "",
      "Expected a${string}b, actual \"\""
    )
    Util.expectDecodingFailure(
      schema,
      "a",
      "Expected a${string}b, actual \"a\""
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      "Expected a${string}b, actual \"b\""
    )
  })

  it("templateLiteral. a${string}b${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"), S.string)
    Util.expectDecodingSuccess(schema, "ab", "ab")
    Util.expectDecodingSuccess(schema, "acb", "acb")
    Util.expectDecodingSuccess(schema, "acbd", "acbd")

    Util.expectDecodingFailure(
      schema,
      "a",
      "Expected a${string}b${string}, actual \"a\""
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      "Expected a${string}b${string}, actual \"b\""
    )
  })

  it("templateLiteral. https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", () => {
    const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")
    const schema = S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))
    Util.expectDecodingSuccess(schema, "welcome_email_id", "welcome_email_id")
    Util.expectDecodingSuccess(schema, "email_heading_id", "email_heading_id")
    Util.expectDecodingSuccess(schema, "footer_title_id", "footer_title_id")
    Util.expectDecodingSuccess(schema, "footer_sendoff_id", "footer_sendoff_id")

    Util.expectDecodingFailureTree(
      schema,
      "_id",
      `4 error(s) found
├─ union member
│  └─ Expected "welcome_email_id", actual "_id"
├─ union member
│  └─ Expected "email_heading_id", actual "_id"
├─ union member
│  └─ Expected "footer_title_id", actual "_id"
└─ union member
   └─ Expected "footer_sendoff_id", actual "_id"`
    )
  })

  it("never", () => {
    const schema = S.never
    Util.expectDecodingFailure(schema, 1, "Expected never, actual 1")
  })

  it("string", () => {
    const schema = S.string
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingFailure(schema, 1, "Expected string, actual 1")
  })

  it("number", () => {
    const schema = S.number
    Util.expectDecodingSuccess(schema, 1, 1)
    Util.expectDecodingSuccess(schema, NaN, NaN)
    Util.expectDecodingSuccess(schema, Infinity, Infinity)
    Util.expectDecodingSuccess(schema, -Infinity, -Infinity)
    Util.expectDecodingFailure(schema, "a", `Expected number, actual "a"`)
  })

  it("boolean", () => {
    const schema = S.boolean
    Util.expectDecodingSuccess(schema, true, true)
    Util.expectDecodingSuccess(schema, false, false)
    Util.expectDecodingFailure(schema, 1, `Expected boolean, actual 1`)
  })

  it("bigint", () => {
    const schema = S.bigint
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, 1n, 1n)

    Util.expectDecodingFailure(
      schema,
      null,
      "Expected bigint, actual null"
    )
    Util.expectDecodingFailure(
      schema,
      1.2,
      `Expected bigint, actual 1.2`
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.symbol
    Util.expectDecodingSuccess(schema, a)
    Util.expectDecodingFailure(
      schema,
      "@effect/schema/test/a",
      `Expected symbol, actual "@effect/schema/test/a"`
    )
  })

  it("object", () => {
    const schema = S.object
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingFailure(schema, null, `Expected object, actual null`)
    Util.expectDecodingFailure(schema, "a", `Expected object, actual "a"`)
    Util.expectDecodingFailure(schema, 1, `Expected object, actual 1`)
    Util.expectDecodingFailure(schema, true, `Expected object, actual true`)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(schema, "a", `Expected 1, actual "a"`)
    Util.expectDecodingFailure(schema, null, `Expected 1, actual null`)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailureTree(
      schema,
      null,
      `2 error(s) found
├─ union member
│  └─ Expected 1, actual null
└─ union member
   └─ Expected "a", actual null`
    )
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    Util.expectDecodingSuccess(schema, a)
    Util.expectDecodingSuccess(schema, Symbol.for("@effect/schema/test/a"))
    Util.expectDecodingFailure(
      schema,
      "Symbol(@effect/schema/test/a)",
      `Expected Symbol(@effect/schema/test/a), actual "Symbol(@effect/schema/test/a)"`
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    Util.expectDecodingSuccess(schema, Fruits.Apple)
    Util.expectDecodingSuccess(schema, Fruits.Banana)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(
      schema,
      3,
      `Expected 0 | 1, actual 3`
    )
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    Util.expectDecodingSuccess(schema, Fruits.Apple)
    Util.expectDecodingSuccess(schema, Fruits.Cantaloupe)
    Util.expectDecodingSuccess(schema, "apple")
    Util.expectDecodingSuccess(schema, "banana")
    Util.expectDecodingSuccess(schema, 0)

    Util.expectDecodingFailure(
      schema,
      "Cantaloupe",
      `Expected 0 | 1 | 2, actual "Cantaloupe"`
    )
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    Util.expectDecodingSuccess(schema, "apple")
    Util.expectDecodingSuccess(schema, "banana")
    Util.expectDecodingSuccess(schema, 3)

    Util.expectDecodingFailure(
      schema,
      "Cantaloupe",
      `Expected 0 | 1 | 2, actual "Cantaloupe"`
    )
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(schema, {}, `Expected tuple or array, actual {}`)
    Util.expectDecodingFailure(schema, [undefined], `/0 is unexpected`)
    Util.expectDecodingFailure(schema, [1], `/0 is unexpected`)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    Util.expectDecodingSuccess(schema, [1])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(
      schema,
      [undefined],
      `/0 Expected number, actual undefined`
    )
    Util.expectDecodingFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.number))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 Expected number, actual "a"`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected tuple or array, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. e e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])

    Util.expectDecodingFailure(schema, [1], `/0 Expected string, actual 1`)
    Util.expectDecodingFailure(schema, ["a", "b"], `/1 Expected number, actual "b"`)
  })

  it("tuple. e r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number))
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])
    Util.expectDecodingSuccess(schema, ["a", 1, 2])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
  })

  it("tuple. e? r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(S.number))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])
    Util.expectDecodingSuccess(schema, ["a", 1, 2])

    Util.expectDecodingFailure(schema, [1], `/0 Expected string, actual 1`)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, 2])

    Util.expectDecodingFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    Util.expectDecodingFailure(schema, [1, "a"], `/1 Expected number, actual "a"`)
  })

  it("tuple. r e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, ["a", 1])
    Util.expectDecodingSuccess(schema, ["a", "b", 1])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/0 Expected number, actual "a"`)
    Util.expectDecodingFailure(schema, [1, 2], `/0 Expected string, actual 1`)
  })

  it("tuple. e r e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    Util.expectDecodingSuccess(schema, ["a", true])
    Util.expectDecodingSuccess(schema, ["a", 1, true])
    Util.expectDecodingSuccess(schema, ["a", 1, 2, true])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/1 is missing`)
    Util.expectDecodingFailure(schema, [true], `/0 Expected string, actual true`)
    Util.expectDecodingFailure(schema, ["a", 1], `/1 Expected boolean, actual 1`)
    Util.expectDecodingFailure(schema, [1, true], `/0 Expected string, actual 1`)
  })

  it("struct/empty", () => {
    const schema = S.struct({})
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
  })

  it("struct/ required property signature", () => {
    const schema = S.struct({ a: S.number })
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
    Util.expectDecodingFailure(schema, {}, "/a is missing")
    Util.expectDecodingFailure(
      schema,
      { a: undefined },
      "/a Expected number, actual undefined"
    )
    Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
  })

  it("struct/ required property signature with undefined", () => {
    const schema = S.struct({ a: S.union(S.number, S.undefined) })
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, { a: undefined })

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
    Util.expectDecodingFailure(schema, {}, "/a is missing")
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
  })

  it("struct/ optional property signature", () => {
    const schema = S.struct({ a: S.optional(S.number) })
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a Expected number, actual "a"`
    )
    Util.expectDecodingFailure(
      schema,
      { a: undefined },
      `/a Expected number, actual undefined`
    )
    Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
  })

  it("struct/ optional property signature with undefined", () => {
    const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, { a: undefined })

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
    )
    Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
  })

  it("struct/ should not add optional keys", () => {
    const schema = S.partial(S.struct({ a: S.string, b: S.number }))
    Util.expectDecodingSuccess(schema, {})
  })

  it("struct/extend record(string, string)", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.extend(S.record(S.string, S.string))
    )
    Util.expectDecodingSuccess(schema, { a: "a" })
    Util.expectDecodingSuccess(schema, { a: "a", b: "b" })

    Util.expectDecodingFailure(schema, {}, "/a is missing")
    Util.expectDecodingFailure(schema, { b: "b" }, "/a is missing")
    Util.expectDecodingFailure(schema, { a: 1 }, "/a Expected string, actual 1")
    Util.expectDecodingFailure(
      schema,
      { a: "a", b: 1 },
      "/b Expected string, actual 1"
    )
  })

  it("struct/ record(string, number)", () => {
    const schema = S.record(S.string, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "Expected type literal, actual []"
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a Expected number, actual "a"`
    )
  })

  it("struct/ record(symbol, number)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.record(S.symbol, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { [a]: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "Expected type literal, actual []"
    )
    Util.expectDecodingFailure(
      schema,
      { [a]: "a" },
      `/Symbol(@effect/schema/test/a) Expected number, actual "a"`
    )
  })

  it("struct/ record(never, number)", () => {
    const schema = S.record(S.never, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
  })

  it("struct/ record('a' | 'b', number)", () => {
    const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
  })

  it("struct/ record(keyof struct({ a, b }), number)", () => {
    const schema = S.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
  })

  it("struct/ record(keyof struct({ a, b } & Record<string, string>), number)", () => {
    const schema = S.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.string, S.string)))),
      S.number
    )
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, { b: 2 })

    Util.expectDecodingFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
  })

  it("struct/ record(keyof struct({ a, b } & Record<symbol, string>), number)", () => {
    const schema = S.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.symbol, S.string)))),
      S.number
    )
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })
    const c = Symbol.for("@effect/schema/test/c")
    Util.expectDecodingSuccess(schema, { a: 1, b: 2, [c]: 3 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: "a" }, `/a Expected number, actual "a"`)
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: 2, [c]: "c" },
      `/Symbol(@effect/schema/test/c) Expected number, actual "c"`
    )
  })

  it("struct/ record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const b = Symbol.for("@effect/schema/test/b")
    const schema = S.record(S.union(S.uniqueSymbol(a), S.uniqueSymbol(b)), S.number)
    Util.expectDecodingSuccess(schema, { [a]: 1, [b]: 2 })

    Util.expectDecodingFailure(schema, {}, `/Symbol(@effect/schema/test/a) is missing`)
    Util.expectDecodingFailure(
      schema,
      { [a]: 1 },
      `/Symbol(@effect/schema/test/b) is missing`
    )
    Util.expectDecodingFailure(
      schema,
      { [b]: 2 },
      `/Symbol(@effect/schema/test/a) is missing`
    )
  })

  it("struct/ record(${string}-${string}, number)", () => {
    const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { "-": 1 })
    Util.expectDecodingSuccess(schema, { "a-": 1 })
    Util.expectDecodingSuccess(schema, { "-b": 1 })
    Util.expectDecodingSuccess(schema, { "a-b": 1 })

    Util.expectDecodingFailure(
      schema,
      { "": 1 },
      "/ Expected ${string}-${string}, actual \"\""
    )
    Util.expectDecodingFailure(
      schema,
      { "-": "a" },
      `/- Expected number, actual "a"`
    )
  })

  it("struct/ record(minLength(1), number)", () => {
    const schema = S.record(pipe(S.string, S.minLength(2)), S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { "aa": 1 })
    Util.expectDecodingSuccess(schema, { "aaa": 1 })

    Util.expectDecodingFailure(
      schema,
      { "": 1 },
      `/ Expected a string at least 2 character(s) long, actual ""`
    )
    Util.expectDecodingFailure(
      schema,
      { "a": 1 },
      `/a Expected a string at least 2 character(s) long, actual "a"`
    )
  })

  it("union/ empty union", () => {
    const schema = S.union()
    Util.expectDecodingFailure(schema, 1, "Expected never, actual 1")
  })

  it("union/ members with literals but the input doesn't have any", () => {
    const schema = S.union(
      S.struct({ a: S.literal(1), c: S.string }),
      S.struct({ b: S.literal(2), d: S.number })
    )
    Util.expectDecodingFailure(schema, null, "Expected type literal, actual null")
    Util.expectDecodingFailure(schema, {}, "/a is missing, /b is missing")
    Util.expectDecodingFailure(schema, { a: null }, `/a Expected 1, actual null, /b is missing`)
    Util.expectDecodingFailure(schema, { b: 3 }, `/a is missing, /b Expected 2, actual 3`)
  })

  it("union/ members with multiple tags", () => {
    const schema = S.union(
      S.struct({ category: S.literal("catA"), tag: S.literal("a") }),
      S.struct({ category: S.literal("catA"), tag: S.literal("b") }),
      S.struct({ category: S.literal("catA"), tag: S.literal("c") })
    )
    Util.expectDecodingFailure(schema, null, "Expected type literal, actual null")
    Util.expectDecodingFailure(schema, {}, "/category is missing, /tag is missing")
    Util.expectDecodingFailure(
      schema,
      { category: null },
      `/category Expected "catA", actual null, /tag is missing`
    )
    Util.expectDecodingFailure(
      schema,
      { tag: "d" },
      `/category is missing, /tag Expected "b" or "c", actual "d"`
    )
  })

  it("union/required property signatures: should return the best output", () => {
    const a = S.struct({ a: S.string })
    const ab = S.struct({ a: S.string, b: S.number })
    const schema = S.union(a, ab)
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 })
  })

  it("union/optional property signatures: should return the best output", () => {
    const ab = S.struct({ a: S.string, b: S.optional(S.number) })
    const ac = S.struct({ a: S.string, c: S.optional(S.number) })
    const schema = S.union(ab, ac)
    Util.expectDecodingSuccess(schema, { a: "a", c: 1 })
  })

  it("lazy/ baseline", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: S.string,
        as: S.array(schema)
      })
    )

    Util.expectDecodingSuccess(schema, { a: "a1", as: [] })
    Util.expectDecodingSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

    Util.expectDecodingFailure(
      schema,
      null,
      `Expected type literal, actual null`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a1" },
      `/as is missing`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 Expected type literal, actual 1"
    )
  })

  it("lazy/ mutually recursive", () => {
    interface Expression {
      readonly type: "expression"
      readonly value: number | Operation
    }

    interface Operation {
      readonly type: "operation"
      readonly operator: "+" | "-"
      readonly left: Expression
      readonly right: Expression
    }

    const Expression: S.Schema<Expression> = S.lazy(() =>
      S.struct({
        type: S.literal("expression"),
        value: S.union(S.number, Operation)
      })
    )

    const Operation: S.Schema<Operation> = S.lazy(() =>
      S.struct({
        type: S.literal("operation"),
        operator: S.union(S.literal("+"), S.literal("-")),
        left: Expression,
        right: Expression
      })
    )

    const input = {
      type: "operation",
      operator: "+",
      left: {
        type: "expression",
        value: {
          type: "operation",
          operator: "-",
          left: {
            type: "expression",
            value: 2
          },
          right: {
            type: "expression",
            value: 3
          }
        }
      },
      right: {
        type: "expression",
        value: 1
      }
    }

    Util.expectDecodingSuccess(Operation, input)
  })

  it("partial/ struct", () => {
    const schema = S.partial(S.struct({ a: S.number }))
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      { a: undefined },
      `/a Expected number, actual undefined`
    )
  })

  it("partial/ tuple", () => {
    const schema = S.partial(S.tuple(S.string, S.number))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])
  })

  it("partial/ array", () => {
    const schema = S.partial(S.array(S.number))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailureTree(
      schema,
      ["a"],
      `1 error(s) found
└─ index 0
   ├─ union member
   │  └─ Expected number, actual "a"
   └─ union member
      └─ Expected undefined, actual "a"`
    )
  })

  it("partial/ union", () => {
    const schema = S.partial(S.union(S.string, S.array(S.number)))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailureTree(
      schema,
      ["a"],
      `2 error(s) found
├─ union member
│  └─ index 0
│     ├─ union member
│     │  └─ Expected number, actual "a"
│     └─ union member
│        └─ Expected undefined, actual "a"
└─ union member
   └─ Expected string, actual ["a"]`
    )
  })

  it("omit/ baseline", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.omit("c"))
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      "Expected type literal, actual null"
    )
    Util.expectDecodingFailure(schema, { a: "a" }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 1 }, "/a is missing")
  })

  it("omit/ involving a symbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.omit("c"))
    Util.expectDecodingSuccess(schema, { [a]: "a", b: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      "Expected type literal, actual null"
    )
    Util.expectDecodingFailure(schema, { [a]: "a" }, `/b is missing`)
    Util.expectDecodingFailure(
      schema,
      { b: 1 },
      `/Symbol(@effect/schema/test/a) is missing`
    )
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("nonEmpty", () => {
    const schema = pipe(S.string, S.nonEmpty())
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "aa")

    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("length", () => {
    const schema = pipe(S.string, S.length(1))
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string at least 1 character(s) long, actual ""`
    )
    Util.expectDecodingFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("startsWith", () => {
    const schema = pipe(S.string, S.startsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ab")

    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string starting with "a", actual ""`
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      `Expected a string starting with "a", actual "b"`
    )
  })

  it("endsWith", () => {
    const schema = pipe(S.string, S.endsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ba")

    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string ending with "a", actual ""`
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      `Expected a string ending with "a", actual "b"`
    )
  })

  it("pattern", () => {
    const schema = pipe(S.string, S.pattern(/^abb+$/))
    Util.expectDecodingSuccess(schema, "abb")
    Util.expectDecodingSuccess(schema, "abbb")

    Util.expectDecodingFailure(
      schema,
      "ab",
      `Expected a string matching the pattern ^abb+$, actual "ab"`
    )
    Util.expectDecodingFailure(
      schema,
      "a",
      `Expected a string matching the pattern ^abb+$, actual "a"`
    )
  })

  // ---------------------------------------------
  // isUnexpectedAllowed option
  // ---------------------------------------------

  const isUnexpectedAllowed: ParseOptions = {
    isUnexpectedAllowed: true
  }

  it("isUnexpectedAllowed/union choose the output with more info", () => {
    const a = S.struct({ a: S.optional(S.number) })
    const b = S.struct({ a: S.optional(S.number), b: S.optional(S.string) })
    const schema = S.union(a, b)
    Util.expectDecodingSuccess(
      schema,
      { a: 1, b: "b", c: true },
      {
        a: 1,
        b: "b"
      },
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple of a struct", () => {
    const schema = S.tuple(S.struct({ b: S.number }))
    Util.expectDecodingSuccess(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple rest element of a struct", () => {
    const schema = S.array(S.struct({ b: S.number }))
    Util.expectDecodingSuccess(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple. post rest elements of a struct", () => {
    const schema = pipe(S.array(S.string), S.element(S.struct({ b: S.number })))
    Util.expectDecodingSuccess(schema, [{ b: 1 }])
    Util.expectDecodingSuccess(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple excess elements", () => {
    const schema = S.tuple(S.number)
    Util.expectDecodingSuccess(schema, [1, "b"], [1], isUnexpectedAllowed)
  })

  it("isUnexpectedAllowed/struct excess property signatures", () => {
    const schema = S.struct({ a: S.number })
    Util.expectDecodingSuccess(
      schema,
      { a: 1, b: "b" },
      { a: 1 },
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/struct nested struct", () => {
    const schema = S.struct({ a: S.struct({ b: S.number }) })
    Util.expectDecodingSuccess(
      schema,
      { a: { b: 1, c: "c" } },
      {
        a: { b: 1 }
      },
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/record of struct", () => {
    const schema = S.record(S.string, S.struct({ b: S.number }))
    Util.expectDecodingSuccess(
      schema,
      { a: { b: 1, c: "c" } },
      { a: { b: 1 } },
      isUnexpectedAllowed
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  const allErrors: ParseOptions = {
    allErrors: true
  }

  it("allErrors/tuple: missing element", () => {
    const schema = S.tuple(S.string, S.number)
    Util.expectDecodingFailure(schema, [], `/0 is missing, /1 is missing`, allErrors)
  })

  it("allErrors/tuple: wrong type for values", () => {
    const schema = S.tuple(S.string, S.number)
    Util.expectDecodingFailure(
      schema,
      [1, "b"],
      `/0 Expected string, actual 1, /1 Expected number, actual "b"`,
      allErrors
    )
  })

  it("allErrors/tuple: unexpected indexes", () => {
    const schema = S.tuple()
    Util.expectDecodingFailure(schema, ["a", "b"], `/0 is unexpected, /1 is unexpected`, allErrors)
  })

  it("allErrors/tuple/rest: wrong type for values", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number))
    Util.expectDecodingFailure(
      schema,
      ["a", "b", "c"],
      `/1 Expected number, actual "b", /2 Expected number, actual "c"`,
      allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", () => {
    const schema = pipe(S.array(S.boolean), S.element(S.number), S.element(S.number))
    Util.expectDecodingFailure(
      schema,
      ["a", "b"],
      `/0 Expected number, actual "a", /1 Expected number, actual "b"`,
      allErrors
    )
  })

  it("allErrors/struct: missing keys", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    Util.expectDecodingFailure(schema, {}, `/a is missing, /b is missing`, allErrors)
  })

  it("allErrors/struct: wrong type for values", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: "b" },
      `/a Expected string, actual 1, /b Expected number, actual "b"`,
      allErrors
    )
  })

  it("allErrors/struct: unexpected keys", () => {
    const schema = S.struct({ a: S.number })
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: "b", c: "c" },
      `/b is unexpected, /c is unexpected`,
      allErrors
    )
  })

  it("allErrors/record: wrong type for keys", () => {
    const schema = S.record(pipe(S.string, S.minLength(2)), S.number)
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: 2 },
      `/a Expected a string at least 2 character(s) long, actual "a", /b Expected a string at least 2 character(s) long, actual "b"`,
      allErrors
    )
  })

  it("allErrors/record: wrong type for values", () => {
    const schema = S.record(S.string, S.number)
    Util.expectDecodingFailure(
      schema,
      { a: "a", b: "b" },
      `/a Expected number, actual "a", /b Expected number, actual "b"`,
      allErrors
    )
  })

  it("extend struct with record", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.extend(S.record(S.string, S.boolean))
    )

    Util.expectDecodingSuccess(schema, { a: "a" })
  })
})
