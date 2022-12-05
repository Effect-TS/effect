import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as set from "@fp-ts/schema/data/ReadonlySet"
import * as D from "@fp-ts/schema/Decoder"
import * as JD from "@fp-ts/schema/JsonDecoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonDecoder", () => {
  it("JsonDecoderId", () => {
    expect(JD.JsonDecoderId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => JD.jsonDecoderFor(schema)).toThrowError(
      new Error("Missing support for JsonDecoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("declaration", () => {
    const schema = set.schema(S.number)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(new Set()))
    expect(decoder.decode([1, 2, 3])).toEqual(D.success(new Set([1, 2, 3])))

    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(decoder, [1, "a", 3], "/1 \"a\" did not satisfy is(number)")
  })

  it("of", () => {
    const schema = S.of(1)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))

    Util.expectFailure(decoder, "a", "\"a\" did not satisfy isEqual(1)")
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))

      Util.expectFailure(decoder, {}, "{} did not satisfy is(JsonArray)")
      Util.expectFailure(decoder, ["a"], "/1 undefined did not satisfy is(number)")

      Util.expectWarning(decoder, ["a", NaN], "/1 did not satisfy not(isNaN)", ["a", NaN])
    })

    it("additional indexes should raise a warning", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = JD.jsonDecoderFor(schema)
      Util.expectWarning(decoder, ["a", 1, true], "/2 index is unexpected", ["a", 1])
    })
  })

  describe("struct", () => {
    it("should handle strings as keys", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

      Util.expectFailure(decoder, null, "null did not satisfy is(JsonObject)")
      Util.expectFailure(decoder, { a: "a", b: "a" }, "/b \"a\" did not satisfy is(number)")
      Util.expectFailure(decoder, { a: 1, b: "a" }, "/a 1 did not satisfy is(string)")

      Util.expectWarning(decoder, { a: "a", b: NaN }, "/b did not satisfy not(isNaN)", {
        a: "a",
        b: NaN
      })
    })

    it("additional fields should raise a warning", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = JD.jsonDecoderFor(schema)
      Util.expectWarning(decoder, { a: "a", b: 1, c: true }, "/c key is unexpected", {
        a: "a",
        b: 1
      })
    })

    it("should not fail on optional fields", () => {
      const schema = S.partial(S.struct({ a: S.string, b: S.number }))
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
    })

    it("stringIndexSignature", () => {
      const schema = S.stringIndexSignature(S.number)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode({})).toEqual(D.success({}))
      expect(decoder.decode({ a: 1 })).toEqual(D.success({ a: 1 }))

      Util.expectFailure(decoder, [], "[] did not satisfy is(JsonObject)")
      Util.expectFailure(decoder, { a: "a" }, "/a \"a\" did not satisfy is(number)")

      Util.expectWarning(decoder, { a: NaN }, "/a did not satisfy not(isNaN)", { a: NaN })
    })
  })

  describe("union", () => {
    it("baseline", () => {
      const schema = S.union(S.string, S.number)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.success("a"))
      expect(decoder.decode(1)).toEqual(D.success(1))

      Util.expectFailure(
        decoder,
        null,
        "member 0 null did not satisfy is(string), member 1 null did not satisfy is(number)"
      )
    })

    it("empty union", () => {
      const schema = S.union()
      const decoder = JD.jsonDecoderFor(schema)
      Util.expectFailure(decoder, 1, "1 did not satisfy is(never)")
    })
  })

  describe("array", () => {
    it("baseline", () => {
      const schema = S.array(S.string)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode(["a"])).toEqual(D.success(["a"]))

      Util.expectFailure(decoder, null, "null did not satisfy is(JsonArray)")
      Util.expectFailure(decoder, [1], "/0 1 did not satisfy is(string)")
    })

    it("using both", () => {
      const schema = S.array(S.number)
      const decoder = JD.jsonDecoderFor(schema)

      Util.expectWarning(
        decoder,
        [1, NaN, 3],
        "/1 did not satisfy not(isNaN)",
        [1, NaN, 3]
      )
    })
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode("aa")).toEqual(D.success("aa"))

    Util.expectFailure(decoder, "", "\"\" did not satisfy minLength(1)")
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode("")).toEqual(D.success(""))
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode("aa")).toEqual(D.success("aa"))

    Util.expectFailure(decoder, "aaa", "\"aaa\" did not satisfy maxLength(2)")
  })

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))
    expect(decoder.decode(2)).toEqual(D.success(2))

    Util.expectFailure(decoder, 0, "0 did not satisfy min(1)")
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(0)).toEqual(D.success(0))
    expect(decoder.decode(1)).toEqual(D.success(1))

    Util.expectFailure(decoder, 2, "2 did not satisfy max(1)")
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
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.success({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.success({ a: "a1", as: [{ a: "a2", as: [] }] })
    )

    Util.expectFailure(
      decoder,
      { a: "a1", as: [{ a: "a2", as: [1] }] },
      "/as /0 /as /0 1 did not satisfy is(JsonObject)"
    )
  })

  it("withRest", () => {
    const schema = pipe(S.tuple(S.string, S.number), S.withRest(S.boolean))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))
    expect(decoder.decode(["a", 1, true])).toEqual(D.success(["a", 1, true]))
    expect(decoder.decode(["a", 1, true, false])).toEqual(D.success(["a", 1, true, false]))

    Util.expectFailure(decoder, ["a", 1, true, "a", true], "/3 \"a\" did not satisfy is(boolean)")
  })

  it("withStringIndexSignature", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.withStringIndexSignature(S.string)
    )
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode({ a: "a" })).toEqual(D.success({ a: "a" }))
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.success({ a: "a", b: "b" }))

    Util.expectFailure(decoder, {}, "/a undefined did not satisfy is(string)")
    Util.expectFailure(decoder, { b: "b" }, "/a undefined did not satisfy is(string)")
    Util.expectFailure(decoder, { a: 1 }, "/a 1 did not satisfy is(string)")
    Util.expectFailure(decoder, { a: "a", b: 1 }, "/b 1 did not satisfy is(string)")
  })
})
