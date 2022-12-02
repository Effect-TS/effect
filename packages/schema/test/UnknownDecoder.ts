import { pipe } from "@fp-ts/data/Function"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("UnknownDecoder", () => {
  it("should allow custom errors", () => {
    const mystring = pipe(
      S.string,
      S.clone(Symbol.for("mystring"), {
        [UD.UnknownDecoderId]: () => mystringDecoder
      })
    )

    const mystringDecoder = D.make(
      mystring,
      (u) =>
        typeof u === "string" ?
          D.success(u) :
          D.failure(DE.custom({ myCustomErrorConfig: "not a string" }, u))
    )

    const Person = S.struct({
      name: mystring,
      age: S.number
    })
    const decoder = UD.unknownDecoderFor(Person)

    expect(decoder.decode({ name: "name", age: 18 })).toEqual(D.success({ name: "name", age: 18 }))
    expect(decoder.decode({ name: null, age: 18 })).toEqual(
      D.failure(DE.custom({ myCustomErrorConfig: "not a string" }, null))
    )
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.success("a"))

    expect(decoder.decode("")).toEqual(D.failure(DE.minLength(1)))
  })

  it("of", () => {
    const schema = S.of(1)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.success(1))

    expect(decoder.decode("a")).toEqual(D.failure(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))

    expect(decoder.decode(["a"])).toEqual(D.failure(DE.notType("number", undefined)))
  })

  describe("array", () => {
    it("baseline", () => {
      const schema = S.array(S.string)
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.success([]))
      expect(decoder.decode(["a"])).toEqual(D.success(["a"]))

      expect(decoder.decode(null)).toEqual(D.failure(DE.notType("ReadonlyArray<unknown>", null)))
      expect(decoder.decode([1])).toEqual(D.failure(DE.notType("string", 1)))
    })

    it("using both", () => {
      const schema = S.array(S.number)
      const decoder = UD.unknownDecoderFor(schema)
      expect(decoder.decode([1, NaN, 3])).toEqual(D.warning(DE.nan, [1, NaN, 3]))
    })
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(
      D.failure(DE.notType("{ readonly [_: string]: unknown }", null))
    )
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.failure(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.failure(DE.notType("string", 1)))
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.success({ a: "a", b: "b" }))

    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.failure(DE.notType("string", 1)))
    expect(decoder.decode({ a: "a", b: 2 })).toEqual(D.failure(DE.notType("string", 2)))
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
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.success({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.success({ a: "a1", as: [{ a: "a2", as: [] }] })
    )
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
      D.failure(DE.notType("{ readonly [_: string]: unknown }", 1))
    )
  })

  it("withRest", () => {
    const schema = pipe(S.tuple(S.string, S.number), S.withRest(S.boolean))
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.success(["a", 1]))
    expect(decoder.decode(["a", 1, true])).toEqual(D.success(["a", 1, true]))
    expect(decoder.decode(["a", 1, true, false])).toEqual(D.success(["a", 1, true, false]))
    expect(decoder.decode(["a", 1, true, "a"])).toEqual(D.failure(DE.notType("boolean", "a")))
    expect(decoder.decode(["a", 1, true, "a", true])).toEqual(D.failure(DE.notType("boolean", "a")))
  })
})
