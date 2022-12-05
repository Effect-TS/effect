import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"
import * as UE from "@fp-ts/schema/UnknownEncoder"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe("UnknownEncoder", () => {
  it("UnknownEncoderId", () => {
    expect(UE.UnknownEncoderId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => UE.unknownEncoderFor(schema)).toThrowError(
      new Error("Missing support for UnknownEncoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, NumberFromString)
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", "1"])
    })

    it("rest element", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.withRest(NumberFromString))
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
      expect(encoder.encode(["a", 1, 2])).toEqual(["a", 1, "2"])
    })
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: NumberFromString })
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: "1" })
    })

    it("extend stringIndexSignature", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.stringIndexSignature(NumberFromString))
      )
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, b: 1 })).toEqual({ a: 1, b: "1" })
    })

    it("extend symbolIndexSignature", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.symbolIndexSignature(NumberFromString))
      )
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, [b]: 1 })).toEqual({ a: 1, [b]: "1" })
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode({ [a]: "a" })).toEqual({ [a]: "a" })
    })

    it("should not output optional fields", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const encoder = UE.unknownEncoderFor(schema)
      expect(encoder.encode({})).toEqual({})
      const output = encoder.encode({ a: undefined })
      expect(output).toEqual({ a: undefined })
      if (output !== null && typeof output === "object") {
        expect(Object.keys(output)).toEqual(["a"])
      }
    })
  })

  it("union", () => {
    const schema = S.union(S.string, NumberFromString)
    const encoder = UE.unknownEncoderFor(schema)
    expect(encoder.encode("a")).toEqual("a")
    expect(encoder.encode(1)).toEqual("1")
  })
})
