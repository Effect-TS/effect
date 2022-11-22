import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"

describe("Decoder", () => {
  it("compose", () => {
    expect(D.compose).exist
  })

  it("flatMap", () => {
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.right(2)))).toEqual(T.both(["e1"], 2))
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.left(["e2"])))).toEqual(T.left(["e1", "e2"]))
    expect(pipe(T.both(["e1"], 1), D.flatMap(() => T.both(["e2"], 2)))).toEqual(
      T.both(["e1", "e2"], 2)
    )
  })

  it("string", () => {
    const schema = S.string
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.succeed("a"))

    expect(decoder.decode(1)).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.succeed("a"))

    expect(decoder.decode("")).toEqual(D.fail(DE.minLength(1)))
  })

  it("number", () => {
    const schema = S.number
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.succeed(1))

    expect(decoder.decode("a")).toEqual(D.fail(DE.notType("number", "a")))
  })

  it("boolean", () => {
    const schema = S.boolean
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode(true)).toEqual(D.succeed(true))
    expect(decoder.decode(false)).toEqual(D.succeed(false))

    expect(decoder.decode("a")).toEqual(D.fail(DE.notType("boolean", "a")))
  })

  it("of", () => {
    const schema = S.of(1)
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode(1)).toEqual(D.succeed(1))

    expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

    expect(decoder.decode(["a"])).toEqual(D.fail(DE.notType("number", undefined)))
  })

  describe("array", () => {
    it("baseline", () => {
      const schema = S.array(S.string)
      const decoder = D.unsafeDecoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))

      expect(decoder.decode(null)).toEqual(D.fail(DE.notType("ReadonlyArray<unknown>", null)))
      expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("using both", () => {
      const schema = S.array(S.number)
      const decoder = D.unsafeDecoderFor(schema)
      expect(decoder.decode([1, NaN, 3])).toEqual(T.both([DE.nan], [1, NaN, 3]))
    })
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

    expect(decoder.decode(null)).toEqual(
      D.fail(DE.notType("{ readonly [_: string]: unknown }", null))
    )
    expect(decoder.decode({ a: "a", b: "a" })).toEqual(D.fail(DE.notType("number", "a")))
    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
  })

  it("indexSignature", () => {
    const schema = S.indexSignature(S.string)
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode({ a: "a", b: "b" })).toEqual(D.succeed({ a: "a", b: "b" }))

    expect(decoder.decode({ a: 1, b: "a" })).toEqual(D.fail(DE.notType("string", 1)))
    expect(decoder.decode({ a: "a", b: 2 })).toEqual(D.fail(DE.notType("string", 2)))
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
    const decoder = D.unsafeDecoderFor(schema)
    expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.succeed({ a: "a1", as: [] }))
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.succeed({ a: "a1", as: [{ a: "a2", as: [] }] })
    )
    expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
      D.fail(DE.notType("{ readonly [_: string]: unknown }", 1))
    )
  })
})
