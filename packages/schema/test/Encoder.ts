import { pipe } from "@fp-ts/data/Function"
import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as E from "@fp-ts/schema/Encoder"
import * as S from "@fp-ts/schema/Schema"

const NumberFromString = pipe(S.string, parseFloat.schema)

describe.concurrent("Encoder", () => {
  it("string", () => {
    const encoder = E.encoderFor(S.string)
    expect(encoder.encode("a")).toEqual("a")
  })

  it("number", () => {
    const encoder = E.encoderFor(S.number)
    expect(encoder.encode(1)).toEqual(1)
  })

  it("boolean", () => {
    const encoder = E.encoderFor(S.boolean)
    expect(encoder.encode(true)).toEqual(true)
    expect(encoder.encode(false)).toEqual(false)
  })

  it("bigint", () => {
    const encoder = E.encoderFor(S.bigint)
    expect(encoder.encode(1n)).toEqual("1")
  })

  it("symbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const encoder = E.encoderFor(S.symbol)
    expect(encoder.encode(a)).toEqual(a)
  })

  it("object", () => {
    const encoder = E.encoderFor(S.object)
    expect(encoder.encode({})).toEqual({})
    expect(encoder.encode([])).toEqual([])
    expect(encoder.encode([1, 2, 3])).toEqual([1, 2, 3])
  })

  it("literal", () => {
    const encoder = E.encoderFor(S.literal(null))
    expect(encoder.encode(null)).toEqual(null)
  })

  describe.concurrent("enums", () => {
    it("Numeric enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode(Fruits.Apple)).toEqual(0)
      expect(encoder.encode(Fruits.Banana)).toEqual(1)
    })

    it("String enums", () => {
      enum Fruits {
        Apple = "apple",
        Banana = "banana",
        Cantaloupe = 0
      }
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode(Fruits.Apple)).toEqual("apple")
      expect(encoder.encode(Fruits.Banana)).toEqual("banana")
      expect(encoder.encode(Fruits.Cantaloupe)).toEqual(0)
    })

    it("Const enums", () => {
      const Fruits = {
        Apple: "apple",
        Banana: "banana",
        Cantaloupe: 3
      } as const
      const schema = S.enums(Fruits)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode(Fruits.Apple)).toEqual("apple")
      expect(encoder.encode(Fruits.Banana)).toEqual("banana")
      expect(encoder.encode(Fruits.Cantaloupe)).toEqual(3)
    })
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([])).toEqual([])
  })

  it("tuple. required element", () => {
    const schema = S.tuple(NumberFromString)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([1])).toStrictEqual(["1"])
    const x = [1, "b"] as any
    expect(encoder.encode(x)).toStrictEqual(["1"])
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(NumberFromString, S.undefined))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([1])).toStrictEqual(["1"])
    expect(encoder.encode([undefined])).toStrictEqual([undefined])
    const x = [1, "b"] as any
    expect(encoder.encode(x)).toStrictEqual(["1"])
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(NumberFromString))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([])).toStrictEqual([])
    expect(encoder.encode([1])).toStrictEqual(["1"])
    const x = [1, "b"] as any
    expect(encoder.encode(x)).toStrictEqual(["1"])
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(NumberFromString, S.undefined)))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([])).toStrictEqual([])
    expect(encoder.encode([1])).toStrictEqual(["1"])
    const x = [1, "b"] as any
    expect(encoder.encode(x)).toStrictEqual(["1"])
    expect(encoder.encode([undefined])).toStrictEqual([undefined])
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(NumberFromString))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(["a"])).toStrictEqual(["a"])
    expect(encoder.encode(["a", 1])).toStrictEqual(["a", "1"])
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(["a"])).toStrictEqual(["a"])
    expect(encoder.encode(["a", 1])).toStrictEqual(["a", "1"])
    expect(encoder.encode(["a", 1, 2])).toStrictEqual(["a", "1", "2"])
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(NumberFromString))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([])).toStrictEqual([])
    expect(encoder.encode(["a"])).toStrictEqual(["a"])
    expect(encoder.encode(["a", 1])).toStrictEqual(["a", "1"])
    expect(encoder.encode(["a", 1, 2])).toStrictEqual(["a", "1", "2"])
  })

  it("tuple. r", () => {
    const schema = S.array(NumberFromString)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([])).toStrictEqual([])
    expect(encoder.encode([1])).toStrictEqual(["1"])
    expect(encoder.encode([1, 2])).toStrictEqual(["1", "2"])
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(NumberFromString))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode([1])).toStrictEqual(["1"])
    expect(encoder.encode(["a", 1])).toStrictEqual(["a", "1"])
    expect(encoder.encode(["a", "b", 1])).toStrictEqual(["a", "b", "1"])
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(NumberFromString), S.element(S.boolean))
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(["a", true])).toStrictEqual(["a", true])
    expect(encoder.encode(["a", 1, true])).toStrictEqual(["a", "1", true])
    expect(encoder.encode(["a", 1, 2, true])).toStrictEqual(["a", "1", "2", true])
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      expect(encoder.encode({ a: undefined })).toStrictEqual({ a: undefined })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({})).toStrictEqual({})
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({})).toStrictEqual({})
      expect(encoder.encode({ a: 1 })).toStrictEqual({ a: 1 })
      const x = { a: 1, b: "b" }
      expect(encoder.encode(x)).toStrictEqual({ a: 1 })
      expect(encoder.encode({ a: undefined })).toStrictEqual({ a: undefined })
    })

    it("extend record(string, NumberFromString)", () => {
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.string, NumberFromString))
      )
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, b: 1 })).toEqual({ a: 1, b: "1" })
    })

    it("extend record(symbol, NumberFromString)", () => {
      const b = Symbol.for("@fp-ts/schema/test/b")
      const schema = pipe(
        S.struct({ a: S.number }),
        S.extend(S.record(S.symbol, NumberFromString))
      )
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({ a: 1, [b]: 1 })).toEqual({ a: 1, [b]: "1" })
    })

    it("should handle symbols as keys", () => {
      const a = Symbol.for("@fp-ts/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ [a]: "a" })).toEqual({ [a]: "a" })
    })
  })

  describe.concurrent("union", () => {
    it("union", () => {
      const schema = S.union(S.string, NumberFromString)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
      expect(encoder.encode(1)).toEqual("1")
    })

    describe.concurrent("should give precedence to schemas containing more infos", () => {
      it("more required fields", () => {
        const a = S.struct({ a: S.string })
        const ab = S.struct({ a: S.string, b: S.number })
        const schema = S.union(a, ab)
        const encoder = E.encoderFor(schema)
        expect(encoder.encode({ a: "a", b: 1 })).toEqual({ a: "a", b: 1 })
      })

      it("optional fields", () => {
        const ab = S.struct({ a: S.string, b: S.optional(S.number) })
        const ac = S.struct({ a: S.string, c: S.optional(S.number) })
        const schema = S.union(ab, ac)
        const encoder = E.encoderFor(schema)
        expect(encoder.encode({ a: "a", c: 1 })).toEqual({ a: "a", c: 1 })
      })
    })
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode({ a: 1 })).toEqual({ a: 1 })
      expect(encoder.encode({})).toEqual({})
    })

    it("tuple", () => {
      const schema = pipe(S.tuple(S.string, S.number), S.partial)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode(["a"])).toEqual(["a"])
      expect(encoder.encode(["a", 1])).toEqual(["a", 1])
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode([1])).toEqual([1])
      expect(encoder.encode([undefined])).toEqual([undefined])
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      const encoder = E.encoderFor(schema)
      expect(encoder.encode("a")).toEqual("a")
      expect(encoder.encode([])).toEqual([])
      expect(encoder.encode([1])).toEqual([1])
      expect(encoder.encode([undefined])).toEqual([undefined])
    })
  })

  it("lazy", () => {
    interface A {
      readonly a: number
      readonly as: ReadonlyArray<A>
    }
    const schema: S.Schema<A> = S.lazy<A>(() =>
      S.struct({
        a: NumberFromString,
        as: S.array(schema)
      })
    )
    const encoder = E.encoderFor(schema)
    expect(encoder.encode({ a: 1, as: [] })).toEqual({ a: "1", as: [] })
    expect(encoder.encode({ a: 1, as: [{ a: 2, as: [] }] })).toEqual({
      a: "1",
      as: [{ a: "2", as: [] }]
    })
  })
})
