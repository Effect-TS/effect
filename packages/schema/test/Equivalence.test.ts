import * as A from "@effect/schema/Arbitrary"
import * as E from "@effect/schema/Equivalence"
import * as S from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import { isUnknown } from "effect/Predicate"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * Tests that the generated Eq is a valid Eq
 */
export const propertyType = <A, I>(
  schema: S.Schema<A, I>,
  params?: fc.Parameters<[A, ...Array<A>]>
) => {
  const arb = A.make(schema)(fc)
  // console.log(fc.sample(arb, 10))
  const equivalence = E.make(schema)

  const reflexivity = fc.property(arb, (a) => equivalence(a, a))
  const symmetry = fc.property(arb, arb, (a, b) => equivalence(a, b) === equivalence(b, a))
  const transitivity = fc.property(
    arb,
    arb,
    arb,
    (a, b, c) =>
      /*
        A logical implication is a relationship between two propositions that states that if the first proposition is true,
        then the second proposition must also be true. In terms of booleans, a logical implication can be translated as:

        (p → q) ≡ ¬p ∨ q
      */
      !(equivalence(a, b) && equivalence(b, c)) || equivalence(a, c)
  )

  fc.assert(reflexivity, params)
  fc.assert(symmetry, params)
  fc.assert(transitivity, params)
}

const string = S.string.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "string" || typeof b !== "string") {
      throw new Error("invalid string provided to `string`")
    }
    return a === b
  }
})

const number = S.JsonNumber.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("invalid number provided to `number`")
    }
    return a === b
  }
})

const symbol = S.symbolFromSelf.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "symbol" || typeof b !== "symbol") {
      throw new Error("invalid symbol provided to `symbol`")
    }
    return a === b
  }
})

