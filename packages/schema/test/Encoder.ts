import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as _ from "@fp-ts/schema/Encoder"
import { empty } from "@fp-ts/schema/Provider"
import * as S from "@fp-ts/schema/Schema"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe("Encoder", () => {
  it("exports", () => {
    expect(_.EncoderId).exist
  })

  it("should throw on missing support", () => {
    const schema = S.declare(Symbol("@fp-ts/schema/test/missing"), O.none, empty)
    expect(() => _.encoderFor(schema)).toThrowError(
      new Error("Missing support for Encoder compiler, data type @fp-ts/schema/test/missing")
    )
  })

  it("string", () => {
    const encoder = _.encoderFor(S.string)
    expect(encoder.encode("a")).toEqual("a")
  })

  it("number", () => {
    const encoder = _.encoderFor(S.number)
    expect(encoder.encode(1)).toEqual(1)
  })

  it("boolean", () => {
    const encoder = _.encoderFor(S.boolean)
    expect(encoder.encode(true)).toEqual(true)
    expect(encoder.encode(false)).toEqual(false)
  })

  it("bigint", () => {
    const encoder = _.encoderFor(S.bigint)
    expect(encoder.encode(1n)).toEqual("1")
  })

  it("Encoder", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const encoder = _.encoderFor(S.symbol)
    expect(encoder.encode(a)).toEqual(a)
  })

  describe("tuple", () => {
    it("baseline", () => {
      const schema = S.tuple(S.string, NumberFromString)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", "1"])
    })

    it("rest element", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.rest(NumberFromString))
      const encoder = _.encoderFor(schema)
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
      expect(encoder.encode(["a", 1, 2])).toEqual(["a", 1, "2"])
    })
  })

  describe("struct", () => {
    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: NumberFromString })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: "1" })
    })

    it("extend stringIndexSignature", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.stringIndexSignature(NumberFromString))
      )
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, b: 1 })).toEqual({ a: 1, b: "1" })
    })

    it("extend symbolIndexSignature", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.symbolIndexSignature(NumberFromString))
      )
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, [b]: 1 })).toEqual({ a: 1, [b]: "1" })
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ [a]: "a" })).toEqual({ [a]: "a" })
    })

    it("should not output optional fields", () => {
      const schema = S.partial(S.struct({ a: S.number }))
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({})).toEqual({})
      const output = encoder.encode({ a: undefined })
      expect(output).toEqual({ a: undefined })
      if (output !== null && typeof output === "object") {
        expect(Object.keys(output)).toEqual(["a"])
      }
    })
  })

  describe("union", () => {
    it("union", () => {
      const schema = S.union(S.string, NumberFromString)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
      expect(encoder.encode(1)).toEqual("1")
    })

    describe("should give precedence to schemas containing more infos", () => {
      it("more required fields", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        const encoder = _.encoderFor(schema)
        expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 })
      })

      it("overlapping required fields", () => {
        const ab = S.struct({ a: S.string }, { b: S.number })
        const ac = S.struct({ a: S.string }, { c: S.number })
        const schema = S.union(ab, ac)
        const encoder = _.encoderFor(schema)
        expect(encoder.encode({ a: "a", c: 1 })).toEqual({ a: "a", c: 1 })
      })
    })
  })

  describe("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: undefined })).toEqual({ a: undefined })
      expect(encoder.encode({})).toEqual({})
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode(["a"])).toEqual(["a"])
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode([1])).toEqual([1])
      expect(encoder.encode([undefined])).toEqual([undefined])
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode([1])).toEqual([1])
      expect(encoder.encode([undefined])).toEqual([undefined])
    })
  })
})
