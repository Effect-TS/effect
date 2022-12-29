import { pipe } from "@fp-ts/data/Function"
import * as C from "@fp-ts/schema/Codec"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Codec", () => {
  it("exports", () => {
    expect(C.success).exist
    expect(C.failure).exist
    expect(C.failures).exist
    expect(C.warning).exist
    expect(C.warnings).exist

    expect(C.isSuccess).exist
    expect(C.isFailure).exist
    expect(C.isWarning).exist

    expect(C.codecFor).exist

    expect(C.literal).exist
    expect(C.uniqueSymbol).exist
    expect(C.enums).exist

    expect(C.minLength).exist
    expect(C.maxLength).exist
    expect(C.startsWith).exist
    expect(C.endsWith).exist
    expect(C.regex).exist
    expect(C.lessThan).exist
    expect(C.lessThanOrEqualTo).exist
    expect(C.greaterThan).exist
    expect(C.greaterThanOrEqualTo).exist
    expect(C.int).exist

    expect(C.union).exist
    expect(C.keyof).exist
    expect(C.tuple).exist
    expect(C.rest).exist
    expect(C.element).exist
    expect(C.optionalElement).exist
    expect(C.array).exist
    expect(C.optional).exist
    expect(C.struct).exist
    expect(C.pick).exist
    expect(C.omit).exist
    expect(C.partial).exist
    expect(C.record).exist
    expect(C.extend).exist
    expect(C.lazy).exist
    expect(C.filter).exist
    expect(C.parse).exist
    expect(C.annotations).exist

    expect(C.undefined).exist
    expect(C.void).exist
    expect(C.string).exist
    expect(C.number).exist
    expect(C.boolean).exist
    expect(C.bigint).exist
    expect(C.symbol).exist
    expect(C.unknown).exist
    expect(C.any).exist
    expect(C.never).exist
    expect(C.json).exist
    expect(C.option).exist
  })

  it("parseOrThrow", () => {
    const Person = C.struct({
      firstName: C.string,
      lastName: C.string,
      age: C.optional(C.number)
    })

    Util.expectSuccess(Person, { firstName: "Michael", lastName: "Arnaldi" })

    const person = Person.of({ firstName: "Michael", lastName: "Arnaldi" })
    const string = Person.stringify(person)

    expect(string).toEqual(`{"firstName":"Michael","lastName":"Arnaldi"}`)
    expect(Person.parseOrThrow(string)).toEqual(person)
  })

  it("never", () => {
    const codec = C.never
    Util.expectFailure(codec, 1, "1 did not satisfy is(never)")
  })

  it("string", () => {
    const codec = C.string
    Util.expectSuccess(codec, "a")
    Util.expectFailure(codec, 1, "1 did not satisfy is(string)")
  })

  it("number", () => {
    const codec = C.number
    Util.expectSuccess(codec, 1)
    Util.expectSuccess(codec, NaN)
    Util.expectSuccess(codec, Infinity)
    Util.expectSuccess(codec, -Infinity)
    Util.expectFailure(codec, "a", `"a" did not satisfy is(number)`)
  })

  it("boolean", () => {
    const codec = C.boolean
    Util.expectSuccess(codec, true)
    Util.expectSuccess(codec, false)
    Util.expectFailure(codec, 1, `1 did not satisfy is(boolean)`)
  })

  it("bigint", () => {
    const codec = C.bigint
    Util.expectSuccess(codec, 0n)
    Util.expectSuccess(codec, 1n)
    Util.expectSuccess(codec, BigInt("1"))
    expect(codec.decode("1")).toEqual(C.success(1n))

    Util.expectFailure(codec, null, "null did not satisfy is(string | number | boolean)")
    Util.expectFailure(
      codec,
      1.2,
      `1.2 did not satisfy parsing from (string | number | boolean) to (bigint)`
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const codec = C.symbol
    Util.expectSuccess(codec, a)
    Util.expectFailure(
      codec,
      "@fp-ts/schema/test/a",
      `"@fp-ts/schema/test/a" did not satisfy is(symbol)`
    )
  })

  it("object", () => {
    const codec = C.object
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, [])
    Util.expectFailure(codec, null, `null did not satisfy is(object)`)
    Util.expectFailure(codec, "a", `"a" did not satisfy is(object)`)
    Util.expectFailure(codec, 1, `1 did not satisfy is(object)`)
    Util.expectFailure(codec, true, `true did not satisfy is(object)`)
  })

  it("literal 1 member", () => {
    const codec = C.literal(1)
    Util.expectSuccess(codec, 1)

    Util.expectFailure(codec, "a", `"a" did not satisfy isEqual(1)`)
    Util.expectFailure(codec, null, `null did not satisfy isEqual(1)`)
  })

  it("literal 2 members", () => {
    const codec = C.literal(1, "a")
    Util.expectSuccess(codec, 1)
    Util.expectSuccess(codec, "a")

    Util.expectFailureTree(
      codec,
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
    const codec = C.uniqueSymbol(a)
    Util.expectSuccess(codec, a)
    Util.expectSuccess(codec, Symbol.for("@fp-ts/schema/test/a"))
    Util.expectFailure(
      codec,
      "Symbol(@fp-ts/schema/test/a)",
      `"Symbol(@fp-ts/schema/test/a)" did not satisfy isEqual(Symbol(@fp-ts/schema/test/a))`
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const codec = C.enums(Fruits)
    Util.expectSuccess(codec, Fruits.Apple)
    Util.expectSuccess(codec, Fruits.Banana)
    Util.expectSuccess(codec, 0)
    Util.expectSuccess(codec, 1)

    Util.expectFailure(
      codec,
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
    const codec = C.enums(Fruits)
    Util.expectSuccess(codec, Fruits.Apple)
    Util.expectSuccess(codec, Fruits.Cantaloupe)
    Util.expectSuccess(codec, "apple")
    Util.expectSuccess(codec, "banana")
    Util.expectSuccess(codec, 0)

    Util.expectFailure(
      codec,
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
    const codec = C.enums(Fruits)
    Util.expectSuccess(codec, "apple")
    Util.expectSuccess(codec, "banana")
    Util.expectSuccess(codec, 3)

    Util.expectFailure(
      codec,
      "Cantaloupe",
      `"Cantaloupe" did not satisfy isEnum([["Apple","apple"],["Banana","banana"],["Cantaloupe",3]])`
    )
  })

  it("tuple. empty", () => {
    const codec = C.tuple()
    Util.expectSuccess(codec, [])

    Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(codec, {}, `{} did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(codec, [undefined], `/0 index is unexpected`)
    Util.expectFailure(codec, [1], `/0 index is unexpected`)
  })

  it("tuple. required element", () => {
    const codec = C.tuple(C.number)
    Util.expectSuccess(codec, [1])

    Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
    Util.expectFailure(codec, [undefined], `/0 undefined did not satisfy is(number)`)
    Util.expectFailure(codec, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectFailure(codec, [1, "b"], `/1 index is unexpected`)
  })

  it("tuple. required element with undefined", () => {
    const codec = C.tuple(C.union(C.number, C.undefined))
    Util.expectSuccess(codec, [1])
    Util.expectSuccess(codec, [undefined])

    Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
    Util.expectFailure(
      codec,
      ["a"],
      `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
    )
    Util.expectFailure(codec, [1, "b"], `/1 index is unexpected`)
  })

  it("tuple. optional element", () => {
    const codec = pipe(C.tuple(), C.optionalElement(C.number))
    Util.expectSuccess(codec, [])
    Util.expectSuccess(codec, [1])

    Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(
      codec,
      ["a"],
      `/0 "a" did not satisfy is(number)`
    )
    Util.expectFailure(codec, [1, "b"], `/1 index is unexpected`)
  })

  it("tuple. optional element with undefined", () => {
    const codec = pipe(C.tuple(), C.optionalElement(C.union(C.number, C.undefined)))
    Util.expectSuccess(codec, [])
    Util.expectSuccess(codec, [1])
    Util.expectSuccess(codec, [undefined])

    Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
    Util.expectFailure(
      codec,
      ["a"],
      `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
    )
    Util.expectFailure(codec, [1, "b"], `/1 index is unexpected`)
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, ["a"])
    Util.expectSuccess(codec, ["a", 1])

    Util.expectFailure(codec, [1], `/0 1 did not satisfy is(string)`)
    Util.expectFailure(codec, ["a", "b"], `/1 "b" did not satisfy is(number)`)
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number))
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, ["a"])
    Util.expectSuccess(codec, ["a", 1])
    Util.expectSuccess(codec, ["a", 1, 2])

    Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(S.number))
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, [])
    Util.expectSuccess(codec, ["a"])
    Util.expectSuccess(codec, ["a", 1])
    Util.expectSuccess(codec, ["a", 1, 2])

    Util.expectFailure(codec, [1], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, [])
    Util.expectSuccess(codec, [1])
    Util.expectSuccess(codec, [1, 2])

    Util.expectFailure(codec, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectFailure(codec, [1, "a"], `/1 "a" did not satisfy is(number)`)
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, [1])
    Util.expectSuccess(codec, ["a", 1])
    Util.expectSuccess(codec, ["a", "b", 1])

    Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
    Util.expectFailure(codec, ["a"], `/0 "a" did not satisfy is(number)`)
    Util.expectFailure(codec, [1, 2], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    const codec = C.codecFor(schema)
    Util.expectSuccess(codec, ["a", true])
    Util.expectSuccess(codec, ["a", 1, true])
    Util.expectSuccess(codec, ["a", 1, 2, true])

    Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
    Util.expectFailure(codec, ["a"], `/1 did not satisfy is(required)`)
    Util.expectFailure(codec, [true], `/0 true did not satisfy is(string)`)
    Util.expectFailure(codec, ["a", 1], `/1 1 did not satisfy is(boolean)`)
    Util.expectFailure(codec, [1, true], `/0 1 did not satisfy is(string)`)
  })

  it("tuple. element warnings", () => {
    const codec = C.tuple(C.allowUnexpected(C.struct({ b: C.number })))
    Util.expectSuccess(codec, [{ b: 1 }])
    Util.expectWarning(codec, [{ b: 1, c: "c" }], `/0 /c key is unexpected`, [{ b: 1 }])
  })

  it("tuple. rest element warnings", () => {
    const codec = C.array(C.allowUnexpected(C.struct({ b: C.number })))
    Util.expectSuccess(codec, [{ b: 1 }])
    Util.expectWarning(codec, [{ b: 1, c: "c" }], `/0 /c key is unexpected`, [{ b: 1 }])
  })

  it("tuple. post rest elements warnings", () => {
    const codec = pipe(C.array(C.string), C.element(C.allowUnexpected(C.struct({ b: C.number }))))
    Util.expectSuccess(codec, [{ b: 1 }])
    Util.expectWarning(codec, [{ b: 1, c: "c" }], `/0 /c key is unexpected`, [{ b: 1 }])
  })

  it("tuple. allowUnexpected = true", () => {
    const codec = C.allowUnexpected(C.tuple(C.number))
    Util.expectSuccess(codec, [1])
    Util.expectWarning(codec, [1, "b"], `/1 index is unexpected`, [1])
  })

  it("tuple. allowUnexpected = true + r", () => {
    const codec = C.allowUnexpected(pipe(C.tuple(C.number), C.rest(C.string)))
    Util.expectSuccess(codec, [1])
    Util.expectSuccess(codec, [1, "b"])
  })

  it("struct. allowUnexpected = true", () => {
    const codec = C.allowUnexpected(C.struct({ a: C.number }))
    Util.expectSuccess(codec, { a: 1 })
    Util.expectWarning(codec, { a: 1, b: "b" }, `/b key is unexpected`, { a: 1 })
  })

  it("struct. allowUnexpected = true + index signature", () => {
    const codec = C.allowUnexpected(
      pipe(C.struct({ a: C.number }), C.extend(C.record(S.string, C.unknown)))
    )
    Util.expectSuccess(codec, { a: 1 })
    Util.expectSuccess(codec, { a: 1, b: "b" })
  })

  it("struct. key warnings", () => {
    const codec = C.struct({ a: C.allowUnexpected(C.struct({ b: C.number })) })
    Util.expectSuccess(codec, { a: { b: 1 } })
    Util.expectWarning(codec, { a: { b: 1, c: "c" } }, `/a /c key is unexpected`, { a: { b: 1 } })
  })

  it("struct. index signature warnings", () => {
    const codec = C.record(S.string, C.allowUnexpected(C.struct({ b: C.number })))
    Util.expectSuccess(codec, { a: { b: 1 } })
    Util.expectWarning(codec, { a: { b: 1, c: "c" } }, `/a /c key is unexpected`, { a: { b: 1 } })
  })

  it("struct. empty", () => {
    const codec = C.struct({})
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, { a: 1 })
    Util.expectSuccess(codec, [])

    Util.expectFailure(codec, null, `null did not satisfy is({})`)
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const codec = C.struct({ a: C.number })
      Util.expectSuccess(codec, { a: 1 })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(codec, {}, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { a: undefined }, "/a undefined did not satisfy is(number)")
      Util.expectFailure(codec, { a: 1, b: "b" }, "/b key is unexpected")
    })

    it("required field with undefined", () => {
      const codec = C.struct({ a: C.union(C.number, C.undefined) })
      Util.expectSuccess(codec, { a: 1 })
      Util.expectSuccess(codec, { a: undefined })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(codec, {}, "/a did not satisfy is(required)")
      Util.expectFailure(
        codec,
        { a: "a" },
        `/a member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
      Util.expectFailure(codec, { a: 1, b: "b" }, "/b key is unexpected")
    })

    it("optional field", () => {
      const codec = C.struct({ a: C.optional(C.number) })
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: 1 })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(codec, { a: "a" }, `/a "a" did not satisfy is(number)`)
      Util.expectFailure(codec, { a: undefined }, `/a undefined did not satisfy is(number)`)
      Util.expectFailure(codec, { a: 1, b: "b" }, "/b key is unexpected")
    })

    it("optional field with undefined", () => {
      const codec = C.struct({ a: C.optional(C.union(C.number, C.undefined)) })
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: 1 })
      Util.expectSuccess(codec, { a: undefined })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(
        codec,
        { a: "a" },
        `/a member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
      Util.expectFailure(codec, { a: 1, b: "b" }, "/b key is unexpected")
    })

    it("should not add optional keys", () => {
      const codec = C.partial(C.struct({ a: C.string, b: C.number }))
      Util.expectSuccess(codec, {})
    })

    it("extend record(string, string)", () => {
      const codec = pipe(
        C.struct({ a: C.string }),
        C.extend(C.record(S.string, C.string))
      )
      Util.expectSuccess(codec, { a: "a" })
      Util.expectSuccess(codec, { a: "a", b: "b" })

      Util.expectFailure(codec, {}, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { b: "b" }, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { a: 1 }, "/a 1 did not satisfy is(string)")
      Util.expectFailure(codec, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)")
    })
  })

  it("record(string, number)", () => {
    const codec = C.record(S.string, C.number)
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, { a: 1 })

    Util.expectFailure(codec, [], "[] did not satisfy is({ readonly [x: string]: unknown })")
    Util.expectFailure(
      codec,
      { a: "a" },
      `/a "a" did not satisfy is(number)`
    )
  })

  it("record(number, string)", () => {
    const codec = C.record(S.number, S.string)
    Util.expectSuccess(codec, { 1: "a" })

    Util.expectFailure(codec, { 1: 1 }, `/1 1 did not satisfy is(string)`)
  })

  it("record(symbol, number)", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const codec = C.record(S.symbol, C.number)
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, { [a]: 1 })

    Util.expectFailure(codec, [], "[] did not satisfy is({ readonly [x: string]: unknown })")
    Util.expectFailure(
      codec,
      { [a]: "a" },
      `/Symbol(@fp-ts/schema/test/a) "a" did not satisfy is(number)`
    )
  })

  it("record(never, number)", () => {
    const codec = C.record(S.never, S.number)
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, { a: 1 })
  })

  it("record('a' | 'b', number)", () => {
    const codec = C.record(C.union(C.literal("a"), C.literal("b")), C.number)
    Util.expectSuccess(codec, { a: 1, b: 2 })

    Util.expectFailure(codec, {}, `/a did not satisfy is(required)`)
    Util.expectFailure(codec, { a: 1 }, `/b did not satisfy is(required)`)
    Util.expectFailure(codec, { b: 2 }, `/a did not satisfy is(required)`)
  })

  it("record(keyof struct({ a, b }), number)", () => {
    const codec = C.record(S.keyof(S.struct({ a: S.string, b: S.string })), S.number)
    Util.expectSuccess(codec, { a: 1, b: 2 })

    Util.expectFailure(codec, {}, `/a did not satisfy is(required)`)
    Util.expectFailure(codec, { a: 1 }, `/b did not satisfy is(required)`)
    Util.expectFailure(codec, { b: 2 }, `/a did not satisfy is(required)`)
    Util.expectFailure(codec, { a: "a" }, `/a "a" did not satisfy is(number)`)
  })

  it("record(keyof struct({ a, b } & Record<string, string>), number)", () => {
    const codec = C.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.string, S.string)))),
      S.number
    )
    Util.expectSuccess(codec, { a: 1, b: 2 })
    Util.expectSuccess(codec, {})
    Util.expectSuccess(codec, { a: 1 })
    Util.expectSuccess(codec, { b: 2 })

    Util.expectFailure(codec, { a: "a" }, `/a "a" did not satisfy is(number)`)
  })

  it("record(keyof struct({ a, b } & Record<symbol, string>), number)", () => {
    const codec = C.record(
      S.keyof(pipe(S.struct({ a: S.string, b: S.string }), S.extend(S.record(S.symbol, S.string)))),
      S.number
    )
    Util.expectSuccess(codec, { a: 1, b: 2 })
    const c = Symbol.for("@fp-ts/schema/test/c")
    Util.expectSuccess(codec, { a: 1, b: 2, [c]: 3 })

    Util.expectFailure(codec, {}, `/a did not satisfy is(required)`)
    Util.expectFailure(codec, { a: 1 }, `/b did not satisfy is(required)`)
    Util.expectFailure(codec, { b: 2 }, `/a did not satisfy is(required)`)
    Util.expectFailure(codec, { a: "a" }, `/a "a" did not satisfy is(number)`)
    Util.expectFailure(
      codec,
      { a: 1, b: 2, [c]: "c" },
      `/Symbol(@fp-ts/schema/test/c) "c" did not satisfy is(number)`
    )
  })

  it("record(Symbol('a') | Symbol('b'), number)", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const b = Symbol.for("@fp-ts/schema/test/b")
    const codec = C.record(C.union(C.uniqueSymbol(a), C.uniqueSymbol(b)), C.number)
    Util.expectSuccess(codec, { [a]: 1, [b]: 2 })

    Util.expectFailure(codec, {}, `/Symbol(@fp-ts/schema/test/a) did not satisfy is(required)`)
    Util.expectFailure(
      codec,
      { [a]: 1 },
      `/Symbol(@fp-ts/schema/test/b) did not satisfy is(required)`
    )
    Util.expectFailure(
      codec,
      { [b]: 2 },
      `/Symbol(@fp-ts/schema/test/a) did not satisfy is(required)`
    )
  })

  it("record(keyof Option<number>, number)", () => {
    const codec = C.record(S.keyof(S.option(S.number)), S.number)
    Util.expectSuccess(codec, { _tag: 1 })

    Util.expectFailure(codec, {}, `/_tag did not satisfy is(required)`)
    Util.expectFailure(codec, { _tag: "a" }, `/_tag "a" did not satisfy is(number)`)
  })

  it("union. choose the output with less warnings related to unexpected keys / indexes", () => {
    const a = C.allowUnexpected(C.struct({ a: C.optional(C.number) }))
    const b = C.allowUnexpected(C.struct({ a: C.optional(C.number), b: C.optional(C.string) }))
    const codec = C.union(a, b)
    Util.expectWarning(codec, { a: 1, b: "b", c: true }, `/c key is unexpected`, { a: 1, b: "b" })
  })

  describe.concurrent("union", () => {
    it("empty union", () => {
      const codec = C.union()
      Util.expectFailure(codec, 1, "1 did not satisfy is(never)")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required fields", () => {
        const a = C.struct({ a: C.string })
        const ab = C.struct({ a: C.string, b: C.number })
        const codec = C.union(a, ab)
        Util.expectSuccess(codec, { a: "a", b: 1 })
      })

      it("optional fields", () => {
        const ab = C.struct({ a: C.string, b: C.optional(C.number) })
        const ac = C.struct({ a: C.string, c: C.optional(C.number) })
        const codec = C.union(ab, ac)
        Util.expectSuccess(codec, { a: "a", c: 1 })
      })
    })
  })

  it("lazy", () => {
    interface A {
      readonly a: string
      readonly as: ReadonlyArray<A>
    }
    const codec: C.Codec<A> = C.lazy<A>(() =>
      C.struct({
        a: C.string,
        as: C.array(codec)
      })
    )

    Util.expectSuccess(codec, { a: "a1", as: [] })
    Util.expectSuccess(codec, { a: "a1", as: [{ a: "a2", as: [] }] })

    Util.expectFailure(
      codec,
      { a: "a1" },
      `/as did not satisfy is(required)`
    )

    Util.expectFailure(
      codec,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is({ readonly [x: string]: unknown })"
    )
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const codec = C.partial(C.struct({ a: C.number }))
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: 1 })

      Util.expectFailure(codec, { a: undefined }, `/a undefined did not satisfy is(number)`)
    })

    it("tuple", () => {
      const codec = C.partial(C.tuple(C.string, C.number))
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, ["a"])
      Util.expectSuccess(codec, ["a", 1])
    })

    it("array", () => {
      const codec = C.partial(C.array(C.number))
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, [1])
      Util.expectSuccess(codec, [undefined])

      Util.expectFailureTree(
        codec,
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
      const codec = C.partial(C.union(C.string, C.array(C.number)))
      Util.expectSuccess(codec, "a")
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, [1])
      Util.expectSuccess(codec, [undefined])

      Util.expectFailureTree(
        codec,
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
      const base = C.struct({ a: C.string, b: C.number, c: C.boolean })
      const codec = pipe(base, C.omit("c"))
      Util.expectSuccess(codec, { a: "a", b: 1 })

      Util.expectFailure(
        codec,
        null,
        "null did not satisfy is({ readonly [x: string]: unknown })"
      )
      Util.expectFailure(codec, { a: "a" }, `/b did not satisfy is(required)`)
      Util.expectFailure(codec, { b: 1 }, "/a did not satisfy is(required)")
    })

    it("involving a symbol", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const base = C.struct({ [a]: C.string, b: C.number, c: C.boolean })
      const codec = pipe(base, C.omit("c"))
      Util.expectSuccess(codec, { [a]: "a", b: 1 })

      Util.expectFailure(
        codec,
        null,
        "null did not satisfy is({ readonly [x: string]: unknown })"
      )
      Util.expectFailure(codec, { [a]: "a" }, `/b did not satisfy is(required)`)
      Util.expectFailure(
        codec,
        { b: 1 },
        `/Symbol(@fp-ts/schema/test/a) did not satisfy is(required)`
      )
    })
  })

  it("maxLength", () => {
    const codec = pipe(C.string, C.maxLength(1))
    Util.expectSuccess(codec, "")
    Util.expectSuccess(codec, "a")

    Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
  })

  it("nonEmpty", () => {
    const codec = pipe(C.string, C.nonEmpty)
    Util.expectSuccess(codec, "a")
    Util.expectSuccess(codec, "aa")

    Util.expectFailure(codec, "", `"" did not satisfy refinement({"minLength":1})`)
  })

  it("length", () => {
    const codec = pipe(C.string, C.length(1))
    Util.expectSuccess(codec, "a")

    Util.expectFailure(codec, "", `"" did not satisfy refinement({"minLength":1})`)
    Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
  })

  it("startsWith", () => {
    const codec = pipe(C.string, C.startsWith("a"))
    Util.expectSuccess(codec, "a")
    Util.expectSuccess(codec, "ab")

    Util.expectFailure(codec, "", `"" did not satisfy refinement({"startsWith":"a"})`)
    Util.expectFailure(codec, "b", `"b" did not satisfy refinement({"startsWith":"a"})`)
  })

  it("endsWith", () => {
    const codec = pipe(C.string, C.endsWith("a"))
    Util.expectSuccess(codec, "a")
    Util.expectSuccess(codec, "ba")

    Util.expectFailure(codec, "", `"" did not satisfy refinement({"endsWith":"a"})`)
    Util.expectFailure(codec, "b", `"b" did not satisfy refinement({"endsWith":"a"})`)
  })

  it("regex", () => {
    const codec = pipe(C.string, C.regex(/^abb+$/))
    Util.expectSuccess(codec, "abb")
    Util.expectSuccess(codec, "abbb")

    Util.expectFailure(codec, "ab", `"ab" did not satisfy refinement({"pattern":"^abb+$"})`)
    Util.expectFailure(codec, "a", `"a" did not satisfy refinement({"pattern":"^abb+$"})`)
  })

  it("filter", () => {
    const codec = pipe(C.string, C.filter((s): s is string => s.length === 1, { type: "Char" }))
    Util.expectSuccess(codec, "a")

    Util.expectFailure(codec, "", `"" did not satisfy refinement({"type":"Char"})`)
    Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"type":"Char"})`)
  })

  it("greaterThan", () => {
    const codec = pipe(C.number, C.greaterThan(0))
    Util.expectSuccess(codec, 1)
  })

  it("greaterThanOrEqualTo", () => {
    const codec = pipe(C.number, C.greaterThanOrEqualTo(0))
    Util.expectSuccess(codec, 0)
    Util.expectSuccess(codec, 1)

    Util.expectFailure(codec, -1, `-1 did not satisfy refinement({"minimum":0})`)
  })

  it("lessThan", () => {
    const codec = pipe(C.number, C.lessThan(0))
    Util.expectSuccess(codec, -1)

    Util.expectFailure(codec, 0, `0 did not satisfy refinement({"exclusiveMaximum":0})`)
    Util.expectFailure(codec, 1, `1 did not satisfy refinement({"exclusiveMaximum":0})`)
  })

  it("lessThanOrEqualTo", () => {
    const codec = pipe(C.number, C.lessThanOrEqualTo(0))
    Util.expectSuccess(codec, -1)
    Util.expectSuccess(codec, 0)

    Util.expectFailure(codec, 1, `1 did not satisfy refinement({"maximum":0})`)
  })

  it("int", () => {
    const codec = pipe(C.number, C.int)
    Util.expectSuccess(codec, 0)
    Util.expectSuccess(codec, 1)

    Util.expectFailure(codec, 1.2, `1.2 did not satisfy refinement({"type":"integer"})`)
  })
})
