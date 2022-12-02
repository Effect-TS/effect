import * as C from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as JC from "@fp-ts/schema/JsonCodec"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const jsonCodecFor = JC.provideJsonCodecFor(P.empty)

const id = Symbol.for("@fp-ts/schema/test/NumberFromString")
const NumberFromString: S.Schema<number> = S.declare(
  id,
  O.none,
  P.make(id, {
    [G.GuardId]: () => G.guardFor(S.number),
    [JD.JsonDecoderId]: () => NumberFromStringJsonDecoder,
    [JE.JsonEncoderId]: () => NumberFromStringJsonEncoder
  })
)
const NumberFromStringJsonDecoder = D.make(NumberFromString, (json) => {
  if (typeof json === "string") {
    const n = parseFloat(json)
    return isNaN(n) ? D.failure(DE.notType("NumberFromString", n)) : D.success(n)
  }
  return D.failure(DE.notType("string", json))
})
const NumberFromStringJsonEncoder = E.make(NumberFromString, (n) => String(n))

describe("JsonCodec", () => {
  it("of", () => {
    const schema = S.of(1)
    const codec = jsonCodecFor(schema)
    expect(codec.decode(1)).toEqual(D.success(1))
    expect(codec.decode("a")).toEqual(D.failure(DE.notEqual(1, "a")))
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, NumberFromString)
    const codec = jsonCodecFor(schema)
    expect(codec.decode(["a", "1"])).toEqual(D.success(["a", 1]))

    expect(codec.decode(["a"])).toEqual(D.failure(DE.notType("string", undefined)))
    expect(codec.decode({})).toEqual(D.failure(DE.notType("JsonArray", {})))

    expect(codec.encode(["b", 2])).toEqual(["b", "2"])
  })

  it("union", () => {
    const schema = S.union(NumberFromString, S.string)
    const codec = jsonCodecFor(schema)
    expect(codec.decode("a")).toEqual(D.success("a"))
    expect(codec.decode("1")).toEqual(D.success(1))

    expect(codec.decode(null)).toEqual(
      D.failures(C.make(DE.notType("string", null), DE.notType("string", null)))
    )

    expect(codec.encode("b")).toEqual("b")
    expect(codec.encode(2)).toEqual("2")
  })

  it("struct", () => {
    const schema = S.struct({ a: S.string, b: S.number })
    const codec = jsonCodecFor(schema)
    expect(codec.decode({ a: "a", b: 1 })).toEqual(D.success({ a: "a", b: 1 }))

    expect(codec.decode({ a: "a" })).toEqual(D.failure(DE.notType("number", undefined)))
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    const codec = jsonCodecFor(schema)
    expect(codec.decode({})).toEqual(D.success({}))
    expect(codec.decode({ a: "a" })).toEqual(D.success({ a: "a" }))

    expect(codec.decode([])).toEqual(
      D.failure(DE.notType("JsonObject", []))
    )
    expect(codec.decode({ a: 1 })).toEqual(D.failure(DE.notType("string", 1)))
  })

  it("array", () => {
    const schema = S.array(S.string)
    const codec = jsonCodecFor(schema)
    expect(codec.decode([])).toEqual(D.success([]))
    expect(codec.decode(["a"])).toEqual(D.success(["a"]))
    expect(codec.decode(["a", "b", "c"])).toEqual(D.success(["a", "b", "c"]))

    expect(codec.decode([1])).toEqual(D.failure(DE.notType("string", 1)))
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    const codec = jsonCodecFor(schema)
    expect(codec.decode("a")).toEqual(D.success("a"))
    expect(codec.decode("aa")).toEqual(D.success("aa"))

    expect(codec.decode("")).toEqual(D.failure(DE.minLength(1)))
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    const codec = jsonCodecFor(schema)
    expect(codec.decode("")).toEqual(D.success(""))
    expect(codec.decode("a")).toEqual(D.success("a"))
    expect(codec.decode("aa")).toEqual(D.success("aa"))

    expect(codec.decode("aaa")).toEqual(D.failure(DE.maxLength(2)))
  })

  it("min", () => {
    const schema = pipe(S.number, S.min(1))
    const codec = jsonCodecFor(schema)
    expect(codec.decode(1)).toEqual(D.success(1))
    expect(codec.decode(2)).toEqual(D.success(2))

    expect(codec.decode(0)).toEqual(D.failure(DE.min(1)))
  })

  it("max", () => {
    const schema = pipe(S.number, S.max(1))
    const codec = jsonCodecFor(schema)
    expect(codec.decode(0)).toEqual(D.success(0))
    expect(codec.decode(1)).toEqual(D.success(1))

    expect(codec.decode(2)).toEqual(D.failure(DE.max(1)))
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
    const codec = jsonCodecFor(schema)
    expect(codec.decode({ a: "a1", as: [] })).toEqual(D.success({ a: "a1", as: [] }))
    expect(codec.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
      D.success({ a: "a1", as: [{ a: "a2", as: [] }] })
    )
    expect(codec.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
      D.failure(DE.notType("JsonObject", 1))
    )
  })
})
