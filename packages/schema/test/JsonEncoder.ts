import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as JE from "@fp-ts/schema/JsonEncoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe("JsonEncoder", () => {
  it("JsonEncoderId", () => {
    expect(JE.JsonEncoderId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => JE.jsonEncoderFor(schema)).toThrowError(
      new Error("Missing support for JsonEncoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  describe("of", () => {
    it("baseline", () => {
      const schema = S.literal(1)
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(1)).toEqual(1)
    })

    it("should not throw if `of` contains a non-Json encodable value", () => {
      const schema = S.literal(undefined)
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(undefined)).toEqual(undefined)
    })

    it("should throw if `of` contains a non-Json encodable value", () => {
      const schema = S.literal(1n as any)
      expect(() => JE.jsonEncoderFor(schema)).toThrow(
        "cannot encode a non-Json encodable value"
      )
    })
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, NumberFromString)
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", "1"])
    })

    it("rest element", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.withRest(NumberFromString))
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
      expect(encoder.encode(["a", 1, 2])).toEqual(["a", 1, "2"])
    })
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: NumberFromString })
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: "1" })
    })

    it("string index signature", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.withStringIndexSignature(NumberFromString)
      )
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, b: 1 })).toEqual({ a: 1, b: "1" })
    })

    it("should not output optional fields", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const encoder = JE.jsonEncoderFor(schema)
      expect(encoder.encode({})).toEqual({})
      const output = encoder.encode({ a: undefined })
      expect(output).toEqual({ a: undefined })
      if (output !== null) {
        expect(Object.keys(output)).toEqual(["a"])
      }
    })
  })

  it("union", () => {
    const schema = S.union(S.string, NumberFromString)
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode("a")).toEqual("a")
    expect(encoder.encode(1)).toEqual("1")
  })

  it("lazy", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.lazy<A>(() =>
      S.tuple(NumberFromString, S.union(schema, S.of(null)))
    )
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode([1, null])).toEqual(["1", null])
    expect(encoder.encode([1, [2, null]])).toEqual(["1", ["2", null]])
  })
})
