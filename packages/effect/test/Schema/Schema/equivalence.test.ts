import * as A from "effect/Arbitrary"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import { isUnknown } from "effect/Predicate"
import * as S from "effect/Schema"
import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

/**
 * Tests that the generated Eq is a valid Eq
 */
export const propertyType = <A, I>(
  schema: S.Schema<A, I>,
  params?: fc.Parameters<[A, ...Array<A>]>
) => {
  const arb = A.makeLazy(schema)(fc)
  // console.log(fc.sample(arb, 10))
  const equivalence = S.equivalence(schema)

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

const MyString = S.String.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "string" || typeof b !== "string") {
      throw new Error("invalid string provided to `string`")
    }
    return a === b
  }
})

const MyNumber = S.JsonNumber.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "number" || typeof b !== "number") {
      throw new Error("invalid number provided to `number`")
    }
    return a === b
  }
})

const MySymbol = S.SymbolFromSelf.annotations({
  equivalence: () => (a, b) => {
    if (typeof a !== "symbol" || typeof b !== "symbol") {
      throw new Error("invalid symbol provided to `symbol`")
    }
    return a === b
  }
})

describe("SchemaEquivalence", () => {
  it("the errors should disply a path", () => {
    expect(() => S.equivalence(S.Tuple(S.Never as any))).toThrow(
      new Error(`Unsupported schema
at path: [0]
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
    expect(() => S.equivalence(S.Struct({ a: S.Never as any }))).toThrow(
      new Error(`Unsupported schema
at path: ["a"]
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
  })

  it("transformation", () => {
    const schema = S.NumberFromString
    const equivalence = S.equivalence(schema)

    expect(equivalence(1, 1)).toBe(true)

    expect(equivalence(1, 2)).toBe(false)
  })

  it("S.equivalence(S.encodedSchema(schema))", () => {
    const schema = S.NumberFromString
    const equivalence = S.equivalence(S.encodedSchema(schema))

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)
  })

  it("never", () => {
    expect(() => S.equivalence(S.Never)).toThrow(
      new Error(`Unsupported schema
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
  })

  it("string", () => {
    const schema = MyString
    const equivalence = S.equivalence(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyType(schema)
  })

  it("Refinement", () => {
    const schema = S.NonEmptyString
    const equivalence = S.equivalence(schema)

    expect(equivalence("a", "a")).toBe(true)

    expect(equivalence("a", "b")).toBe(false)

    // propertyType(schema)
  })

  describe("declaration", () => {
    it("should return Equal.equals when an annotation doesn't exist", () => {
      const schema = S.declare(isUnknown)
      const equivalence = S.equivalence(schema)
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
      const schema = S.ChunkFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence(Chunk.empty(), Chunk.empty())).toBe(true)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3))).toBe(true)

      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2))).toBe(false)
      expect(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4))).toBe(false)

      // propertyType(schema)
    })

    it("Date", () => {
      const schema = S.DateFromSelf
      const equivalence = S.equivalence(schema)
      const now = new Date()

      expect(equivalence(now, now)).toBe(true)
      expect(equivalence(new Date(0), new Date(0))).toBe(true)

      expect(equivalence(new Date(0), new Date(1))).toBe(false)

      // propertyType(schema)
    })

    it("Data", () => {
      const schema = S.DataFromSelf(S.Struct({ a: MyString, b: MyNumber }))
      const equivalence = S.equivalence(schema)

      expect(equivalence(Data.struct({ a: "ok", b: 0 }), Data.struct({ a: "ok", b: 0 }))).toBe(true)

      // propertyType(schema)
    })

    it("Either", () => {
      const schema = S.EitherFromSelf({ left: MyString, right: MyNumber })
      const equivalence = S.equivalence(schema)

      expect(equivalence(Either.right(1), Either.right(1))).toBe(true)
      expect(equivalence(Either.left("a"), Either.left("a"))).toBe(true)

      expect(equivalence(Either.right(1), Either.right(2))).toBe(false)
      expect(equivalence(Either.left("a"), Either.left("b"))).toBe(false)

      // propertyType(schema)
    })

    it("Option", () => {
      const schema = S.OptionFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence(Option.none(), Option.none())).toBe(true)
      expect(equivalence(Option.some(1), Option.some(1))).toBe(true)

      expect(equivalence(Option.some(1), Option.some(2))).toBe(false)

      // propertyType(schema)
    })

    it("ReadonlySet", () => {
      const schema = S.ReadonlySetFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence(new Set(), new Set())).toBe(true)
      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true)

      expect(equivalence(new Set([1, 2, 3]), new Set([1, 2]))).toBe(false)

      // propertyType(schema)
    })

    it("ReadonlyMap", () => {
      const schema = S.ReadonlyMapFromSelf({ key: MyString, value: MyNumber })
      const equivalence = S.equivalence(schema)

      expect(equivalence(new Map(), new Map())).toBe(true)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 2]]))).toBe(true)

      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 3], ["b", 2]]))).toBe(false)
      expect(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 4]]))).toBe(false)

      // propertyType(schema)
    })

    it("Uint8Array", () => {
      const schema = S.Uint8ArrayFromSelf
      const equivalence = S.equivalence(schema)

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
      const equivalence = S.equivalence(schema)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://example.com/page")))
        .toBe(true)

      expect(equivalence(new URL("https://example.com/page"), new URL("https://google.come")))
        .toBe(false)
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.Union(MyString, MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence("a", "a")).toBe(true)
      expect(equivalence(1, 1)).toBe(true)

      expect(equivalence("a", "b")).toBe(false)
      expect(equivalence(1, 2)).toBe(false)

      // propertyType(schema)
    })

    it("should fallback on the less precise equivalence", () => {
      const a = S.Struct({ a: MyString })
      const ab = S.Struct({ a: MyString, b: S.Number })
      const schema = S.Union(a, ab)
      const equivalence = S.equivalence(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 })).toBe(true)

      expect(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 })).toBe(false)

      // propertyType(schema)
    })

    it("discriminated", () => {
      const schema = S.Union(
        S.Struct({ tag: S.Literal("a"), a: MyString }),
        S.Struct({ tag: S.Literal("b"), b: S.Number })
      )
      const equivalence = S.equivalence(schema)

      expect(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "a" })).toBe(true)
      expect(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 1 })).toBe(true)

      expect(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "b" })).toBe(false)
      expect(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 2 })).toBe(false)
      expect(equivalence({ tag: "a", a: "a" }, { tag: "b", b: 1 })).toBe(false)
    })

    it("discriminated tuples", () => {
      const schema = S.Union(
        S.Tuple(S.Literal("a"), S.String),
        S.Tuple(S.Literal("b"), S.Number)
      )
      const equivalence = E.make(schema)

      expect(equivalence(["a", "x"], ["a", "x"])).toBe(true)
      expect(equivalence(["a", "x"], ["a", "y"])).toBe(false)

      expect(equivalence(["b", 1], ["b", 1])).toBe(true)
      expect(equivalence(["b", 1], ["b", 2])).toBe(false)

      expect(equivalence(["a", "x"], ["b", 1])).toBe(false)
    })
  })

  describe("tuple", () => {
    it("empty", () => {
      const schema = S.Tuple()
      const equivalence = S.equivalence(schema)

      expect(equivalence([], [])).toBe(true)
    })

    it("e", () => {
      const schema = S.Tuple(MyString, MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence(["a", 1], ["a", 1])).toBe(true)

      expect(equivalence(["a", 1], ["b", 1])).toBe(false)
      expect(equivalence(["a", 1], ["a", 2])).toBe(false)

      // propertyType(schema)
    })

    it("e r", () => {
      const schema = S.Tuple([S.String], S.Number)
      const equivalence = S.equivalence(schema)

      expect(equivalence(["a"], ["a"])).toBe(true)
      expect(equivalence(["a", 1], ["a", 1])).toBe(true)
      expect(equivalence(["a", 1, 2], ["a", 1, 2])).toBe(true)

      expect(equivalence(["a", 1], ["a", 2])).toBe(false)
      expect(equivalence(["a", 1, 2], ["a", 1, 3])).toBe(false)

      // propertyType(schema)
    })

    it("r", () => {
      const schema = S.Array(MyNumber)
      const equivalence = S.equivalence(schema)

      expect(equivalence([], [])).toBe(true)
      expect(equivalence([1], [1])).toBe(true)
      expect(equivalence([1, 2], [1, 2])).toBe(true)

      expect(equivalence([1, 2], [1, 2, 3])).toBe(false)
      expect(equivalence([1, 2, 3], [1, 2])).toBe(false)

      // propertyType(schema)
    })

    it("r e", () => {
      const schema = S.Tuple([], MyString, MyNumber)
      const equivalence = S.equivalence(schema)

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
        const schema = S.Tuple(S.optionalElement(MyString))
        const equivalence = S.equivalence(schema)

        expect(equivalence([], [])).toBe(true)
        expect(equivalence(["a"], ["a"])).toBe(true)

        expect(equivalence(["a"], ["b"])).toBe(false)
        expect(equivalence([], ["a"])).toBe(false)
        expect(equivalence(["a"], [])).toBe(false)

        // propertyType(schema)
      })

      it("e? e?", () => {
        const schema = S.Tuple(S.optionalElement(MyString), S.optionalElement(MyNumber))
        const equivalence = S.equivalence(schema)

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

      it("e e?", () => {
        const schema = S.Tuple(MyString, S.optionalElement(MyNumber))
        const equivalence = S.equivalence(schema)

        expect(equivalence(["a"], ["a"])).toBe(true)
        expect(equivalence(["a", 1], ["a", 1])).toBe(true)

        expect(equivalence(["a", 1], ["a", 2])).toBe(false)
        expect(equivalence(["a"], ["a", 1])).toBe(false)
        expect(equivalence(["a", 1], ["a"])).toBe(false)

        // propertyType(schema)
      })

      it("e? r", () => {
        const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
        const equivalence = S.equivalence(schema)

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
      const schema = S.Struct({})
      const equivalence = S.equivalence(schema)

      expect(equivalence({}, {})).toBe(false)
    })

    it("string keys", () => {
      const schema = S.Struct({ a: MyString, b: MyNumber })
      const equivalence = S.equivalence(schema)

      expect(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 })).toBe(true)
      // should ignore excess properties
      const d = Symbol.for("effect/Schema/test/d")
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
      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Struct({ [a]: MyString, [b]: MyNumber })
      const equivalence = S.equivalence(schema)

      expect(equivalence({ [a]: "a", [b]: 1 }, { [a]: "a", [b]: 1 })).toBe(true)
      // should ignore excess properties
      const d = Symbol.for("effect/Schema/test/d")
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

    it("exact optional property signature", () => {
      const schema = S.Struct({
        a: S.optionalWith(MyString, { exact: true }),
        b: S.optionalWith(S.Union(MyNumber, S.Undefined), { exact: true })
      })
      const equivalence = S.equivalence(schema)

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
      const schema = S.Record({ key: S.Never, value: MyNumber })
      const equivalence = S.equivalence(schema)

      const input = {}
      expect(equivalence(input, input)).toBe(true)
      expect(equivalence({}, {})).toBe(false)
    })

    it("record(string, number)", () => {
      const schema = S.Record({ key: MyString, value: MyNumber })
      const equivalence = S.equivalence(schema)

      expect(equivalence({}, {})).toBe(true)
      expect(equivalence({ a: 1 }, { a: 1 })).toBe(true)
      expect(equivalence({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      // should ignore symbol excess properties
      const d = Symbol.for("effect/Schema/test/d")
      expect(equivalence({ a: 1, b: 2 }, { a: 1, b: 2, [d]: "d" })).toBe(true)

      expect(equivalence({ a: 1 }, { a: 2 })).toBe(false)
      expect(equivalence({ a: 1, b: 2 }, { a: 1 })).toBe(false)
      expect(equivalence({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(equivalence({ a: 1 }, { b: 1 })).toBe(false)

      // propertyType(schema)
    })

    it("record(symbol, number)", () => {
      const schema = S.Record({ key: MySymbol, value: MyNumber })
      const equivalence = S.equivalence(schema)

      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
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

    it("struct record", () => {
      const schema = S.Struct({ a: MyString, b: MyString }, S.Record({ key: MyString, value: MyString }))
      const equivalence = S.equivalence(schema)

      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" })).toBe(true)
      expect(equivalence({ a: "a", b: "b", c: "c" }, { a: "a", b: "b", c: "c" })).toBe(true)

      expect(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" })).toBe(false)
      expect(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" })).toBe(false)
      expect(equivalence({ a: "a", b: "b", c: "c1" }, { a: "a", b: "b", c: "c2" })).toBe(false)

      // propertyType(schema)
    })

    it("custom equivalence", () => {
      const schema = S.Struct({ a: MyString, b: MyString }).annotations({
        equivalence: () => Equivalence.make((x, y) => x.a === y.a)
      })
      const equivalence = S.equivalence(schema)

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
      const schema = S.Struct({
        a: MyString,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
      })

      const equivalence = S.equivalence(schema)

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

      const Expression = S.Struct({
        type: S.Literal("expression"),
        value: S.Union(MyNumber, S.suspend((): S.Schema<Operation> => Operation))
      })

      const Operation = S.Struct({
        type: S.Literal("operation"),
        operator: S.Union(S.Literal("+"), S.Literal("-")),
        left: Expression,
        right: Expression
      })

      const equivalence = S.equivalence(Operation)

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
      const schema = source.annotations({ equivalence: () => () => true })
      const eq = S.equivalence(schema)
      expect(eq("a" as any, "b" as any)).toEqual(true)
    }

    it("void", () => {
      expectHook(S.Void)
    })

    it("never", () => {
      expectHook(S.Never)
    })

    it("literal", () => {
      expectHook(S.Literal("a"))
    })

    it("symbol", () => {
      expectHook(S.Symbol)
    })

    it("uniqueSymbolFromSelf", () => {
      expectHook(S.UniqueSymbolFromSelf(Symbol.for("effect/schema/test/a")))
    })

    it("templateLiteral", () => {
      expectHook(S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")))
    })

    it("undefined", () => {
      expectHook(S.Undefined)
    })

    it("unknown", () => {
      expectHook(S.Unknown)
    })

    it("any", () => {
      expectHook(S.Any)
    })

    it("object", () => {
      expectHook(S.Object)
    })

    it("string", () => {
      expectHook(S.String)
    })

    it("number", () => {
      expectHook(S.Number)
    })

    it("bigintFromSelf", () => {
      expectHook(S.BigIntFromSelf)
    })

    it("boolean", () => {
      expectHook(S.Boolean)
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      expectHook(S.Enums(Fruits))
    })

    it("tuple", () => {
      expectHook(S.Tuple(S.String, S.Number))
    })

    it("struct", () => {
      expectHook(S.Struct({ a: S.String, b: S.Number }))
    })

    it("union", () => {
      expectHook(S.Union(S.String, S.Number))
    })

    it("suspend", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema = S.Struct({
        a: S.String,
        as: S.Array(S.suspend((): S.Schema<A> => schema))
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
