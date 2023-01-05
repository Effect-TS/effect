import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import { format } from "@fp-ts/schema/formatter/Tree"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Decoder", () => {
  it("exports", () => {
    expect(D.make).exist
    expect(D.decode).exist
    expect(D.decodeOrThrow).exist
    expect(D.decoderFor).exist
  })

  it("decodeOrThrow", () => {
    const schema = S.struct({
      name: S.string,
      age: S.number
    })
    expect(D.decodeOrThrow(schema)({ name: "Alice", age: 30 })).toEqual({ name: "Alice", age: 30 })
    expect(() => D.decodeOrThrow(schema)({})).toThrowError(
      new Error(`1 error(s) found
└─ key "name"
   └─ is missing`)
    )
    const result = D.decode(schema)({})
    if (DE.isFailure(result)) {
      // console.log(format(result.left))
      format(result.left)
    }
  })

  it("sensitive", () => {
    const schema = S.struct({ password: S.sensitive(pipe(S.string, S.minLength(8))) })
    Util.expectDecodingFailure(
      schema,
      { password: "pwd123" },
      `/password "**********" did not satisfy refinement({"minLength":8})`
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

    const decoder = D.decoderFor(schema)
    expect(decoder.decode({ a: "a" })).toEqual(DE.success({ a: "a", b: O.none }))
    expect(decoder.decode({ a: "a", b: undefined })).toEqual(DE.success({ a: "a", b: O.none }))
    expect(decoder.decode({ a: "a", b: null })).toEqual(DE.success({ a: "a", b: O.none }))
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(DE.success({ a: "a", b: O.some(1) }))

    Util.expectFailureTree(
      decoder,
      { a: "a", b: "b" },
      `1 error(s) found
└─ key "b"
   ├─ union member
   │  └─ "b" did not satisfy is(undefined)
   ├─ union member
   │  └─ "b" did not satisfy isEqual(null)
   └─ union member
      └─ "b" did not satisfy is(number)`
    )

    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, { a: "a", b: O.none }, { a: "a" })
    Util.expectEncodingSuccess(encoder, { a: "a", b: O.some(1) }, { a: "a", b: 1 })
  })

  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(schema, "ab", `"ab" did not satisfy isEqual(a)`)
    Util.expectDecodingFailure(schema, "", `"" did not satisfy isEqual(a)`)
    Util.expectDecodingFailure(schema, null, `null did not satisfy isEqual(a)`)
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    Util.expectDecodingSuccess(schema, "a b")

    Util.expectDecodingFailure(schema, "a  b", `"a  b" did not satisfy isEqual(a b)`)
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ab")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy is(^a.*$)`)
    Util.expectDecodingFailure(schema, null, `null did not satisfy is(string)`)
  })

  it("templateLiteral. ${string}", () => {
    const schema = S.templateLiteral(S.string)
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ab")
    Util.expectDecodingSuccess(schema, "")
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    Util.expectDecodingSuccess(schema, "ab")
    Util.expectDecodingSuccess(schema, "acb")
    Util.expectDecodingSuccess(schema, "abb")
    Util.expectDecodingFailure(schema, "", `"" did not satisfy is(^a.*b$)`)
    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy is(^a.*b$)`)
    Util.expectDecodingFailure(schema, "b", `"b" did not satisfy is(^a.*b$)`)
  })

  it("templateLiteral. a${string}b${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"), S.string)
    Util.expectDecodingSuccess(schema, "ab")
    Util.expectDecodingSuccess(schema, "acb")
    Util.expectDecodingSuccess(schema, "acbd")

    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy is(^a.*b.*$)`)
    Util.expectDecodingFailure(schema, "b", `"b" did not satisfy is(^a.*b.*$)`)
  })

  it("templateLiteral. https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", () => {
    const EmailLocaleIDs = S.literal("welcome_email", "email_heading")
    const FooterLocaleIDs = S.literal("footer_title", "footer_sendoff")
    const schema = S.templateLiteral(S.union(EmailLocaleIDs, FooterLocaleIDs), S.literal("_id"))
    Util.expectDecodingSuccess(schema, "welcome_email_id")
    Util.expectDecodingSuccess(schema, "email_heading_id")
    Util.expectDecodingSuccess(schema, "footer_title_id")
    Util.expectDecodingSuccess(schema, "footer_sendoff_id")

    Util.expectFailureTree(
      schema,
      "_id",
      `4 error(s) found
├─ union member
│  └─ "_id" did not satisfy isEqual("welcome_email_id")
├─ union member
│  └─ "_id" did not satisfy isEqual("email_heading_id")
├─ union member
│  └─ "_id" did not satisfy isEqual("footer_title_id")
└─ union member
   └─ "_id" did not satisfy isEqual("footer_sendoff_id")`
    )
  })

  it("never", () => {
    const schema = S.never
    Util.expectDecodingFailure(schema, 1, "1 did not satisfy is(never)")
  })

  it("string", () => {
    const schema = S.string
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingFailure(schema, 1, "1 did not satisfy is(string)")
  })

  it("number", () => {
    const schema = S.number
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingSuccess(schema, NaN)
    Util.expectDecodingSuccess(schema, Infinity)
    Util.expectDecodingSuccess(schema, -Infinity)
    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy is(number)`)
  })

  it("boolean", () => {
    const schema = S.boolean
    Util.expectDecodingSuccess(schema, true)
    Util.expectDecodingSuccess(schema, false)
    Util.expectDecodingFailure(schema, 1, `1 did not satisfy is(boolean)`)
  })

  it("bigint", () => {
    const schema = S.bigint
    Util.expectDecodingSuccess(schema, 0n)
    Util.expectDecodingSuccess(schema, 1n)
    Util.expectDecodingSuccess(schema, BigInt("1"))
    expect(D.decode(schema)("1")).toEqual(DE.success(1n))

    Util.expectDecodingFailure(schema, null, "null did not satisfy is(string | number | boolean)")
    Util.expectDecodingFailure(
      schema,
      1.2,
      `1.2 did not satisfy parsing from (string | number | boolean) to (bigint)`
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.symbol
    Util.expectDecodingSuccess(schema, a)
    Util.expectDecodingFailure(
      schema,
      "@fp-ts/schema/test/a",
      `"@fp-ts/schema/test/a" did not satisfy is(symbol)`
    )
  })

  it("object", () => {
    const schema = S.object
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingFailure(schema, null, `null did not satisfy is(object)`)
    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy is(object)`)
    Util.expectDecodingFailure(schema, 1, `1 did not satisfy is(object)`)
    Util.expectDecodingFailure(schema, true, `true did not satisfy is(object)`)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy isEqual(1)`)
    Util.expectDecodingFailure(schema, null, `null did not satisfy isEqual(1)`)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingSuccess(schema, "a")

    Util.expectFailureTree(
      schema,
      null,
      `2 error(s) found
├─ union member
│  └─ null did not satisfy isEqual(1)
└─ union member
   └─ null did not satisfy isEqual("a")`
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
      `"Symbol(@fp-ts/schema/test/a)" did not satisfy isEqual(Symbol(@fp-ts/schema/test/a))`
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
      `3 did not satisfy isEnum([["Apple",0],["Banana",1]])`
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
      `"Cantaloupe" did not satisfy isEnum([["Apple","apple"],["Banana","banana"],["Cantaloupe",0]])`
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
      `"Cantaloupe" did not satisfy isEnum([["Apple","apple"],["Banana","banana"],["Cantaloupe",3]])`
    )
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(schema, {}, `{} did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(schema, [undefined], `/0 is unexpected`)
    Util.expectDecodingFailure(schema, [1], `/0 is unexpected`)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    Util.expectDecodingSuccess(schema, [1])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, [undefined], `/0 undefined did not satisfy is(number)`)
    Util.expectDecodingFailure(schema, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.number))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 "a" did not satisfy is(number)`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [undefined])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectDecodingFailure(
      schema,
      ["a"],
      `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
    )
    Util.expectDecodingFailure(schema, [1, "b"], `/1 is unexpected`)
  })

  it("tuple. e e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    Util.expectDecodingSuccess(schema, ["a"])
    Util.expectDecodingSuccess(schema, ["a", 1])

    Util.expectDecodingFailure(schema, [1], `/0 1 did not satisfy is(string)`)
    Util.expectDecodingFailure(schema, ["a", "b"], `/1 "b" did not satisfy is(number)`)
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

    Util.expectDecodingFailure(schema, [1], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    Util.expectDecodingSuccess(schema, [])
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, 2])

    Util.expectDecodingFailure(schema, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectDecodingFailure(schema, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("tuple. r e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, ["a", 1])
    Util.expectDecodingSuccess(schema, ["a", "b", 1])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectDecodingFailure(schema, [1, 2], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. e r e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    Util.expectDecodingSuccess(schema, ["a", true])
    Util.expectDecodingSuccess(schema, ["a", 1, true])
    Util.expectDecodingSuccess(schema, ["a", 1, 2, true])

    Util.expectDecodingFailure(schema, [], `/0 is missing`)
    Util.expectDecodingFailure(schema, ["a"], `/1 is missing`)
    Util.expectDecodingFailure(schema, [true], `/0 true did not satisfy is(string)`)
    Util.expectDecodingFailure(schema, ["a", 1], `/1 1 did not satisfy is(boolean)`)
    Util.expectDecodingFailure(schema, [1, true], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. element warnings", () => {
    const schema = S.tuple(S.allowUnexpected(S.struct({ b: S.number })))
    Util.expectDecodingSuccess(schema, [{ b: 1 }])
    Util.expectDecodingWarning(schema, [{ b: 1, c: "c" }], `/0 /c is unexpected`, [{ b: 1 }])
  })

  it("tuple. rest element warnings", () => {
    const schema = S.array(S.allowUnexpected(S.struct({ b: S.number })))
    Util.expectDecodingSuccess(schema, [{ b: 1 }])
    Util.expectDecodingWarning(schema, [{ b: 1, c: "c" }], `/0 /c is unexpected`, [{ b: 1 }])
  })

  it("tuple. post rest elements warnings", () => {
    const schema = pipe(S.array(S.string), S.element(S.allowUnexpected(S.struct({ b: S.number }))))
    Util.expectDecodingSuccess(schema, [{ b: 1 }])
    Util.expectDecodingWarning(schema, [{ b: 1, c: "c" }], `/0 /c is unexpected`, [{ b: 1 }])
  })

  it("tuple. allowUnexpected = true", () => {
    const schema = S.allowUnexpected(S.tuple(S.number))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingWarning(schema, [1, "b"], `/1 is unexpected`, [1])
  })

  it("tuple. allowUnexpected = true r", () => {
    const schema = S.allowUnexpected(pipe(S.tuple(S.number), S.rest(S.string)))
    Util.expectDecodingSuccess(schema, [1])
    Util.expectDecodingSuccess(schema, [1, "b"])
  })

  it("struct. allowUnexpected = true", () => {
    const schema = S.allowUnexpected(S.struct({ a: S.number }))
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingWarning(schema, { a: 1, b: "b" }, `/b is unexpected`, { a: 1 })
  })

  it("struct. allowUnexpected = true index signature", () => {
    const schema = S.allowUnexpected(
      pipe(S.struct({ a: S.number }), S.extend(S.record(S.string, S.unknown)))
    )
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, { a: 1, b: "b" })
  })

  it("struct. key warnings", () => {
    const schema = S.struct({ a: S.allowUnexpected(S.struct({ b: S.number })) })
    Util.expectDecodingSuccess(schema, { a: { b: 1 } })
    Util.expectDecodingWarning(schema, { a: { b: 1, c: "c" } }, `/a /c is unexpected`, {
      a: { b: 1 }
    })
  })

  it("struct. index signature warnings", () => {
    const schema = S.record(S.string, S.allowUnexpected(S.struct({ b: S.number })))
    Util.expectDecodingSuccess(schema, { a: { b: 1 } })
    Util.expectDecodingWarning(schema, { a: { b: 1, c: "c" } }, `/a /c is unexpected`, {
      a: { b: 1 }
    })
  })

  it("struct. empty", () => {
    const schema = S.struct({})
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, [])

    Util.expectDecodingFailure(schema, null, `null did not satisfy is({})`)
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      Util.expectDecodingSuccess(schema, { a: 1 })

      Util.expectDecodingFailure(
        schema,
        null,
        `null did not satisfy is({ readonly [x: PropertyKey]: unknown })`
      )
      Util.expectDecodingFailure(schema, {}, "/a is missing")
      Util.expectDecodingFailure(
        schema,
        { a: undefined },
        "/a undefined did not satisfy is(number)"
      )
      Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      Util.expectDecodingSuccess(schema, { a: 1 })
      Util.expectDecodingSuccess(schema, { a: undefined })

      Util.expectDecodingFailure(
        schema,
        null,
        `null did not satisfy is({ readonly [x: PropertyKey]: unknown })`
      )
      Util.expectDecodingFailure(schema, {}, "/a is missing")
      Util.expectDecodingFailure(
        schema,
        { a: "a" },
        `/a member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
      Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      Util.expectDecodingSuccess(schema, {})
      Util.expectDecodingSuccess(schema, { a: 1 })

      Util.expectDecodingFailure(
        schema,
        null,
        `null did not satisfy is({ readonly [x: PropertyKey]: unknown })`
      )
      Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" did not satisfy is(number)`)
      Util.expectDecodingFailure(
        schema,
        { a: undefined },
        `/a undefined did not satisfy is(number)`
      )
      Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
    })

    it("optional property signature with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      Util.expectDecodingSuccess(schema, {})
      Util.expectDecodingSuccess(schema, { a: 1 })
      Util.expectDecodingSuccess(schema, { a: undefined })

      Util.expectDecodingFailure(
        schema,
        null,
        `null did not satisfy is({ readonly [x: PropertyKey]: unknown })`
      )
      Util.expectDecodingFailure(
        schema,
        { a: "a" },
        `/a member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
      Util.expectDecodingFailure(schema, { a: 1, b: "b" }, "/b is unexpected")
    })

    it("should not add optional keys", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      Util.expectDecodingSuccess(schema, {})
    })

    it("extend record(string, string)", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.record(S.string, S.string))
      )
      Util.expectDecodingSuccess(schema, { a: "a" })
      Util.expectDecodingSuccess(schema, { a: "a", b: "b" })

      Util.expectDecodingFailure(schema, {}, "/a is missing")
      Util.expectDecodingFailure(schema, { b: "b" }, "/a is missing")
      Util.expectDecodingFailure(schema, { a: 1 }, "/a 1 did not satisfy is(string)")
      Util.expectDecodingFailure(schema, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)")
    })
  })

  it("record(string, number)", () => {
    const schema = S.record(S.string, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "[] did not satisfy is({ readonly [x: PropertyKey]: unknown })"
    )
    Util.expectDecodingFailure(
      schema,
      { a: "a" },
      `/a "a" did not satisfy is(number)`
    )
  })

  it("record(symbol, number)", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.record(S.symbol, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { [a]: 1 })

    Util.expectDecodingFailure(
      schema,
      [],
      "[] did not satisfy is({ readonly [x: PropertyKey]: unknown })"
    )
    Util.expectDecodingFailure(
      schema,
      { [a]: "a" },
      `/Symbol(@fp-ts/schema/test/a) "a" did not satisfy is(number)`
    )
  })

  it("record(never, number)", () => {
    const schema = S.record(S.never, S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
  })

  it("record('a' | 'b', number)", () => {
    const schema = S.record(S.union(S.literal("a"), S.literal("b")), S.number)
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
  })

  it("record(keyof struct({ a, b }), number)", () => {
    const schema = S.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })

    Util.expectDecodingFailure(schema, {}, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: 1 }, `/b is missing`)
    Util.expectDecodingFailure(schema, { b: 2 }, `/a is missing`)
    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" did not satisfy is(number)`)
  })

  it("record(keyof struct({ a, b } & Record<string, string>), number)", () => {
    const schema = S.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.string, S.string)))),
      S.number
    )
    Util.expectDecodingSuccess(schema, { a: 1, b: 2 })
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { a: 1 })
    Util.expectDecodingSuccess(schema, { b: 2 })

    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" did not satisfy is(number)`)
  })

  it("record(keyof struct({ a, b } & Record<symbol, string>), number)", () => {
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
    Util.expectDecodingFailure(schema, { a: "a" }, `/a "a" did not satisfy is(number)`)
    Util.expectDecodingFailure(
      schema,
      { a: 1, b: 2, [c]: "c" },
      `/Symbol(@fp-ts/schema/test/c) "c" did not satisfy is(number)`
    )
  })

  it("record(Symbol('a') | Symbol('b'), number)", () => {
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

  it("record(keyof Option<number>, number)", () => {
    const schema = S.record(S.keyof(S.option(S.number)), S.number)
    Util.expectDecodingSuccess(schema, { _tag: 1 })

    Util.expectDecodingFailure(schema, {}, `/_tag is missing`)
    Util.expectDecodingFailure(schema, { _tag: "a" }, `/_tag "a" did not satisfy is(number)`)
  })

  it("record(${string}-${string}, number)", () => {
    const schema = S.record(S.templateLiteral(S.string, S.literal("-"), S.string), S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { "-": 1 })
    Util.expectDecodingSuccess(schema, { "a-": 1 })
    Util.expectDecodingSuccess(schema, { "-b": 1 })
    Util.expectDecodingSuccess(schema, { "a-b": 1 })

    Util.expectDecodingFailure(schema, { "": 1 }, `/ "" did not satisfy is(^.*-.*$)`)
    Util.expectDecodingFailure(schema, { "-": "a" }, `/- "a" did not satisfy is(number)`)
  })

  it("record(minLength(1), number)", () => {
    const schema = S.record(pipe(S.string, S.minLength(2)), S.number)
    Util.expectDecodingSuccess(schema, {})
    Util.expectDecodingSuccess(schema, { "aa": 1 })
    Util.expectDecodingSuccess(schema, { "aaa": 1 })

    Util.expectDecodingFailure(
      schema,
      { "": 1 },
      `/ "" did not satisfy refinement({"minLength":2})`
    )
    Util.expectDecodingFailure(
      schema,
      { "a": 1 },
      `/a "a" did not satisfy refinement({"minLength":2})`
    )
  })

  it("union. choose the output with less warnings related to unexpected keys / indexes", () => {
    const a = S.allowUnexpected(S.struct({ a: S.optional(S.number) }))
    const b = S.allowUnexpected(S.struct({ a: S.optional(S.number), b: S.optional(S.string) }))
    const schema = S.union(a, b)
    Util.expectDecodingWarning(schema, { a: 1, b: "b", c: true }, `/c is unexpected`, {
      a: 1,
      b: "b"
    })
  })

  describe.concurrent("union", () => {
    it("empty union", () => {
      const schema = S.union()
      Util.expectDecodingFailure(schema, 1, "1 did not satisfy is(never)")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required property signatures", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        Util.expectDecodingSuccess(schema, { a: "a", b: 1 })
      })

      it("optional property signatures", () => {
        const ab = S.struct({ a: S.string, b: S.optional(S.number) })
        const ac = S.struct({ a: S.string, c: S.optional(S.number) })
        const schema = S.union(ab, ac)
        Util.expectDecodingSuccess(schema, { a: "a", c: 1 })
      })
    })
  })

  it("lazy", () => {
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
      { a: "a1" },
      `/as is missing`
    )

    Util.expectDecodingFailure(
      schema,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is({ readonly [x: PropertyKey]: unknown })"
    )
  })

  it("mutually recursive", () => {
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

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      Util.expectDecodingSuccess(schema, {})
      Util.expectDecodingSuccess(schema, { a: 1 })

      Util.expectDecodingFailure(
        schema,
        { a: undefined },
        `/a undefined did not satisfy is(number)`
      )
    })

    it("tuple", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      Util.expectDecodingSuccess(schema, [])
      Util.expectDecodingSuccess(schema, ["a"])
      Util.expectDecodingSuccess(schema, ["a", 1])
    })

    it("array", () => {
      const schema = S.partial(S.array(S.number))
      Util.expectDecodingSuccess(schema, [])
      Util.expectDecodingSuccess(schema, [1])
      Util.expectDecodingSuccess(schema, [undefined])

      Util.expectFailureTree(
        schema,
        ["a"],
        `1 error(s) found
└─ index 0
   ├─ union member
   │  └─ "a" did not satisfy is(number)
   └─ union member
      └─ "a" did not satisfy is(undefined)`
      )
    })

    it("union", () => {
      const schema = S.partial(S.union(S.string, S.array(S.number)))
      Util.expectDecodingSuccess(schema, "a")
      Util.expectDecodingSuccess(schema, [])
      Util.expectDecodingSuccess(schema, [1])
      Util.expectDecodingSuccess(schema, [undefined])

      Util.expectFailureTree(
        schema,
        ["a"],
        `2 error(s) found
├─ union member
│  └─ index 0
│     ├─ union member
│     │  └─ "a" did not satisfy is(number)
│     └─ union member
│        └─ "a" did not satisfy is(undefined)
└─ union member
   └─ ["a"] did not satisfy is(string)`
      )
    })
  })

  describe.concurrent("omit", () => {
    it("baseline", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      Util.expectDecodingSuccess(schema, { a: "a", b: 1 })

      Util.expectDecodingFailure(
        schema,
        null,
        "null did not satisfy is({ readonly [x: PropertyKey]: unknown })"
      )
      Util.expectDecodingFailure(schema, { a: "a" }, `/b is missing`)
      Util.expectDecodingFailure(schema, { b: 1 }, "/a is missing")
    })

    it("involving a symbol", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      Util.expectDecodingSuccess(schema, { [a]: "a", b: 1 })

      Util.expectDecodingFailure(
        schema,
        null,
        "null did not satisfy is({ readonly [x: PropertyKey]: unknown })"
      )
      Util.expectDecodingFailure(schema, { [a]: "a" }, `/b is missing`)
      Util.expectDecodingFailure(
        schema,
        { b: 1 },
        `/Symbol(@fp-ts/schema/test/a) is missing`
      )
    })
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(1))
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(schema, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
  })

  it("nonEmpty", () => {
    const schema = pipe(S.string, S.nonEmpty)
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "aa")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"minLength":1})`)
  })

  it("length", () => {
    const schema = pipe(S.string, S.length(1))
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"minLength":1})`)
    Util.expectDecodingFailure(schema, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
  })

  it("startsWith", () => {
    const schema = pipe(S.string, S.startsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ab")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"startsWith":"a"})`)
    Util.expectDecodingFailure(schema, "b", `"b" did not satisfy refinement({"startsWith":"a"})`)
  })

  it("endsWith", () => {
    const schema = pipe(S.string, S.endsWith("a"))
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "ba")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"endsWith":"a"})`)
    Util.expectDecodingFailure(schema, "b", `"b" did not satisfy refinement({"endsWith":"a"})`)
  })

  it("regex", () => {
    const schema = pipe(S.string, S.regex(/^abb+$/))
    Util.expectDecodingSuccess(schema, "abb")
    Util.expectDecodingSuccess(schema, "abbb")

    Util.expectDecodingFailure(
      schema,
      "ab",
      `"ab" did not satisfy refinement({"pattern":"^abb+$"})`
    )
    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy refinement({"pattern":"^abb+$"})`)
  })

  it("filter", () => {
    const schema = pipe(S.string, S.filter((s): s is string => s.length === 1, { type: "Char" }))
    Util.expectDecodingSuccess(schema, "a")

    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"type":"Char"})`)
    Util.expectDecodingFailure(schema, "aa", `"aa" did not satisfy refinement({"type":"Char"})`)
  })

  it("greaterThan", () => {
    const schema = pipe(S.number, S.greaterThan(0))
    Util.expectDecodingSuccess(schema, 1)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = pipe(S.number, S.greaterThanOrEqualTo(0))
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(schema, -1, `-1 did not satisfy refinement({"minimum":0})`)
  })

  it("lessThan", () => {
    const schema = pipe(S.number, S.lessThan(0))
    Util.expectDecodingSuccess(schema, -1)

    Util.expectDecodingFailure(schema, 0, `0 did not satisfy refinement({"exclusiveMaximum":0})`)
    Util.expectDecodingFailure(schema, 1, `1 did not satisfy refinement({"exclusiveMaximum":0})`)
  })

  it("lessThanOrEqualTo", () => {
    const schema = pipe(S.number, S.lessThanOrEqualTo(0))
    Util.expectDecodingSuccess(schema, -1)
    Util.expectDecodingSuccess(schema, 0)

    Util.expectDecodingFailure(schema, 1, `1 did not satisfy refinement({"maximum":0})`)
  })

  it("int", () => {
    const schema = pipe(S.number, S.int)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)

    Util.expectDecodingFailure(schema, 1.2, `1.2 did not satisfy refinement({"type":"integer"})`)
  })
})
