import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DataOption from "@fp-ts/schema/data/Option"
import * as P from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

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
└─ 1 must be a string`)
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

    Util.expectDecodingSuccess(schema, { a: "a" }, { a: "a", b: O.none })
    Util.expectDecodingSuccess(schema, { a: "a", b: undefined }, { a: "a", b: O.none })
    Util.expectDecodingSuccess(schema, { a: "a", b: null }, { a: "a", b: O.none })
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: O.some(1) })

    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: "b" },
      `1 error(s) found
└─ key "b"
   ├─ union member
   │  └─ "b" must be undefined
   ├─ union member
   │  └─ "b" must be the literal null
   └─ union member
      └─ "b" must be a number`
    )

    Util.expectEncodingSuccess(schema, { a: "a", b: O.none }, { a: "a" })
    Util.expectEncodingSuccess(schema, { a: "a", b: O.some(1) }, { a: "a", b: 1 })
  })

  it("type alias without annotations", () => {
    const schema = DataOption.option(S.string)
    Util.expectDecodingSuccess(schema, O.none, O.none)
    Util.expectDecodingSuccess(schema, O.some("a"), O.some("a"))

    Util.expectDecodingFailure(
      schema,
      O.some(1),
      `union member: /value 1 must be a string, union member: /_tag "Some" must be the literal "None"`
    )
  })

  it("void", () => {
    const schema = S.void
    Util.expectDecodingSuccess(schema, undefined, undefined)
    Util.expectDecodingFailure(schema, 1, `1 must be void`)
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

    Util.expectDecodingFailure(schema, "ab", `"ab" must be the literal "a"`)
    Util.expectDecodingFailure(schema, "", `"" must be the literal "a"`)
    Util.expectDecodingFailure(schema, null, `null must be the literal "a"`)
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    Util.expectDecodingSuccess(schema, "a b", "a b")

    Util.expectDecodingFailure(schema, "a  b", `"a  b" must be the literal "a b"`)
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingSuccess(schema, "ab", "ab")

    Util.expectDecodingFailure(
      schema,
      null,
      "null must be a value conforming to the template literal a${string}"
    )
    Util.expectDecodingFailure(
      schema,
      "",
      "\"\" must be a value conforming to the template literal a${string}"
    )
  })

  it("templateLiteral. a${number}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.number)
    Util.expectDecodingSuccess(schema, "a1", "a1")
    Util.expectDecodingSuccess(schema, "a1.2", "a1.2")

    Util.expectDecodingFailure(
      schema,
      null,
      "null must be a value conforming to the template literal a${number}"
    )
    Util.expectDecodingFailure(
      schema,
      "",
      "\"\" must be a value conforming to the template literal a${number}"
    )
    Util.expectDecodingFailure(
      schema,
      "aa",
      "\"aa\" must be a value conforming to the template literal a${number}"
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
      "\"\" must be a value conforming to the template literal a${string}b"
    )
    Util.expectDecodingFailure(
      schema,
      "a",
      "\"a\" must be a value conforming to the template literal a${string}b"
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      "\"b\" must be a value conforming to the template literal a${string}b"
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
      "\"a\" must be a value conforming to the template literal a${string}b${string}"
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      "\"b\" must be a value conforming to the template literal a${string}b${string}"
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
│  └─ "_id" must be the literal "welcome_email_id"
├─ union member
│  └─ "_id" must be the literal "email_heading_id"
├─ union member
│  └─ "_id" must be the literal "footer_title_id"
└─ union member
   └─ "_id" must be the literal "footer_sendoff_id"`
    )
  })

  it("never", () => {
    const schema = S.never
    Util.expectDecodingFailure(schema, 1, "1 must be never")
  })

  it("string", () => {
    const schema = S.string
    Util.expectDecodingSuccess(schema, "a", "a")
    Util.expectDecodingFailure(schema, 1, "1 must be a string")
  })

  it("number", () => {
    const schema = S.number
    Util.expectDecodingSuccess(schema, 1, 1)
    Util.expectDecodingSuccess(schema, NaN, NaN)
    Util.expectDecodingSuccess(schema, Infinity, Infinity)
    Util.expectDecodingSuccess(schema, -Infinity, -Infinity)
    Util.expectDecodingFailure(schema, "a", `"a" must be a number`)
  })

  it("boolean", () => {
    const schema = S.boolean
    Util.expectDecodingSuccess(schema, true, true)
    Util.expectDecodingSuccess(schema, false, false)
    Util.expectDecodingFailure(schema, 1, `1 must be a boolean`)
  })

  it("bigint", () => {
    const schema = S.bigint
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, 1n, 1n)

    Util.expectDecodingFailure(
      schema,
      null,
      "null must be a bigint"
    )
    Util.expectDecodingFailure(
      schema,
      1.2,
      `1.2 must be a bigint`
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.symbol
    Util.expectDecodingSuccess(schema, a)
    Util.expectDecodingFailure(
      schema,
      "@fp-ts/schema/test/a",
      `"@fp-ts/schema/test/a" must be a symbol`
    )
  })

  it("object", () => {
    const schema = S.object
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingFailure(schema, null, `null must be an object`)
    Util.expectDecodingFailure(schema, "a", `"a" must be an object`)
    Util.expectDecodingFailure(schema, 1, `1 must be an object`)
    Util.expectDecodingFailure(schema, true, `true must be an object`)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(schema, "a", `"a" must be the literal 1`)
    Util.expectDecodingFailure(schema, null, `null must be the literal 1`)
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
│  └─ null must be the literal 1
└─ union member
   └─ null must be the literal "a"`
    )
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.uniqueSymbol(a)
    Util.expectDecodingSuccess(schema, a)
    Util.expectDecodingSuccess(schema, Symbol.for("@fp-ts/schema/test/a"))
    Util.expectDecodingFailure(
      schema,
      "Symbol(@fp-ts/schema/test/a)",
      `"Symbol(@fp-ts/schema/test/a)" must be the unique symbol Symbol(@fp-ts/schema/test/a)`
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums("Fruits", Fruits)
    Util.expectDecodingSuccess(schema, Fruits.Apple)
    Util.expectDecodingSuccess(schema, Fruits.Banana)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(
      schema,
      3,
      `3 must be a value conforming to the enum Fruits`
    )
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums("Fruits", Fruits)
    Util.expectDecodingSuccess(schema, Fruits.Apple)
    Util.expectDecodingSuccess(schema, Fruits.Cantaloupe)
    Util.expectDecodingSuccess(schema, "apple")
    Util.expectDecodingSuccess(schema, "banana")
    Util.expectDecodingSuccess(schema, 0)

    Util.expectDecodingFailure(
      schema,
      "Cantaloupe",
      `"Cantaloupe" must be a value conforming to the enum Fruits`
    )
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums("Fruits", Fruits)
    Util.expectDecodingSuccess(schema, "apple")
    Util.expectDecodingSuccess(schema, "banana")
    Util.expectDecodingSuccess(schema, 3)

    Util.expectDecodingFailure(
      schema,
      "Cantaloupe",
      `"Cantaloupe" must be a value conforming to the enum Fruits`
    )
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be a tuple or an array`
    )
    Util.expectDecodingFailure(schema, {}, `{} must be a tuple or an array`)
    Util.expectDecodingFailure(schema, [undefined], `/0 is unexpected`)
    Util.expectDecodingFailure(schema, [1], `/0 is unexpected`)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    Util.expectDecodingSuccess(schema, [1])

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be a tuple or an array`
    )
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(
      schema,
      [undefined],
      `/0 undefined must be a number`
    )
    Util.expectDecodingFailure(schema, ["a"], `/0 "a" must be a number`)
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be a tuple or an array`
    )
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 union member: "a" must be a number, union member: "a" must be undefined`
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
      `null must be a tuple or an array`
    )
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 "a" must be a number`
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
      `null must be a tuple or an array`
    )
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 union member: "a" must be a number, union member: "a" must be undefined`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. e e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])

    Util.expectDecodingFailure(schema, [1], `/0 1 must be a string`)
    Util.expectDecodingFailure(schema, ["a", "b"], `/1 "b" must be a number`)
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

    Util.expectDecodingFailure(schema, [1], `/0 1 must be a string`)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, 2])

    Util.expectDecodingFailure(schema, ["a"], `/0 "a" must be a number`)
    Util.expectDecodingFailure(schema, [1, "a"], `/1 "a" must be a number`)
  })

  it("tuple. r e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, ["a", 1])
    Util.expectDecodingSuccess(schema, ["a", "b", 1])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/0 "a" must be a number`)
    Util.expectDecodingFailure(schema, [1, 2], `/0 1 must be a string`)
  })

  it("tuple. e r e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    Util.expectDecodingSuccess(schema, ["a", true])
    Util.expectDecodingSuccess(schema, ["a", 1, true])
    Util.expectDecodingSuccess(schema, ["a", 1, 2, true])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/1 is missing`)
    Util.expectDecodingFailure(schema, [true], `/0 true must be a string`)
    Util.expectDecodingFailure(schema, ["a", 1], `/1 1 must be a boolean`)
    Util.expectDecodingFailure(schema, [1, true], `/0 1 must be a string`)
  })

  it("struct/empty", () => {
    const schema = S.struct({})
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be an object`
    )
  })

  it("struct/ required property signature", () => {
    const schema = S.struct({ a: S.number })
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be an object`
    )
    Util.expectDecodingFailure(schema, {}, "/a is missing")
    Util.expectDecodingFailure(
      schema,
      { a: undefined },
      "/a undefined must be a number"
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
      `null must be an object`
    )
    Util.expectDecodingFailure(schema, {}, "/a is missing")
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a union member: "a" must be a number, union member: "a" must be undefined`
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
      `null must be an object`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a "a" must be a number`
    )
    Util.expectDecodingFailure(
      schema,
      { a: undefined },
      `/a undefined must be a number`
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
      `null must be an object`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a union member: "a" must be a number, union member: "a" must be undefined`
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
    Util.expectDecodingFailure(schema, { a: 1 }, "/a 1 must be a string")
    Util.expectDecodingFailure(
      schema,
      { a: "a", b: 1 },
      "/b 1 must be a string"
    )
  })

  it("struct/ record(string, number)", () => {
    const schema = S.record(S.string, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "[] must be an object"
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a "a" must be a number`
    )
  })

  it("struct/ record(symbol, number)", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.record(S.symbol, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { [a]: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "[] must be an object"
    )
    Util.expectDecodingFailure(
      schema,
      { [a]: "a" },
      `/Symbol(@fp-ts/schema/test/a) "a" must be a number`
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
    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" must be a number`)
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

    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" must be a number`)
  })

  it("struct/ record(keyof struct({ a, b } & Record<symbol, string>), number)", () => {
    const schema = S.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.symbol, S.string)))),
      S.number
    )
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })
    const c = Symbol.for("@fp-ts/schema/test/c")
    Util.expectDecodingSuccess(schema, { a: 1, b: 2, [c]: 3 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" must be a number`)
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: 2, [c]: "c" },
      `/Symbol(@fp-ts/schema/test/c) "c" must be a number`
    )
  })

  it("struct/ record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const b = Symbol.for("@fp-ts/schema/test/b")
    const schema = S.record(S.union(S.uniqueSymbol(a), S.uniqueSymbol(b)), S.number)
    Util.expectDecodingSuccess(schema, { [a]: 1, [b]: 2 })

    Util.expectDecodingFailure(schema, {}, `/Symbol(@fp-ts/schema/test/a) is missing`)
    Util.expectDecodingFailure(
      schema,
      { [a]: 1 },
      `/Symbol(@fp-ts/schema/test/b) is missing`
    )
    Util.expectDecodingFailure(
      schema,
      { [b]: 2 },
      `/Symbol(@fp-ts/schema/test/a) is missing`
    )
  })

  it("struct/ record(keyof Option<number>, number)", () => {
    const schema = S.record(S.keyof(S.option(S.number)), S.number)
    Util.expectDecodingSuccess(schema, { _tag: 1 })

    Util.expectDecodingFailure(schema, {}, `/_tag is missing`)
    Util.expectDecodingFailure(
      schema,
      { _tag: "a" },
      `/_tag "a" must be a number`
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
      "/ \"\" must be a value conforming to the template literal ${string}-${string}"
    )
    Util.expectDecodingFailure(
      schema,
      { "-": "a" },
      `/- "a" must be a number`
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
      `/ "" must be a string at least 2 character(s) long`
    )
    Util.expectDecodingFailure(
      schema,
      { "a": 1 },
      `/a "a" must be a string at least 2 character(s) long`
    )
  })

  it("union/ empty union", () => {
    const schema = S.union()
    Util.expectDecodingFailure(schema, 1, "1 must be never")
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
    const schema: S.Schema<A> = S.lazy<A>("A", () =>
      S.struct({
        a: S.string,
        as: S.array(schema)
      }))

    Util.expectDecodingSuccess(schema, { a: "a1", as: [] })
    Util.expectDecodingSuccess(schema, { a: "a1", as: [{ a: "a2", as: [] }] })

    Util.expectDecodingFailure(
      schema,
      null,
      `null must be an object`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a1" },
      `/as is missing`
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 must be an object"
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

    const Expression: S.Schema<Expression> = S.lazy("Expression", () =>
      S.struct({
        type: S.literal("expression"),
        value: S.union(S.number, Operation)
      }))

    const Operation: S.Schema<Operation> = S.lazy("Operation", () =>
      S.struct({
        type: S.literal("operation"),
        operator: S.union(S.literal("+"), S.literal("-")),
        left: Expression,
        right: Expression
      }))

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
      `/a undefined must be a number`
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
   │  └─ "a" must be a number
   └─ union member
      └─ "a" must be undefined`
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
│     │  └─ "a" must be a number
│     └─ union member
│        └─ "a" must be undefined
└─ union member
   └─ ["a"] must be a string`
    )
  })

  it("omit/ baseline", () => {
    const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.omit("c"))
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      "null must be an object"
    )
    Util.expectDecodingFailure(schema, { a: "a" }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 1 }, "/a is missing")
  })

  it("omit/ involving a symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
    const schema = pipe(base, S.omit("c"))
    Util.expectDecodingSuccess(schema, { [a]: "a", b: 1 })

    Util.expectDecodingFailure(
      schema,
      null,
      "null must be an object"
    )
    Util.expectDecodingFailure(schema, { [a]: "a" }, `/b is missing`)
    Util.expectDecodingFailure(
      schema,
      { b: 1 },
      `/Symbol(@fp-ts/schema/test/a) is missing`
    )
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(
      schema,
      "aa",
      `"aa" must be a string at most 1 character(s) long`
    )
  })

  it("nonEmpty", () => {
    const schema = pipe(S.string, S.nonEmpty)
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "aa")

    Util.expectDecodingFailure(
      schema,
      "",
      `"" must be a string at least 1 character(s) long`
    )
  })

  it("length", () => {
    const schema = pipe(S.string, S.length(1))
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(
      schema,
      "",
      `"" must be a string at least 1 character(s) long`
    )
    Util.expectDecodingFailure(
      schema,
      "aa",
      `"aa" must be a string at most 1 character(s) long`
    )
  })

  it("startsWith", () => {
    const schema = pipe(S.string, S.startsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ab")

    Util.expectDecodingFailure(
      schema,
      "",
      `"" must be a string starting with "a"`
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      `"b" must be a string starting with "a"`
    )
  })

  it("endsWith", () => {
    const schema = pipe(S.string, S.endsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ba")

    Util.expectDecodingFailure(
      schema,
      "",
      `"" must be a string ending with "a"`
    )
    Util.expectDecodingFailure(
      schema,
      "b",
      `"b" must be a string ending with "a"`
    )
  })

  it("pattern", () => {
    const schema = pipe(S.string, S.pattern(/^abb+$/))
    Util.expectDecodingSuccess(schema, "abb")
    Util.expectDecodingSuccess(schema, "abbb")

    Util.expectDecodingFailure(
      schema,
      "ab",
      `"ab" must be a string matching the pattern ^abb+$`
    )
    Util.expectDecodingFailure(
      schema,
      "a",
      `"a" must be a string matching the pattern ^abb+$`
    )
  })

  // ---------------------------------------------
  // isUnexpectedAllowed option
  // ---------------------------------------------

  const isUnexpectedAllowed: P.ParseOptions = {
    isUnexpectedAllowed: true
  }

  it("isUnexpectedAllowed/union choose the output with less warnings related to unexpected keys / indexes", () => {
    const a = S.struct({ a: S.optional(S.number) })
    const b = S.struct({ a: S.optional(S.number), b: S.optional(S.string) })
    const schema = S.union(a, b)
    Util.expectDecodingWarning(
      schema,
      { a: 1, b: "b", c: true },
      {
        a: 1,
        b: "b"
      },
      `/c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed/tuple unexpected indexes", () => {
    const schema = S.tuple(S.struct({ b: S.number }))
    Util.expectDecodingWarning(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      `/0 /c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed. tuple. rest element warnings", () => {
    const schema = S.array(S.struct({ b: S.number }))
    Util.expectDecodingWarning(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      `/0 /c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed. tuple. post rest elements warnings", () => {
    const schema = pipe(S.array(S.string), S.element(S.struct({ b: S.number })))
    Util.expectDecodingSuccess(schema, [{ b: 1 }])
    Util.expectDecodingWarning(
      schema,
      [{ b: 1, c: "c" }],
      [{ b: 1 }],
      `/0 /c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed. tuple. allowUnexpected = true", () => {
    const schema = S.tuple(S.number)
    Util.expectDecodingWarning(schema, [1, "b"], [1], `/1 is unexpected`, isUnexpectedAllowed)
  })

  it("isUnexpectedAllowed. struct. allowUnexpected = true", () => {
    const schema = S.struct({ a: S.number })
    Util.expectDecodingWarning(
      schema,
      { a: 1, b: "b" },
      { a: 1 },
      `/b is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed. struct. key warnings", () => {
    const schema = S.struct({ a: S.struct({ b: S.number }) })
    Util.expectDecodingWarning(
      schema,
      { a: { b: 1, c: "c" } },
      {
        a: { b: 1 }
      },
      `/a /c is unexpected`,
      isUnexpectedAllowed
    )
  })

  it("isUnexpectedAllowed. struct. index signature warnings", () => {
    const schema = S.record(S.string, S.struct({ b: S.number }))
    Util.expectDecodingWarning(
      schema,
      { a: { b: 1, c: "c" } },
      { a: { b: 1 } },
      `/a /c is unexpected`,
      isUnexpectedAllowed
    )
  })

  // ---------------------------------------------
  // allErrors option
  // ---------------------------------------------

  const allErrors: P.ParseOptions = {
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
      `/0 1 must be a string, /1 "b" must be a number`,
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
      `/1 "b" must be a number, /2 "c" must be a number`,
      allErrors
    )
  })

  it("allErrors/tuple/post rest elements: wrong type for values", () => {
    const schema = pipe(S.array(S.boolean), S.element(S.number), S.element(S.number))
    Util.expectDecodingFailure(
      schema,
      ["a", "b"],
      `/0 "a" must be a number, /1 "b" must be a number`,
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
      `/a 1 must be a string, /b "b" must be a number`,
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
      `/a "a" must be a string at least 2 character(s) long, /b "b" must be a string at least 2 character(s) long`,
      allErrors
    )
  })

  it("allErrors/record: wrong type for values", () => {
    const schema = S.record(S.string, S.number)
    Util.expectDecodingFailure(
      schema,
      { a: "a", b: "b" },
      `/a "a" must be a number, /b "b" must be a number`,
      allErrors
    )
  })
})
