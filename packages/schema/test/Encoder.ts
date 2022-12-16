import { pipe } from "@fp-ts/data/Function"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as _ from "@fp-ts/schema/Encoder"
import * as S from "@fp-ts/schema/Schema"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe.concurrent("Encoder", () => {
  it("exports", () => {
    expect(_.EncoderId).exist
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

  describe.concurrent("tuple", () => {
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

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      expect(encoder.encode({ a: undefined })).toStrictEqual({ a: undefined })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({})).toStrictEqual({})
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({})).toStrictEqual({})
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
      expect(encoder.encode({ a: undefined })).toStrictEqual({ a: undefined })
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
  })

  describe.concurrent("union", () => {
    it("union", () => {
      const schema = S.union(S.string, NumberFromString)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
      expect(encoder.encode(1)).toEqual("1")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required fields", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        const encoder = _.encoderFor(schema)
        expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 })
      })

      it("optional fields", () => {
        const ab = S.struct({ a: S.string, b: S.optional(S.number) })
        const ac = S.struct({ a: S.string, c: S.optional(S.number) })
        const schema = S.union(ab, ac)
        const encoder = _.encoderFor(schema)
        expect(encoder.encode({ a: "a", c: 1 })).toEqual({ a: "a", c: 1 })
      })
    })
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const encoder = _.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
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
