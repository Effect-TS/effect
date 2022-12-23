import { pipe } from "@fp-ts/data/Function"
import * as C from "@fp-ts/schema/Codec"
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

  it("string", () => {
    const codec = C.string
    Util.expectSuccess(codec, "a")

    Util.expectFailure(codec, 1, "1 did not satisfy is(string)")
  })

  it("number", () => {
    const codec = C.number
    Util.expectSuccess(codec, 1)
    Util.expectSuccess(codec, NaN)
    Util.expectFailure(codec, "a", "\"a\" did not satisfy is(number)")
  })

  it("boolean", () => {
    const codec = C.boolean
    Util.expectSuccess(codec, true)
    Util.expectSuccess(codec, false)

    Util.expectFailure(codec, 1, "1 did not satisfy is(boolean)")
  })

  it("bigint", () => {
    const codec = C.bigint

    Util.expectSuccess(codec, 0n)
    Util.expectSuccess(codec, 1n)
    expect(codec.decode("1")).toEqual(C.success(1n))

    Util.expectFailure(
      codec,
      null,
      "null did not satisfy is(string | number | boolean)"
    )
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

    Util.expectFailure(codec, 1, "1 did not satisfy is(symbol)")
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

  it("literal", () => {
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

  describe.concurrent("enums", () => {
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
  })

  describe.concurrent("tuple", () => {
    it("required element", () => {
      const codec = C.tuple(C.number)
      Util.expectSuccess(codec, [1])

      Util.expectWarning(codec, [1, "b"], `/1 index is unexpected`, [1])

      Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
      Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
      Util.expectFailure(codec, [undefined], `/0 undefined did not satisfy is(number)`)
      Util.expectFailure(codec, ["a"], `/0 "a" did not satisfy is(number)`)
    })

    it("required element with undefined", () => {
      const codec = C.tuple(C.union(C.number, C.undefined))
      Util.expectSuccess(codec, [1])
      Util.expectSuccess(codec, [undefined])

      Util.expectWarning(codec, [1, "b"], `/1 index is unexpected`, [1])

      Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
      Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
      Util.expectFailure(
        codec,
        ["a"],
        `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
    })

    it("optional element", () => {
      const codec = pipe(C.tuple(), C.optionalElement(C.number))
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, [1])

      Util.expectWarning(codec, [1, "b"], `/1 index is unexpected`, [1])

      Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
      Util.expectFailure(
        codec,
        ["a"],
        `/0 "a" did not satisfy is(number)`
      )
    })

    it("optional element with undefined", () => {
      const codec = pipe(C.tuple(), C.optionalElement(C.union(C.number, C.undefined)))
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, [1])
      Util.expectSuccess(codec, [undefined])

      Util.expectWarning(codec, [1, "b"], `/1 index is unexpected`, [1])

      Util.expectFailure(codec, null, `null did not satisfy is(ReadonlyArray<unknown>)`)
      Util.expectFailure(
        codec,
        ["a"],
        `/0 member: "a" did not satisfy is(number), member: "a" did not satisfy is(undefined)`
      )
    })

    it("post rest element", () => {
      const codec = pipe(C.array(C.number.nonNaN()), C.element(C.boolean))
      Util.expectSuccess(codec, [true])
      Util.expectSuccess(codec, [1, true])
      Util.expectSuccess(codec, [1, 2, true])
      Util.expectSuccess(codec, [1, 2, 3, true])

      Util.expectFailure(codec, ["b"], `/0 "b" did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1], `/0 1 did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1, "b"], `/1 "b" did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1, 2], `/1 2 did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1, 2, "b"], `/2 "b" did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1, 2, 3], `/2 3 did not satisfy is(boolean)`)
      Util.expectFailure(codec, [1, 2, 3, "b"], `/3 "b" did not satisfy is(boolean)`)
    })

    it("post rest element warnings", () => {
      const codec = pipe(C.array(C.string), C.element(C.struct({ a: C.number })))

      Util.expectWarning(codec, [{ a: 1, b: "b" }], `/0 /b key is unexpected`, [{ a: 1 }])
      Util.expectWarning(codec, ["a", { a: 1, b: "b" }], `/1 /b key is unexpected`, ["a", {
        a: 1
      }])
    })

    it("post rest elements", () => {
      const codec = pipe(
        C.array(C.number),
        C.element(C.boolean),
        C.element(C.union(C.string, C.undefined))
      )
      Util.expectSuccess(codec, [true, "c"])
      Util.expectSuccess(codec, [1, true, "c"])
      Util.expectSuccess(codec, [1, 2, true, "c"])
      Util.expectSuccess(codec, [1, 2, 3, true, "c"])
      Util.expectSuccess(codec, [1, 2, 3, true, undefined])

      Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
      Util.expectFailure(codec, [true], `/1 did not satisfy is(required)`)
      Util.expectFailure(codec, [1, 2, 3, true], `/2 3 did not satisfy is(boolean)`)
    })

    it("post rest elements when rest is unknown", () => {
      const codec = pipe(C.array(C.unknown), C.element(C.boolean))
      Util.expectSuccess(codec, [1, "a", 2, "b", true])
      Util.expectSuccess(codec, [true])

      Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
    })

    it("all", () => {
      const codec = pipe(
        C.tuple(C.string),
        C.rest(C.number),
        C.element(C.boolean)
      )
      Util.expectSuccess(codec, ["a", true])
      Util.expectSuccess(codec, ["a", 1, true])
      Util.expectSuccess(codec, ["a", 1, 2, true])

      Util.expectFailure(codec, [], `/0 did not satisfy is(required)`)
      Util.expectFailure(codec, ["b"], `/1 did not satisfy is(required)`)
    })

    it("baseline", () => {
      const codec = C.tuple(C.string, C.struct({ a: C.number }))
      Util.expectSuccess(codec, ["a", { a: 1 }])

      Util.expectFailure(codec, {}, "{} did not satisfy is(ReadonlyArray<unknown>)")
      Util.expectFailure(codec, ["a"], "/1 did not satisfy is(required)")

      Util.expectWarning(codec, ["a", { a: 1, b: "b" }], `/1 /b key is unexpected`, ["a", {
        a: 1
      }])
    })

    it("additional indexes should raise a warning", () => {
      const codec = C.tuple(C.string, C.number)
      Util.expectWarning(codec, ["a", 1, true], "/2 index is unexpected", ["a", 1])
    })

    it("rest", () => {
      const codec = pipe(C.tuple(C.string, C.number), C.rest(C.boolean))
      Util.expectSuccess(codec, ["a", 1])
      Util.expectSuccess(codec, ["a", 1, true])
      Util.expectSuccess(codec, ["a", 1, true, true])

      Util.expectWarning(
        codec,
        ["a", 1, true, "b", true],
        "/3 \"b\" did not satisfy is(boolean)",
        ["a", 1, true, true]
      )
    })
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const codec = C.struct({ a: C.number })
      Util.expectSuccess(codec, { a: 1 })

      Util.expectWarning(codec, { a: 1, b: "b" }, "/b key is unexpected", { a: 1 })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(codec, {}, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { a: undefined }, "/a undefined did not satisfy is(number)")
    })

    it("required field with undefined", () => {
      const codec = C.struct({ a: C.union(C.number, C.undefined) })
      Util.expectSuccess(codec, { a: 1 })
      Util.expectSuccess(codec, { a: undefined })

      Util.expectWarning(codec, { a: 1, b: "b" }, "/b key is unexpected", { a: 1 })

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
    })

    it("optional field", () => {
      const codec = C.struct({ a: C.optional(C.number) })
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: 1 })

      Util.expectWarning(codec, { a: 1, b: "b" }, "/b key is unexpected", { a: 1 })

      Util.expectFailure(
        codec,
        null,
        `null did not satisfy is({ readonly [x: string]: unknown })`
      )
      Util.expectFailure(codec, { a: "a" }, `/a "a" did not satisfy is(number)`)
      Util.expectFailure(codec, { a: undefined }, `/a undefined did not satisfy is(number)`)
    })

    it("optional field with undefined", () => {
      const codec = C.struct({ a: C.optional(C.union(C.number, C.undefined)) })
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: 1 })
      Util.expectSuccess(codec, { a: undefined })

      Util.expectWarning(codec, { a: 1, b: "b" }, "/b key is unexpected", { a: 1 })

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
    })

    it("record(string, { a: number })", () => {
      const codec = C.record("string", C.struct({ a: C.number }))
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { a: { a: 1 } })

      Util.expectFailure(codec, [], "[] did not satisfy is({ readonly [x: string]: unknown })")

      Util.expectWarning(
        codec,
        { a: "a" },
        `/a "a" did not satisfy is({ readonly [x: string]: unknown })`,
        {}
      )
      Util.expectWarning(codec, { a: { a: 1, b: "b" } }, `/a /b key is unexpected`, {
        a: { a: 1 }
      })
    })

    it("record(symbol, { a: number })", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const codec = C.record("symbol", C.struct({ a: C.number }))
      Util.expectSuccess(codec, {})
      Util.expectSuccess(codec, { [a]: { a: 1 } })

      Util.expectFailure(codec, [], "[] did not satisfy is({ readonly [x: string]: unknown })")

      Util.expectWarning(
        codec,
        { [a]: "a" },
        `/Symbol(@fp-ts/schema/test/a) "a" did not satisfy is({ readonly [x: string]: unknown })`,
        {}
      )
      Util.expectWarning(
        codec,
        { [a]: { a: 1, b: "b" } },
        `/Symbol(@fp-ts/schema/test/a) /b key is unexpected`,
        { [a]: { a: 1 } }
      )
    })

    it("additional fields should raise a warning", () => {
      const codec = C.struct({ a: C.string, b: C.number })
      Util.expectWarning(codec, { a: "a", b: 1, c: true }, "/c key is unexpected", {
        a: "a",
        b: 1
      })
    })

    it("should not add optional keys", () => {
      const codec = C.partial(C.struct({ a: C.string, b: C.number }))
      Util.expectSuccess(codec, {})
    })

    it("extend record(string, string)", () => {
      const codec = pipe(
        C.struct({ a: C.string }),
        C.extend(C.record("string", C.string))
      )
      Util.expectSuccess(codec, { a: "a" })
      Util.expectSuccess(codec, { a: "a", b: "b" })

      Util.expectFailure(codec, {}, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { b: "b" }, "/a did not satisfy is(required)")
      Util.expectFailure(codec, { a: 1 }, "/a 1 did not satisfy is(string)")

      Util.expectWarning(codec, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)", { a: "a" })
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

      it("less warnings heuristic", () => {
        const ab = C.struct({ a: C.string, b: C.optional(C.string) })
        const ac = C.struct({ a: C.string, c: C.optional(C.struct({ d: C.number })) })
        const codec = C.union(ab, ac)
        Util.expectWarning(
          codec,
          { a: "a", c: { d: 1, e: "e" } },
          `/c /e key is unexpected`,
          {
            a: "a",
            c: { d: 1 }
          }
        )
      })
    })
  })

  it("empty union", () => {
    const codec = C.union()
    Util.expectFailure(codec, 1, "1 did not satisfy is(never)")
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

    Util.expectWarning(
      codec,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is({ readonly [x: string]: unknown })",
      { a: "a1", as: [{ a: "a2", as: [] }] }
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

      Util.expectWarningTree(
        codec,
        ["a"],
        `1 error(s) found
└─ index 0
   ├─ union member
   │  └─ "a" did not satisfy is(number)
   └─ union member
      └─ "a" did not satisfy is(undefined)`,
        []
      )
    })

    it("union", () => {
      const codec = C.partial(C.union(C.string, C.array(C.number)))
      Util.expectSuccess(codec, "a")
      Util.expectSuccess(codec, [])
      Util.expectSuccess(codec, [1])
      Util.expectSuccess(codec, [undefined])

      Util.expectWarningTree(
        codec,
        ["a"],
        `1 error(s) found
└─ index 0
   ├─ union member
   │  └─ "a" did not satisfy is(number)
   └─ union member
      └─ "a" did not satisfy is(undefined)`,
        []
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

  describe.concurrent("StringBuilder", () => {
    it("max", () => {
      const codec = C.string.max(1)
      Util.expectSuccess(codec, "")
      Util.expectSuccess(codec, "a")

      Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
    })

    it("min", () => {
      const codec = C.string.nonEmpty()
      Util.expectSuccess(codec, "a")
      Util.expectSuccess(codec, "aa")

      Util.expectFailure(codec, "", `"" did not satisfy refinement({"minLength":1})`)
    })

    it("length", () => {
      const codec = C.string.length(1)
      Util.expectSuccess(codec, "a")

      Util.expectFailure(codec, "", `"" did not satisfy refinement({"minLength":1})`)
      Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"maxLength":1})`)
    })

    it("startsWith", () => {
      const codec = C.string.startsWith("a")
      Util.expectSuccess(codec, "a")
      Util.expectSuccess(codec, "ab")

      Util.expectFailure(codec, "", `"" did not satisfy refinement({"startsWith":"a"})`)
      Util.expectFailure(codec, "b", `"b" did not satisfy refinement({"startsWith":"a"})`)
    })

    it("endsWith", () => {
      const codec = C.string.endsWith("a")
      Util.expectSuccess(codec, "a")
      Util.expectSuccess(codec, "ba")

      Util.expectFailure(codec, "", `"" did not satisfy refinement({"endsWith":"a"})`)
      Util.expectFailure(codec, "b", `"b" did not satisfy refinement({"endsWith":"a"})`)
    })

    it("regex", () => {
      const codec = C.string.regex(/^abb+$/)
      Util.expectSuccess(codec, "abb")
      Util.expectSuccess(codec, "abbb")

      Util.expectFailure(codec, "ab", `"ab" did not satisfy refinement({"pattern":"/^abb+$/"})`)
      Util.expectFailure(codec, "a", `"a" did not satisfy refinement({"pattern":"/^abb+$/"})`)
    })

    it("filter", () => {
      const codec = C.string.filter((s): s is string => s.length === 1, { type: "Char" })
      Util.expectSuccess(codec, "a")

      Util.expectFailure(codec, "", `"" did not satisfy refinement({"type":"Char"})`)
      Util.expectFailure(codec, "aa", `"aa" did not satisfy refinement({"type":"Char"})`)
    })
  })

  describe.concurrent("NumberBuilder", () => {
    it("gt", () => {
      const codec = C.number.gt(0)
      Util.expectSuccess(codec, 1)
    })

    it("gte", () => {
      const codec = C.number.gte(0)
      Util.expectSuccess(codec, 0)
      Util.expectSuccess(codec, 1)

      Util.expectFailure(codec, -1, `-1 did not satisfy refinement({"minimum":0})`)
    })

    it("lt", () => {
      const codec = C.number.lt(0)
      Util.expectSuccess(codec, -1)

      Util.expectFailure(codec, 0, `0 did not satisfy refinement({"exclusiveMaximum":0})`)
      Util.expectFailure(codec, 1, `1 did not satisfy refinement({"exclusiveMaximum":0})`)
    })

    it("lte", () => {
      const codec = C.number.lte(0)
      Util.expectSuccess(codec, -1)
      Util.expectSuccess(codec, 0)

      Util.expectFailure(codec, 1, `1 did not satisfy refinement({"maximum":0})`)
    })

    it("int", () => {
      const codec = C.number.int()
      Util.expectSuccess(codec, 0)
      Util.expectSuccess(codec, 1)

      Util.expectFailure(codec, 1.2, `1.2 did not satisfy refinement({"type":"integer"})`)
    })

    it("filter", () => {
      const codec = C.number.filter((n): n is number => n % 2 === 0, { type: "Even" })
      Util.expectSuccess(codec, 0)
      Util.expectSuccess(codec, 2)
      Util.expectSuccess(codec, 4)

      Util.expectFailure(codec, 1, `1 did not satisfy refinement({"type":"Even"})`)
      Util.expectFailure(codec, 3, `3 did not satisfy refinement({"type":"Even"})`)
    })
  })
})
