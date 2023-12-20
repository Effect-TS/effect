import * as A from "@effect/schema/Arbitrary"
import * as E from "@effect/schema/Equivalence"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Equivalence from "effect/Equivalence"
import * as Option from "effect/Option"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * Tests that the generated Eq is a valid Eq
 */
export const propertyTo = <I, A>(
  schema: S.Schema<I, A>,
  params?: fc.Parameters<[A, ...Array<A>]>
) => {
  const arb = A.to(schema)(fc)
  // console.log(fc.sample(arb, 10))
  const equivalence = E.to(schema)

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

const string = S.string.pipe(S.equivalence((a, b) => {
  if (typeof a !== "string" || typeof b !== "string") {
    throw new Error("invalid string provided to `string`")
  }
  return a === b
}))

const number = S.JsonNumber.pipe(S.equivalence((a, b) => {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new Error("invalid number provided to `number`")
  }
  return a === b
}))

const symbol = S.symbolFromSelf.pipe(
  S.equivalence((a, b) => {
    if (typeof a !== "symbol" || typeof b !== "symbol") {
      throw new Error("invalid symbol provided to `symbol`")
    }
    return a === b
  })
)

describe("Equivalence", () => {
  it("from", () => {
    const schema = S.NumberFromString
    const equivalence = E.from(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)
  })

  it("never", () => {
    expect(() => E.to(S.never)).toThrow(
      new Error("cannot build an Equivalence for `never`")
    )
  })

  it("string", () => {
    const schema = string
    const equivalence = E.to(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyTo(schema)
  })

  it("Refinement", () => {
    const schema = S.NonEmpty
    const equivalence = E.to(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyTo(schema)
  })

  describe("declaration", () => {
    it("should return Equivalence.strict() when an annotation exists", () => {
      const schema = S.declare([], S.struct({}), () => (input) => ParseResult.succeed(input), {
        [A.ArbitraryHookId]: (): A.Arbitrary<string> => (fc) => fc.string()
      })
      const equivalence = E.to(schema)
      expect(equivalence).toStrictEqual(Equivalence.strict())

      // propertyTo(schema)
    })

    it("Chunk", () => {
      const schema = S.chunkFromSelf(number)
      const equivalence = E.to(schema)

      expect(equivalence(Chunk.empty(), Chunk.empty())).toBe(true)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3))).toBe(true)

      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2))).toBe(false)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4))).toBe(false)

      // propertyTo(schema)
    })

    it("Date", () => {
      const schema = S.DateFromSelf
      const equivalence = E.to(schema)
      const now = new Date()

      expect(equivalence(now, now)).toBe(true)
      expect(equivalence(new Date(0), new Date(0))).toBe(true)

      expect(equivalence(new Date(0), new Date(1))).toBe(false)

      // propertyTo(schema)
    })

    it("Data", () => {
      const schema = S.dataFromSelf(S.struct({ a: string, b: number }))
      const equivalence = E.to(schema)

      expect(equivalence(Data.struct({ a: "ok", b: 0 }), Data.struct({ a: "ok", b: 0 }))).toBe(true)

      // propertyTo(schema)
    })

    it("Either", () => {
      const schema = S.eitherFromSelf(string, number)
      const equivalence = E.to(schema)

      expect(equivalence(Either.right(1), Either.right(1))).toBe(true)
      expect(equivalence(Either.left("a"), Either.left("a"))).toBe(true)

      expect(equivalence(Either.right(1), Either.right(2))).toBe(false)
      expect(equivalence(Either.left("a"), Either.left("b"))).toBe(false)

      // propertyTo(schema)
    })

    it("Option", () => {
      const schema = S.optionFromSelf(number)
      const equivalence = E.to(schema)

      expect(equivalence(Option.none(), Option.none())).toBe(true)
      expect(equivalence(Option.some(1), Option.some(1))).toBe(true)

      expect(equivalence(Option.some(1), Option.some(2))).toBe(false)

      // propertyTo(schema)
    })

    it("ReadonlySet", () => {
      const schema = S.readonlySetFromSelf(number)
      const equivalence = E.to(schema)

      expect(equivalence(new Set(), new Set())).toBe(true)
      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true)

      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false)

      // propertyTo(schema)
    })

    it("ReadonlyMap", () => {
      const schema = S.readonlyMapFromSelf(string, number)
      const equivalence = E.to(schema)

      expect(equivalence(new Map(), new Map())).toBe(true)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 2]]))).toBe(true)

      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 3], ["b", 2]]))).toBe(false)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 4]]))).toBe(false)

      // propertyTo(schema)
    })

    it("Uint8Array", () => {
      const schema = S.Uint8ArrayFromSelf
      const equivalence = E.to(schema)

      expect(equivalence(new Uint8Array(), new Uint8Array())).toBe(true)
      expect(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 40, 50]))
      ).toBe(true)

      expect(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 30, 50]))
      ).toBe(false)

      // propertyTo(schema)
    })

    it("instanceOf", () => {
      const schema = S.instanceOf(URL, {
        equivalence: () => Equivalence.make((a, b) => a.href === b.href)
      })
      const equivalence = E.to(schema)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://example.com/page")))
        .toBe(true)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://google.come")))
        .toBe(false)
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.union(string, number)
      const equivalence = E.to(schema)

      expect(equivalence("a", "a")).toBe(true)
      expect(equivalence(1, 1)).toBe(true)

      expect(equivalence("a", "b")).toBe(false)
      expect(equivalence(1, 2)).toBe(false)

      // propertyTo(schema)
    })

    it("should fallback on the less precise equivalence", () => {
      const a = S.struct({ a: string })
      const ab = S.struct({ a: string, b: S.number })
      const schema = S.union(a, ab)
      const equivalence = E.to(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 })).toBe(true)

      expect(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 })).toBe(false)

      // propertyTo(schema)
    })

    it("discriminated", () => {
      const schema = S.union(
        S.struct({ tag: S.literal("a"), a: string }),
        S.struct({ tag: S.literal("b"), b: S.number })
      )
      const equivalence = E.to(schema)

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
      const equivalence = E.to(schema)

      expect(equivalence([], [])).toBe(true)
    })

    it("e", () => {
      const schema = S.tuple(string, number)
      const equivalence = E.to(schema)

      expect(equivalence(["a", 1], ["a", 1])).toBe(true)

      expect(equivalence(["a", 1], ["b", 1])).toBe(false)
      expect(equivalence(["a", 1], ["a", 2])).toBe(false)

      // propertyTo(schema)
    })

    it("e + r", () => {
      const schema = S.tuple(string).pipe(S.rest(number))
      const equivalence = E.to(schema)

      expect(equivalence(["a"], ["a"])).toBe(true)
      expect(equivalence(["a", 1], ["a", 1])).toBe(true)
      expect(equivalence(["a", 1, 2], ["a", 1, 2])).toBe(true)

      expect(equivalence(["a", 1], ["a", 2])).toBe(false)
      expect(equivalence(["a", 1, 2], ["a", 1, 3])).toBe(false)

      // propertyTo(schema)
    })

    it("r", () => {
      const schema = S.array(number)
      const equivalence = E.to(schema)

      expect(equivalence([], [])).toBe(true)
      expect(equivalence([1], [1])).toBe(true)
      expect(equivalence([1, 2], [1, 2])).toBe(true)

      expect(equivalence([1, 2], [1, 2, 3])).toBe(false)
      expect(equivalence([1, 2, 3], [1, 2])).toBe(false)

      // propertyTo(schema)
    })

    it("r + e", () => {
      const schema = S.array(string).pipe(S.element(number))
      const equivalence = E.to(schema)

      expect(equivalence([1], [1])).toBe(true)
      expect(equivalence(["a", 1], ["a", 1])).toBe(true)
      expect(equivalence(["a", "b", 1], ["a", "b", 1])).toBe(true)

      expect(equivalence([1], [2])).toBe(false)
      expect(equivalence([2], [1])).toBe(false)
      expect(equivalence(["a", "b", 1], ["a", "c", 1])).toBe(false)

      // propertyTo(schema)
    })

    describe("optional element support", () => {
      it("e?", () => {
        const schema = S.tuple().pipe(S.optionalElement(string))
        const equivalence = E.to(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)

        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)

        // propertyTo(schema)
      })

      it("e? + e?", () => {
        const schema = S.tuple().pipe(S.optionalElement(string), S.optionalElement(number))
        const equivalence = E.to(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence(["a", 1], ["a", 2])).toBe(false)
        expect(equivalence(["a", 1], ["a"])).toBe(false)
        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)

        // propertyTo(schema)
      })

      it("e + e?", () => {
        const schema = S.tuple(string).pipe(S.optionalElement(number))
        const equivalence = E.to(schema)

        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence(["a", 1], ["a", 2])).toBe(false)
        expect(equivalence(["a"], ["a", 1])).toBe(false)
        expect(equivalence(["a", 1], ["a"])).toBe(false)

        // propertyTo(schema)
      })

      it("e? + r", () => {
        const schema = S.tuple().pipe(S.optionalElement(string), S.rest(number))
        const equivalence = E.to(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)
        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence(["a", 1], ["a", 2])).toBe(false)

        // propertyTo(schema)
      })
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.struct({})
      const equivalence = E.to(schema)

      expect(equivalence({}, {})).toBe(false)
    })

    it("string keys", () => {
      const schema = S.struct({ a: string, b: number })
      const equivalence = E.to(schema)

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

      // propertyTo(schema)
    })

    it("symbol keys", () => {
      const a = Symbol.for("@effect/schema/test/a")
      const b = Symbol.for("@effect/schema/test/b")
      const schema = S.struct({ [a]: string, [b]: number })
      const equivalence = E.to(schema)

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

      // propertyTo(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({
        a: S.optional(string, { exact: true }),
        b: S.optional(S.union(number, S.undefined), { exact: true })
      })
      const equivalence = E.to(schema)

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

      // propertyTo(schema)
    })
  })

  describe("record", () => {
    it("record(never, number)", () => {
      const schema = S.record(S.never, number)
      const equivalence = E.to(schema)

      const input = {}
      expect(equivalence(input, input)).toBe(true)
      expect(equivalence({}, {})).toBe(false)
    })

    it("record(string, number)", () => {
      const schema = S.record(string, number)
      const equivalence = E.to(schema)

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

      // propertyTo(schema)
    })

    it("record(symbol, number)", () => {
      const schema = S.record(symbol, number)
      const equivalence = E.to(schema)

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

      // propertyTo(schema)
    })

    it("struct + record", () => {
      const schema = S.struct({ a: string, b: string }).pipe(
        S.extend(S.record(string, string))
      )
      const equivalence = E.to(schema)

      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" })).toBe(true)
      expect(equivalence({ a: "a", b: "b", c: "c" }, { a: "a", b: "b", c: "c" })).toBe(true)

      expect(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" })).toBe(false)
      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" })).toBe(false)
      expect(equivalence({ a: "a", b: "b", c: "c1" }, { a: "a", b: "b", c: "c2" })).toBe(false)

      // propertyTo(schema)
    })

    it("custom equivalence", () => {
      const schema = S.struct({ a: string, b: string }).pipe(
        S.equivalence(Equivalence.make((x, y) => x.a === y.a))
      )
      const equivalence = E.to(schema)

      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" })).toBe(true)
      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" })).toBe(true)

      expect(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" })).toBe(false)

      // propertyTo(schema)
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

      const equivalence = E.to(schema)

      const a1: A = { a: "a1", as: [] }
      expect(equivalence(a1, a1)).toBe(true)
      const a2: A = { a: "a1", as: [{ a: "a2", as: [] }] }
      expect(equivalence(a2, a2)).toBe(true)
      const a3: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      expect(equivalence(a3, a3)).toBe(true)

      const a4: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      const a5: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a5", as: [] }] }] }
      expect(equivalence(a4, a5)).toBe(false)

      // propertyTo(schema, { numRuns: 5 })
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

      const equivalence = E.to(Operation)

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

      // propertyTo(Operation, { numRuns: 5 })
    })
  })
})
