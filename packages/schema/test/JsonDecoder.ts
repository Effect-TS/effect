import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as set from "@fp-ts/schema/data/Set"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("JsonDecoder", () => {
  it("declaration", () => {
    const schema = set.schema(S.number)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(new Set()))
    expect(decoder.decode([1, 2, 3])).toEqual(D.success(new Set([1, 2, 3])))

    expect(decoder.decode(null)).toEqual(D.failure(DE.notType("ReadonlyArray<unknown>", null)))

    Util.expectFailure(decoder, [1, "a", 3], "/1 \"a\" did not satisfy is(number)")
  })

  it("of", () => {
    const schema = S.of(1)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))
    expect(decoder.decode("a")).toEqual(D.failure(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))

    expect(decoder.decode({})).toEqual(D.failure(DE.notType("JsonArray", {})))
    expect(decoder.decode(["a"])).toEqual(
      D.failure(DE.index(1, C.singleton(DE.notType("number", undefined))))
    )
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode(1)).toEqual(D.success(1))

    expect(decoder.decode(null)).toEqual(
      D.failures(C.make(DE.notType("string", null), DE.notType("number", null)))
    )
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(
      D.failure(DE.notType("JsonObject", null))
    )
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.failure(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.failure(DE.notType("string", 1)))
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode({})).toEqual(D.success({}))
    expect(decoder.decode({ a: "a" })).toEqual(D.success({ a: "a" }))

    expect(decoder.decode([])).toEqual(
      D.failure(DE.notType("JsonObject", []))
    )
    expect(decoder.decode({ a: 1 })).toEqual(D.failure(DE.notType("string", 1)))
  })

  describe("array", () => {
    it("baseline", () => {
      const schema = S.array(S.string)
      const decoder = JD.jsonDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode(["a"])).toEqual(D.success(["a"]))

      expect(decoder.decode(null)).toEqual(D.failure(DE.notType("JsonArray", null)))

      Util.expectFailure(decoder, [1], "/0 1 did not satisfy is(string)")
    })

    it("using both", () => {
      const schema = S.array(S.number)
      const decoder = JD.jsonDecoderFor(schema)

      Util.expectWarning(
        decoder,
        [1, NaN, 3],
        "/1 did not satisfy isNot(NaN)",
        [1, NaN, 3]
      )
    })
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode("aa")).toEqual(D.success("aa"))

    expect(decoder.decode("")).toEqual(D.failure(DE.minLength(1, "")))
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode("")).toEqual(D.success(""))
    expect(decoder.decode("a")).toEqual(D.success("a"))
    expect(decoder.decode("aa")).toEqual(D.success("aa"))

    expect(decoder.decode("aaa")).toEqual(D.failure(DE.maxLength(2, "aaa")))
  })

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))
    expect(decoder.decode(2)).toEqual(D.success(2))

    expect(decoder.decode(0)).toEqual(D.failure(DE.min(1, 0)))
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(0)).toEqual(D.success(0))
    expect(decoder.decode(1)).toEqual(D.success(1))

    expect(decoder.decode(2)).toEqual(D.failure(DE.max(1, 2)))
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
      "/0 /0 1 did not satisfy is(JsonObject)"
    )
  })

  it("withRest", () => {
    const schema = pipe(S.tuple(S.string, S.number), S.withRest(S.boolean))
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))
    expect(decoder.decode(["a", 1, true])).toEqual(D.success(["a", 1, true]))
    expect(decoder.decode(["a", 1, true, false])).toEqual(D.success(["a", 1, true, false]))

    expect(decoder.decode(["a", 1, true, "a"])).toEqual(
      D.failure(DE.index(1, C.singleton(DE.notType("boolean", "a"))))
    )
    expect(decoder.decode(["a", 1, true, "a", true])).toEqual(
      D.failure(DE.index(1, C.singleton(DE.notType("boolean", "a"))))
    )
  })

  it("withStringIndexSignature", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.withStringIndexSignature(S.string)
    )
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode({ a: "a" })).toEqual(D.success({ a: "a" }))
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.success({ a: "a", b: "b" }))

    expect(decoder.decode({})).toEqual(D.failure(DE.notType("string", undefined)))
    expect(decoder.decode({ b: "b" })).toEqual(D.failure(DE.notType("string", undefined)))
    expect(decoder.decode({ a: 1 })).toEqual(D.failure(DE.notType("string", 1)))
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.failure(DE.notType("string", 1)))
  })
})
