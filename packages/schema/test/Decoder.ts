import { pipe } from "@fp-ts/data/Function"
import * as _ from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Decoder", () => {
  it("exports", () => {
    expect(_.DecoderId).exist
    expect(_.make).exist
    expect(_.success).exist
    expect(_.failure).exist
    expect(_.failures).exist
    expect(_.warning).exist
    expect(_.warnings).exist
    expect(_.isSuccess).exist
    expect(_.isFailure).exist
    expect(_.isWarning).exist
  })

  it("string", () => {
    const decoder = _.decoderFor(S.string)
    expect(decoder.decode("a")).toEqual(_.success("a"))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(string)")
  })

  describe.concurrent("number", () => {
    const decoder = _.decoderFor(S.number)

    it("baseline", () => {
      expect(decoder.decode(1)).toEqual(_.success(1))
      Util.expectFailure(decoder, "a", "\"a\" did not satisfy is(number)")
    })

    it("should warn for NaN", () => {
      Util.expectWarning(decoder, NaN, "did not satisfy not(isNaN)", NaN)
    })

    it("should warn for no finite values", () => {
      Util.expectWarning(decoder, Infinity, "did not satisfy isFinite", Infinity)
      Util.expectWarning(decoder, -Infinity, "did not satisfy isFinite", -Infinity)
    })
  })

  it("boolean", () => {
    const decoder = _.decoderFor(S.boolean)
    expect(decoder.decode(true)).toEqual(_.success(true))
    expect(decoder.decode(false)).toEqual(_.success(false))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(boolean)")
  })

  it("bigint", () => {
    const decoder = _.decoderFor(S.bigint)

    expect(decoder.decode(0n)).toEqual(_.success(0n))
    expect(decoder.decode(1n)).toEqual(_.success(1n))
    expect(decoder.decode("1")).toEqual(_.success(1n))
    Util.expectFailure(
      decoder,
      null,
      "null did not satisfy is(string | number | boolean)"
    )
    Util.expectFailure(
      decoder,
      1.2,
      "1.2 did not satisfy is(bigint)"
    )
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const decoder = _.decoderFor(S.symbol)
    expect(decoder.decode(a)).toEqual(_.success(a))
    Util.expectFailure(decoder, 1, "1 did not satisfy is(symbol)")
  })

  it("literal", () => {
    const schema = S.literal(1, "a")
    const decoder = _.decoderFor(schema)
    expect(decoder.decode(1)).toEqual(_.success(1))
    expect(decoder.decode("a")).toEqual(_.success("a"))

    Util.expectFailureTree(
      decoder,
      null,
      `2 error(s) found
├─ union member
│  └─ null did not satisfy isEqual(1)
└─ union member
   └─ null did not satisfy isEqual("a")`
    )
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.nativeEnum(Fruits)
      const decoder = _.decoderFor(schema)
      Util.expectSuccess(decoder, Fruits.Apple)
      Util.expectSuccess(decoder, Fruits.Banana)
      Util.expectSuccess(decoder, 0)
      Util.expectSuccess(decoder, 1)

      Util.expectFailure(
        decoder,
        3,
        `member: 3 did not satisfy isEqual(0), member: 3 did not satisfy isEqual(1)`
      )
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.nativeEnum(Fruits)
      const decoder = _.decoderFor(schema)
      Util.expectSuccess(decoder, Fruits.Apple)
      Util.expectSuccess(decoder, Fruits.Cantaloupe)
      Util.expectSuccess(decoder, "apple")
      Util.expectSuccess(decoder, "banana")
      Util.expectSuccess(decoder, 0)

      Util.expectFailureTree(
        decoder,
        "Cantaloupe",
        `3 error(s) found
├─ union member
│  └─ "Cantaloupe" did not satisfy isEqual("apple")
├─ union member
│  └─ "Cantaloupe" did not satisfy isEqual("banana")
└─ union member
   └─ "Cantaloupe" did not satisfy isEqual(0)`
      )
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.nativeEnum(Fruits)
      const decoder = _.decoderFor(schema)
      Util.expectSuccess(decoder, "apple")
      Util.expectSuccess(decoder, "banana")
      Util.expectSuccess(decoder, 3)

      Util.expectFailureTree(
        decoder,
        "Cantaloupe",
        `3 error(s) found
├─ union member
│  └─ "Cantaloupe" did not satisfy isEqual("apple")
├─ union member
│  └─ "Cantaloupe" did not satisfy isEqual("banana")
└─ union member
   └─ "Cantaloupe" did not satisfy isEqual(3)`
      )
    })
  })

  describe.concurrent("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(_.success(["a", 1]))

      Util.expectFailure(decoder, {}, "{} did not satisfy is(ReadonlyArray<unknown>)")
      Util.expectFailure(decoder, ["a"], "/1 undefined did not satisfy is(number)")

      Util.expectWarning(decoder, ["a", NaN], "/1 did not satisfy not(isNaN)", ["a", NaN])
    })

    it("additional indexes should raise a warning", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = _.decoderFor(schema)
      Util.expectWarning(decoder, ["a", 1, true], "/2 index is unexpected", ["a", 1])
    })

    it("rest", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
      const decoder = _.decoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(_.success(["a", 1]))
      expect(decoder.decode(["a", 1, true])).toEqual(_.success(["a", 1, true]))
      expect(decoder.decode(["a", 1, true, false])).toEqual(_.success(["a", 1, true, false]))

      Util.expectFailure(decoder, ["a", 1, true, "a", true], "/3 \"a\" did not satisfy is(boolean)")
    })

    it("ReadonlyArray<unknown>", () => {
      const decoder = _.decoderFor(S.array(S.unknown))
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode(["a", 1, true])).toEqual(_.success(["a", 1, true]))
    })

    it("ReadonlyArray<any>", () => {
      const decoder = _.decoderFor(S.array(S.any))
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode(["a", 1, true])).toEqual(_.success(["a", 1, true]))
    })
  })

  it("optional", () => {
    const schema = S.optional(S.number)
    const decoder = _.decoderFor(schema)
    Util.expectSuccess(decoder, 1)
    Util.expectFailure(decoder, undefined, `undefined did not satisfy is(number)`)
    Util.expectFailure(decoder, "a", `"a" did not satisfy is(number)`)
    Util.expectWarning(decoder, NaN, "did not satisfy not(isNaN)", NaN)
  })

  describe.concurrent("struct", () => {
    it("should handle strings as keys", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(_.success({ a: "a", b: 1 }))

      Util.expectFailure(
        decoder,
        null,
        "null did not satisfy is({ readonly [_: string]: unknown })"
      )
      Util.expectFailure(decoder, { a: "a", b: "a" }, "/b \"a\" did not satisfy is(number)")
      Util.expectFailure(decoder, { a: 1, b: "a" }, "/a 1 did not satisfy is(string)")

      Util.expectWarning(decoder, { a: "a", b: NaN }, "/b did not satisfy not(isNaN)", {
        a: "a",
        b: NaN
      })
    })

    it("additional fields should raise a warning", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = _.decoderFor(schema)
      Util.expectWarning(decoder, { a: "a", b: 1, c: true }, "/c key is unexpected", {
        a: "a",
        b: 1
      })
    })

    it("should not add optional keys", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({})).toEqual(_.success({}))
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.number)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({})).toEqual(_.success({}))
      expect(decoder.decode({ a: 1 })).toEqual(_.success({ a: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is({ readonly [_: string]: unknown })")
      Util.expectFailure(decoder, { a: "a" }, "/a \"a\" did not satisfy is(number)")

      Util.expectWarning(decoder, { a: NaN }, "/a did not satisfy not(isNaN)", { a: NaN })
    })

    it("extend stringIndexSignature", () => {
      const schema = pipe(
        S.struct({ a: S.string }),
        S.extend(S.stringIndexSignature(S.string))
      )
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({ a: "a" })).toEqual(_.success({ a: "a" }))
      expect(decoder.decode({ a: "a", b: "b" })).toEqual(_.success({ a: "a", b: "b" }))

      Util.expectFailure(decoder, {}, "/a undefined did not satisfy is(string)")
      Util.expectFailure(decoder, { b: "b" }, "/a undefined did not satisfy is(string)")
      Util.expectFailure(decoder, { a: 1 }, "/a 1 did not satisfy is(string)")
      Util.expectFailure(decoder, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)")
    })

    it("symbolIndexSignature", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.symbolIndexSignature(S.number)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({})).toEqual(_.success({}))
      expect(decoder.decode({ [a]: 1 })).toEqual(_.success({ [a]: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is({ readonly [_: string]: unknown })")
      Util.expectFailure(
        decoder,
        { [a]: "a" },
        "/Symbol(@fp-ts/schema/test/a) \"a\" did not satisfy is(number)"
      )

      Util.expectWarning(
        decoder,
        { [a]: NaN },
        "/Symbol(@fp-ts/schema/test/a) did not satisfy not(isNaN)",
        { [a]: NaN }
      )
    })
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const decoder = _.decoderFor(schema)
      expect(decoder.decode({})).toEqual(_.success({}))
      expect(decoder.decode({ a: 1 })).toEqual(_.success({ a: 1 }))

      Util.expectFailure(decoder, { a: undefined }, `/a undefined did not satisfy is(number)`)
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode(["a"])).toEqual(_.success(["a"]))
      expect(decoder.decode(["a", 1])).toEqual(_.success(["a", 1]))
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const decoder = _.decoderFor(schema)
      expect(decoder.decode([])).toEqual(_.success([]))
      expect(decoder.decode([1])).toEqual(_.success([1]))
      expect(decoder.decode([undefined])).toEqual(_.success([undefined]))

      Util.expectFailureTree(
        decoder,
        ["a"],
        `1 error(s) found
└─ index 0
   ├─ union member
   │  └─ "a" did not satisfy is(number)
   └─ union member
      └─ "a" did not satisfy is(undefined)`
      )
    })

    describe.concurrent("union", () => {
      it("baseline", () => {
        const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
        const decoder = _.decoderFor(schema)
        expect(decoder.decode("a")).toEqual(_.success("a"))
        expect(decoder.decode([])).toEqual(_.success([]))
        expect(decoder.decode([1])).toEqual(_.success([1]))
        expect(decoder.decode([undefined])).toEqual(_.success([undefined]))

        Util.expectFailureTree(
          decoder,
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

      it("empty union", () => {
        const schema = S.union()
        const decoder = _.decoderFor(schema)
        Util.expectFailure(decoder, 1, "1 did not satisfy is(never)")
      })

      describe.concurrent("should give precedence to schemas containing more infos", () => {
        it("more required fields", () => {
          const a = S.struct({ a: S.string })
          const ab = S.struct({ a: S.string, b: S.number })
          const schema = S.union(a, ab)
          const decoder = _.decoderFor(schema)
          expect(decoder.decode({ a: "a", b: 1 })).toEqual(_.success({ a: "a", b: 1 }))
        })

        it("optional fields", () => {
          const ab = S.struct({ a: S.string, b: S.optional(S.number) })
          const ac = S.struct({ a: S.string, c: S.optional(S.number) })
          const schema = S.union(ab, ac)
          const decoder = _.decoderFor(schema)
          expect(decoder.decode({ a: "a", c: 1 })).toEqual(_.success({ a: "a", c: 1 }))
        })

        it("less warnings heuristic", () => {
          const ab = S.struct({ a: S.string, b: S.optional(S.string) })
          const ac = S.struct({ a: S.string, c: S.optional(S.number) })
          const schema = S.union(ab, ac)
          const decoder = _.decoderFor(schema)
          Util.expectWarning(decoder, { a: "a", c: NaN }, "/c did not satisfy not(isNaN)", {
            a: "a",
            c: NaN
          })
        })
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
    const decoder = _.decoderFor(schema)
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(_.success({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      _.success({ a: "a1", as: [{ a: "a2", as: [] }] })
    )

    Util.expectFailure(
      decoder,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is({ readonly [_: string]: unknown })"
    )
  })

  describe.concurrent("omit", () => {
    it("baseline", () => {
      const base = S.struct({ a: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const decoder = _.decoderFor(schema)
      Util.expectSuccess(decoder, { a: "a", b: 1 })

      Util.expectFailure(
        decoder,
        null,
        "null did not satisfy is({ readonly [_: string]: unknown })"
      )
      Util.expectFailure(decoder, { a: "a" }, "/b undefined did not satisfy is(number)")
      Util.expectFailure(decoder, { b: 1 }, "/a undefined did not satisfy is(string)")
    })

    it("involving a symbol", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const base = S.struct({ [a]: S.string, b: S.number, c: S.boolean })
      const schema = pipe(base, S.omit("c"))
      const decoder = _.decoderFor(schema)
      Util.expectSuccess(decoder, { [a]: "a", b: 1 })

      Util.expectFailure(
        decoder,
        null,
        "null did not satisfy is({ readonly [_: string]: unknown })"
      )
      Util.expectFailure(decoder, { [a]: "a" }, "/b undefined did not satisfy is(number)")
      Util.expectFailure(
        decoder,
        { b: 1 },
        "/Symbol(@fp-ts/schema/test/a) undefined did not satisfy is(string)"
      )
    })
  })
})
