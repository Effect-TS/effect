import * as C from "@fp-ts/data/Chunk"
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

    expect(codec.decode({})).toEqual(D.failure(DE.notType("JsonArray", {})))
    expect(codec.decode(["a"])).toEqual(
      D.failure(DE.index(1, C.singleton(DE.notType("string", undefined))))
    )

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
})