describe("Equivalence", () => {
  it("transformation", () => {
    const schema = S.NumberFromString
    const equivalence = E.make(schema)

    expect(equivalence(1, 1)).toBe(true)

    expect(equivalence(1, 2)).toBe(false)
  })

  it("E.make(S.encodedSchema(schema))", () => {
    const schema = S.NumberFromString
    const equivalence = E.make(S.encodedSchema(schema))

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)
  })

  it("never", () => {
    expect(() => E.make(S.never)).toThrow(
      new Error("cannot build an Equivalence for `never`")
    )
  })

  it("string", () => {
    const schema = string
    const equivalence = E.make(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyType(schema)
  })

  it("Refinement", () => {
    const schema = S.NonEmpty
    const equivalence = E.make(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyType(schema)
  })

  describe("declaration", () => {
    it("should return Equal.equals when an annotation doesn't exist", () => {
      const schema = S.declare(isUnknown)
      const equivalence = E.make(schema)
      expect(equivalence).toStrictEqual(Equal.equals)

      const make = (id: number, s: string) => {
        return {
          [Hash.symbol]() {
            return 0
          },
          [Equal.symbol](that: any) {
            return that.id === id
          },
          id,
          s
        }
      }

      expect(equivalence(make(1, "a"), make(1, "a"))).toBe(true)
      expect(equivalence(make(1, "a"), make(1, "b"))).toBe(true)
      expect(equivalence(make(1, "a"), make(2, "a"))).toBe(false)
    })

    it("Chunk", () => {
      const schema = S.chunkFromSelf(number)
      const equivalence = E.make(schema)

      expect(equivalence(Chunk.empty(), Chunk.empty())).toBe(true)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3))).toBe(true)

      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2))).toBe(false)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4))).toBe(false)

      // propertyType(schema)
    })

    it("Date", () => {
      const schema = S.DateFromSelf
      const equivalence = E.make(schema)
      const now = new Date()

      expect(equivalence(now, now)).toBe(true)
      expect(equivalence(new Date(0), new Date(0))).toBe(true)

      expect(equivalence(new Date(0), new Date(1))).toBe(false)

      // propertyType(schema)
    })

    it("Data", () => {
      const schema = S.dataFromSelf(S.struct({ a: string, b: number }))
      const equivalence = E.make(schema)

      expect(equivalence(Data.struct({ a: "ok", b: 0 }), Data.struct({ a: "ok", b: 0 }))).toBe(true)

      // propertyType(schema)
    })

    it("Either", () => {
      const schema = S.eitherFromSelf({ left: string, right: number })
      const equivalence = E.make(schema)

      expect(equivalence(Either.right(1), Either.right(1))).toBe(true)
      expect(equivalence(Either.left("a"), Either.left("a"))).toBe(true)

      expect(equivalence(Either.right(1), Either.right(2))).toBe(false)
      expect(equivalence(Either.left("a"), Either.left("b"))).toBe(false)

      // propertyType(schema)
    })

    it("Option", () => {
      const schema = S.optionFromSelf(number)
      const equivalence = E.make(schema)

      expect(equivalence(Option.none(), Option.none())).toBe(true)
      expect(equivalence(Option.some(1), Option.some(1))).toBe(true)

      expect(equivalence(Option.some(1), Option.some(2))).toBe(false)

      // propertyType(schema)
    })

    it("ReadonlySet", () => {
      const schema = S.readonlySetFromSelf(number)
      const equivalence = E.make(schema)

      expect(equivalence(new Set(), new Set())).toBe(true)
      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true)

      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false)

      // propertyType(schema)
    })

    it("ReadonlyMap", () => {
      const schema = S.readonlyMapFromSelf({ key: string, value: number })
      const equivalence = E.make(schema)

      expect(equivalence(new Map(), new Map())).toBe(true)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 2]]))).toBe(true)

      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 3], ["b", 2]]))).toBe(false)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 4]]))).toBe(false)

      // propertyType(schema)
    })

    it("Uint8Array", () => {
      const schema = S.Uint8ArrayFromSelf
      const equivalence = E.make(schema)

      expect(equivalence(new Uint8Array(), new Uint8Array())).toBe(true)
      expect(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 40, 50]))
      ).toBe(true)

      expect(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 30, 50]))
      ).toBe(false)

      // propertyType(schema)
    })

    it("instanceOf", () => {
      const schema = S.instanceOf(URL, {
        equivalence: () => Equivalence.make((a, b) => a.href === b.href)
      })
      const equivalence = E.make(schema)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://example.com/page")))
        .toBe(true)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://google.come")))
        .toBe(false)
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.union(string, number)
      const equivalence = E.make(schema)

      expect(equivalence("a", "a")).toBe(true)
      expect(equivalence(1, 1)).toBe(true)

      expect(equivalence("a", "b")).toBe(false)
      expect(equivalence(1, 2)).toBe(false)

      // propertyType(schema)
    })

    it("should fallback on the less precise equivalence", () => {
      const a = S.struct({ a: string })
      const ab = S.struct({ a: string, b: S.number })
      const schema = S.union(a, ab)
      const equivalence = E.make(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 })).toBe(true)

      expect(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 })).toBe(false)

      // propertyType(schema)
    })

    it("discriminated", () => {
      const schema = S.union(
        S.struct({ tag: S.literal("a"), a: string }),
        S.struct({ tag: S.literal("b"), b: S.number })
      )
      const equivalence = E.make(schema)

      expect(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "a" })).toBe(true)
      expect(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 1 })).toBe(true)

      expect(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "b" })).toBe(false)
      expect(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 2 })).toBe(false)
      expect(equivalence({ tag: "a", a: "a" }, { tag: "b", b: 1 })).toBe(false)
    })
  })

  describe("tuple", () => {
    it("empty", () => {
      const schema = S.tuple()
      const equivalence = E.make(schema)

      expect(equivalence([], [])).toBe(true)
    })

    it("e", () => {
      const schema = S.tuple(string, number)
      const equivalence = E.make(schema)

      expect(equivalence(["a", 1], ["a", 1])).toBe(true)

      expect(equivalence(["a", 1], ["b", 1])).toBe(false)
      expect(equivalence(["a", 1], ["a", 2])).toBe(false)

      // propertyType(schema)
    })

    it("e + r", () => {
      const schema = S.tuple([S.string], S.number)
      const equivalence = E.make(schema)

      expect(equivalence(["a"], ["a"])).toBe(true)
      expect(equivalence(["a", 1], ["a", 1])).toBe(true)
      expect(equivalence(["a", 1, 2], ["a", 1, 2])).toBe(true)

      expect(equivalence(["a", 1], ["a", 2])).toBe(false)
      expect(equivalence(["a", 1, 2], ["a", 1, 3])).toBe(false)

      // propertyType(schema)
    })

    it("r", () => {
      const schema = S.array(number)
      const equivalence = E.make(schema)

      expect(equivalence([], [])).toBe(true)
      expect(equivalence([1], [1])).toBe(true)
      expect(equivalence([1, 2], [1, 2])).toBe(true)

      expect(equivalence([1, 2], [1, 2, 3])).toBe(false)
      expect(equivalence([1, 2, 3], [1, 2])).toBe(false)

      // propertyType(schema)
    })

    it("r + e", () => {
      const schema = S.array(string, number)
      const equivalence = E.make(schema)

      expect(equivalence([1], [1])).toBe(true)
      expect(equivalence(["a", 1], ["a", 1])).toBe(true)
      expect(equivalence(["a", "b", 1], ["a", "b", 1])).toBe(true)

      expect(equivalence([1], [2])).toBe(false)
      expect(equivalence([2], [1])).toBe(false)
      expect(equivalence(["a", "b", 1], ["a", "c", 1])).toBe(false)

      // propertyType(schema)
    })

    describe("optional element support", () => {
      it("e?", () => {
        const schema = S.tuple(S.optionalElement(string))
        const equivalence = E.make(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)

        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)

        // propertyType(schema)
      })

      it("e? + e?", () => {
        const schema = S.tuple(S.optionalElement(string), S.optionalElement(number))
        const equivalence = E.make(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence(["a", 1], ["a", 2])).toBe(false)
        expect(equivalence(["a", 1], ["a"])).toBe(false)
        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)

        // propertyType(schema)
      })

      it("e + e?", () => {
        const schema = S.tuple(string, S.optionalElement(number))
        const equivalence = E.make(schema)

        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence(["a", 1], ["a", 2])).toBe(false)
        expect(equivalence(["a"], ["a", 1])).toBe(false)
        expect(equivalence(["a", 1], ["a"])).toBe(false)

        // propertyType(schema)
      })

      it("e? + r", () => {
        const schema = S.tuple([S.optionalElement(S.string)], S.number)
        const equivalence = E.make(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)
        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence(["a", 1], ["a", 2])).toBe(false)

        // propertyType(schema)
      })
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.struct({})
      const equivalence = E.make(schema)

      expect(equivalence({}, {})).toBe(false)
    })

    it("string keys", () => {
      const schema = S.struct({ a: string, b: number })
      const equivalence = E.make(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      // should ignore excess properties
      const d = Symbol.for("@effect/schema/test/d")
      const excess = {
        a: "a",
        b: 1,
        c: true,
        [d]: "d"
      }
      expect(equivalence({ a: "a", b: 1 }, excess)).toBe(true)

      expect(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 })).toBe(false)
      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 })).toBe(false)

      // propertyType(schema)
    })

    it("symbol keys", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.struct({ [a]: string, [b]: number })
      const equivalence = E.make(schema)

      expect(equivalence({ [a]: "a", [b]: 1 }, { [a]: "a", [b]: 1 })).toBe(true)
      // should ignore excess properties
      const d = Symbol.for("@effect/schema/test/d")
      const excess = {
        [a]: "a",
        [b]: 1,
        c: true,
        [d]: "d"
      }
      expect(equivalence({ [a]: "a", [b]: 1 }, excess)).toBe(true)

      expect(equivalence({ [a]: "a", [b]: 1 }, { [a]: "c", [b]: 1 })).toBe(false)
      expect(equivalence({ [a]: "a", [b]: 1 }, { [a]: "a", [b]: 2 })).toBe(false)

      // propertyType(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({
        a: S.optional(string, { exact: true }),
        b: S.optional(S.union(number, S.undefined), { exact: true })
      })
      const equivalence = E.make(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      expect(equivalence({ b: 1 }, { b: 1 })).toBe(true)
      expect(equivalence({ a: "a" }, { a: "a" })).toBe(true)
      expect(equivalence({ a: "a", b: undefined }, { a: "a", b: undefined })).toBe(true)

      expect(equivalence({ a: "a" }, { b: 1 })).toBe(false)
      expect(equivalence({ a: "a", b: 1 }, { a: "a" })).toBe(false)
      expect(equivalence({ a: "a", b: undefined }, { a: "a" })).toBe(false)
      expect(equivalence({ a: "a" }, { a: "a", b: 1 })).toBe(false)
      expect(equivalence({ a: "a" }, { a: "a", b: undefined })).toBe(false)
      expect(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 })).toBe(false)
      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 })).toBe(false)

      // propertyType(schema)
    })
  })

  describe("record", () => {
    it("record(never, number)", () => {
      const schema = S.record(S.never, number)
      const equivalence = E.make(schema)

      const input = {}
      expect(equivalence(input, input)).toBe(true)
      expect(equivalence({}, {})).toBe(false)
    })

    it("record(string, number)", () => {
      const schema = S.record(string, number)
      const equivalence = E.make(schema)

      expect(equivalence({}, {})).toBe(true)
      expect(equivalence({ a: 1 }, { a: 1 })).toBe(true)
      expect(equivalence({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      // should ignore symbol excess properties
      const d = Symbol.for("@effect/schema/test/d")
      expect(equivalence({ a: 1, b: 2 }, { a: 1, b: 2, [d]: "d" })).toBe(true)

      expect(equivalence({ a: 1 }, { a: 2 })).toBe(false)
      expect(equivalence({ a: 1, b: 2 }, { a: 1 })).toBe(false)
      expect(equivalence({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(equivalence({ a: 1 }, { b: 1 })).toBe(false)

      // propertyType(schema)
    })

    it("record(symbol, number)", () => {
      const schema = S.record(symbol, number)
      const equivalence = E.make(schema)

      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      expect(equivalence({}, {})).toBe(true)
      expect(equivalence({ [a]: 1 }, { [a]: 1 })).toBe(true)
      expect(equivalence({ [a]: 1, [b]: 2 }, { [a]: 1, [b]: 2 })).toBe(true)
      // should ignore string excess properties
      const excess = { [a]: 1, [b]: 2, c: "c" }
      expect(equivalence({ [a]: 1, [b]: 2 }, excess)).toBe(true)

      expect(equivalence({ [a]: 1 }, { [a]: 2 })).toBe(false)
      expect(equivalence({ [a]: 1, [b]: 2 }, { [a]: 1 })).toBe(false)
      expect(equivalence({ [a]: 1 }, { [a]: 1, [b]: 2 })).toBe(false)
      expect(equivalence({ [a]: 1 }, { [b]: 1 })).toBe(false)

      // propertyType(schema)
    })

    it("struct + record", () => {
      const schema = S.struct({ a: string, b: string }, S.record(string, string))
      const equivalence = E.make(schema)

      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" })).toBe(true)
      expect(equivalence({ a: "a", b: "b", c: "c" }, { a: "a", b: "b", c: "c" })).toBe(true)

      expect(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" })).toBe(false)
      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" })).toBe(false)
      expect(equivalence({ a: "a", b: "b", c: "c1" }, { a: "a", b: "b", c: "c2" })).toBe(false)

      // propertyType(schema)
    })

    it("custom equivalence", () => {
      const schema = S.struct({ a: string, b: string }).annotations({
        equivalence: () => Equivalence.make((x, y) => x.a === y.a)
      })
      const equivalence = E.make(schema)

      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" })).toBe(true)
      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" })).toBe(true)

      expect(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" })).toBe(false)

      // propertyType(schema)
    })
  })

  describe("Suspend", () => {
    it("should support suspended schemas", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: string,
        as: S.array(S.suspend(() => schema))
      })

      const equivalence = E.make(schema)

      const a1: A = { a: "a1", as: [] }
      expect(equivalence(a1, a1)).toBe(true)
      const a2: A = { a: "a1", as: [{ a: "a2", as: [] }] }
      expect(equivalence(a2, a2)).toBe(true)
      const a3: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      expect(equivalence(a3, a3)).toBe(true)

      const a4: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      const a5: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a5", as: [] }] }] }
      expect(equivalence(a4, a5)).toBe(false)

      // propertyType(schema, { numRuns: 5 })
    })

    it("should support mutually suspended schemas", () => {
      interface Expression {
        readonly type: "expression"
        readonly value: number | Operation
      }

      interface Operation {
        readonly type: "operation"
        readonly operator: "+" | "-"
        readonly left: Expression
        readonly right: Expression
      }

      const Expression: S.Schema<Expression> = S.struct({
        type: S.literal("expression"),
        value: S.union(number, S.suspend(() => Operation))
      })

      const Operation: S.Schema<Operation> = S.struct({
        type: S.literal("operation"),
        operator: S.union(S.literal("+"), S.literal("-")),
        left: Expression,
        right: Expression
      })

      const equivalence = E.make(Operation)

      const a1: Operation = {
        type: "operation",
        operator: "+",
        left: {
          type: "expression",
          value: 1
        },
        right: {
          type: "expression",
          value: {
            type: "operation",
            operator: "-",
            left: {
              type: "expression",
              value: 3
            },
            right: {
              type: "expression",
              value: 2
            }
          }
        }
      }
      expect(equivalence(a1, a1)).toBe(true)

      const a2: Operation = {
        type: "operation",
        operator: "+",
        left: {
          type: "expression",
          value: 1
        },
        right: {
          type: "expression",
          value: {
            type: "operation",
            operator: "-",
            left: {
              type: "expression",
              value: 3
            },
            right: {
              type: "expression",
              value: 4
            }
          }
        }
      }
      expect(equivalence(a1, a2)).toBe(false)

      // propertyType(Operation, { numRuns: 5 })
    })
  })

  describe("should handle annotations", () => {
    const expectHook = <A, I>(source: S.Schema<A, I>) => {
      const schema = source.pipe(E.equivalence(() => () => true))
      const eq = E.make(schema)
      expect(eq("a" as any, "b" as any)).toEqual(true)
    }

    it("void", () => {
      expectHook(S.void)
    })

    it("never", () => {
      expectHook(S.never)
    })

    it("literal", () => {
      expectHook(S.literal("a"))
    })

    it("symbol", () => {
      expectHook(S.symbol)
    })

    it("uniqueSymbolFromSelf", () => {
      expectHook(S.uniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.templateLiteral(S.literal("a"), S.string, S.literal("b")))
    })

    it("undefined", () => {
      expectHook(S.undefined)
    })

    it("unknown", () => {
      expectHook(S.unknown)
    })

    it("any", () => {
      expectHook(S.any)
    })

    it("object", () => {
      expectHook(S.object)
    })

    it("string", () => {
      expectHook(S.string)
    })

    it("number", () => {
      expectHook(S.number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.bigintFromSelf)
    })

    it("boolean", () => {
      expectHook(S.boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.tuple(S.string, S.number))
    })

    it("struct", () => {
      expectHook(S.struct({ a: S.string, b: S.number }))
    })

    it("union", () => {
      expectHook(S.union(S.string, S.number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.struct({
        a: S.string,
        as: S.array(S.suspend(() => schema))
      })
      expectHook(schema)
    })

    it("refinement", () => {
      expectHook(S.Int)
    })

    it("transformation", () => {
      expectHook(S.NumberFromString)
    })
  })
})
