import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual, throws } from "@effect/vitest/utils"
import * as A from "effect/Arbitrary"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Equivalence from "effect/Equivalence"
import * as fc from "effect/FastCheck"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import { isUnknown } from "effect/Predicate"
import * as S from "effect/Schema"

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

describe("equivalence", () => {
  it("the errors should display a path", () => {
    throws(
      () => S.equivalence(S.Tuple(S.Never as any)),
      new Error(`Unsupported schema
at path: [0]
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
    throws(
      () => S.equivalence(S.Struct({ a: S.Never as any })),
      new Error(`Unsupported schema
at path: ["a"]
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
  })

  it("transformation", () => {
    const schema = S.NumberFromString
    const equivalence = S.equivalence(schema)

    assertTrue(equivalence(1, 1))

    assertFalse(equivalence(1, 2))
  })

  it("S.equivalence(S.encodedSchema(schema))", () => {
    const schema = S.NumberFromString
    const equivalence = S.equivalence(S.encodedSchema(schema))

    assertTrue(equivalence("a", "a"))

    assertFalse(equivalence("a", "b"))
  })

  it("never", () => {
    throws(
      () => S.equivalence(S.Never),
      new Error(`Unsupported schema
details: Cannot build an Equivalence
schema (NeverKeyword): never`)
    )
  })

  it("string", () => {
    const schema = MyString
    const equivalence = S.equivalence(schema)

    assertTrue(equivalence("a", "a"))

    assertFalse(equivalence("a", "b"))

    // propertyType(schema)
  })

  it("Refinement", () => {
    const schema = S.NonEmptyString
    const equivalence = S.equivalence(schema)

    assertTrue(equivalence("a", "a"))

    assertFalse(equivalence("a", "b"))

    // propertyType(schema)
  })

  describe("declaration", () => {
    it("should return Equal.equals when an annotation doesn't exist", () => {
      const schema = S.declare(isUnknown)
      const equivalence = S.equivalence(schema)
      strictEqual(equivalence, Equal.equals)

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

      assertTrue(equivalence(make(1, "a"), make(1, "a")))
      assertTrue(equivalence(make(1, "a"), make(1, "b")))
      assertFalse(equivalence(make(1, "a"), make(2, "a")))
    })

    it("Chunk", () => {
      const schema = S.ChunkFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(Chunk.empty(), Chunk.empty()))
      assertTrue(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3)))

      assertFalse(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2)))
      assertFalse(equivalence(Chunk.make(1, 2, 3), Chunk.make(1, 2, 4)))

      // propertyType(schema)
    })

    it("Date", () => {
      const schema = S.DateFromSelf
      const equivalence = S.equivalence(schema)
      const now = new Date()

      assertTrue(equivalence(now, now))
      assertTrue(equivalence(new Date(0), new Date(0)))

      assertFalse(equivalence(new Date(0), new Date(1)))

      // propertyType(schema)
    })

    it("Data", () => {
      const schema = S.DataFromSelf(S.Struct({ a: MyString, b: MyNumber }))
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(Data.struct({ a: "ok", b: 0 }), Data.struct({ a: "ok", b: 0 })))

      // propertyType(schema)
    })

    it("Either", () => {
      const schema = S.EitherFromSelf({ left: MyString, right: MyNumber })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(Either.right(1), Either.right(1)))
      assertTrue(equivalence(Either.left("a"), Either.left("a")))

      assertFalse(equivalence(Either.right(1), Either.right(2)))
      assertFalse(equivalence(Either.left("a"), Either.left("b")))

      // propertyType(schema)
    })

    it("Option", () => {
      const schema = S.OptionFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(Option.none(), Option.none()))
      assertTrue(equivalence(Option.some(1), Option.some(1)))

      assertFalse(equivalence(Option.some(1), Option.some(2)))

      // propertyType(schema)
    })

    it("ReadonlySet", () => {
      const schema = S.ReadonlySetFromSelf(MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(new Set(), new Set()))
      assertTrue(equivalence(new Set([1, 2, 3]), new Set([1, 2, 3])))

      assertFalse(equivalence(new Set([1, 2, 3]), new Set([1, 2])))

      // propertyType(schema)
    })

    it("ReadonlyMap", () => {
      const schema = S.ReadonlyMapFromSelf({ key: MyString, value: MyNumber })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(new Map(), new Map()))
      assertTrue(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 2]])))

      assertFalse(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 3], ["b", 2]])))
      assertFalse(equivalence(new Map([["a", 1], ["b", 2]]), new Map([["a", 1], ["b", 4]])))

      // propertyType(schema)
    })

    it("Uint8Array", () => {
      const schema = S.Uint8ArrayFromSelf
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(new Uint8Array(), new Uint8Array()))
      assertTrue(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 40, 50]))
      )

      assertFalse(
        equivalence(new Uint8Array([10, 20, 30, 40, 50]), new Uint8Array([10, 20, 30, 30, 50]))
      )

      // propertyType(schema)
    })

    it("instanceOf", () => {
      const schema = S.instanceOf(URL, {
        equivalence: () => Equivalence.make((a, b) => a.href === b.href)
      })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(new URL("https://example.com/page"), new URL("https://example.com/page")))

      assertFalse(equivalence(new URL("https://example.com/page"), new URL("https://google.come")))
    })
  })

  describe("union", () => {
    it("primitives", () => {
      const schema = S.Union(MyString, MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence("a", "a"))
      assertTrue(equivalence(1, 1))

      assertFalse(equivalence("a", "b"))
      assertFalse(equivalence(1, 2))

      // propertyType(schema)
    })

    it("should fallback on the less precise equivalence", () => {
      const a = S.Struct({ a: MyString })
      const ab = S.Struct({ a: MyString, b: S.Number })
      const schema = S.Union(a, ab)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 }))
      assertTrue(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 }))

      assertFalse(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 }))

      // propertyType(schema)
    })

    it("discriminated structs", () => {
      const schema = S.Union(
        S.Struct({ tag: S.Literal("a"), a: MyString }),
        S.Struct({ tag: S.Literal("b"), b: S.Number })
      )
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "a" }))
      assertTrue(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 1 }))

      assertFalse(equivalence({ tag: "a", a: "a" }, { tag: "a", a: "b" }))
      assertFalse(equivalence({ tag: "b", b: 1 }, { tag: "b", b: 2 }))
      assertFalse(equivalence({ tag: "a", a: "a" }, { tag: "b", b: 1 }))
    })

    it("discriminated tuples", () => {
      const schema = S.Union(
        S.Tuple(S.Literal("a"), S.String),
        S.Tuple(S.Literal("b"), S.Number)
      )
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(["a", "x"], ["a", "x"]))
      assertFalse(equivalence(["a", "x"], ["a", "y"]))

      assertTrue(equivalence(["b", 1], ["b", 1]))
      assertFalse(equivalence(["b", 1], ["b", 2]))

      assertFalse(equivalence(["a", "x"], ["b", 1]))
    })
  })

  describe("tuple", () => {
    it("empty", () => {
      const schema = S.Tuple()
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence([], []))
    })

    it("should fail on non-array inputs", () => {
      const schema = S.Tuple(S.String, S.Number)
      const equivalence = S.equivalence(schema)
      assertFalse(equivalence(["a", 1], null as never))
    })

    it("e", () => {
      const schema = S.Tuple(MyString, MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(["a", 1], ["a", 1]))

      assertFalse(equivalence(["a", 1], ["b", 1]))
      assertFalse(equivalence(["a", 1], ["a", 2]))

      // propertyType(schema)
    })

    it("e r", () => {
      const schema = S.Tuple([S.String], S.Number)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence(["a"], ["a"]))
      assertTrue(equivalence(["a", 1], ["a", 1]))
      assertTrue(equivalence(["a", 1, 2], ["a", 1, 2]))

      assertFalse(equivalence(["a", 1], ["a", 2]))
      assertFalse(equivalence(["a", 1, 2], ["a", 1, 3]))

      // propertyType(schema)
    })

    it("r", () => {
      const schema = S.Array(MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence([], []))
      assertTrue(equivalence([1], [1]))
      assertTrue(equivalence([1, 2], [1, 2]))

      assertFalse(equivalence([1, 2], [1, 2, 3]))
      assertFalse(equivalence([1, 2, 3], [1, 2]))

      // propertyType(schema)
    })

    it("r e", () => {
      const schema = S.Tuple([], MyString, MyNumber)
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence([1], [1]))
      assertTrue(equivalence(["a", 1], ["a", 1]))
      assertTrue(equivalence(["a", "b", 1], ["a", "b", 1]))

      assertFalse(equivalence([1], [2]))
      assertFalse(equivalence([2], [1]))
      assertFalse(equivalence(["a", "b", 1], ["a", "c", 1]))

      // propertyType(schema)
    })

    describe("optional element support", () => {
      it("e?", () => {
        const schema = S.Tuple(S.optionalElement(MyString))
        const equivalence = S.equivalence(schema)

        assertTrue(equivalence([], []))
        assertTrue(equivalence(["a"], ["a"]))

        assertFalse(equivalence(["a"], ["b"]))
        assertFalse(equivalence([], ["a"]))
        assertFalse(equivalence(["a"], []))

        // propertyType(schema)
      })

      it("e? e?", () => {
        const schema = S.Tuple(S.optionalElement(MyString), S.optionalElement(MyNumber))
        const equivalence = S.equivalence(schema)

        assertTrue(equivalence([], []))
        assertTrue(equivalence(["a"], ["a"]))
        assertTrue(equivalence(["a"], ["a"]))
        assertTrue(equivalence(["a", 1], ["a", 1]))

        assertFalse(equivalence(["a"], ["b"]))
        assertFalse(equivalence(["a", 1], ["a", 2]))
        assertFalse(equivalence(["a", 1], ["a"]))
        assertFalse(equivalence([], ["a"]))
        assertFalse(equivalence(["a"], []))

        // propertyType(schema)
      })

      it("e e?", () => {
        const schema = S.Tuple(MyString, S.optionalElement(MyNumber))
        const equivalence = S.equivalence(schema)

        assertTrue(equivalence(["a"], ["a"]))
        assertTrue(equivalence(["a", 1], ["a", 1]))

        assertFalse(equivalence(["a", 1], ["a", 2]))
        assertFalse(equivalence(["a"], ["a", 1]))
        assertFalse(equivalence(["a", 1], ["a"]))

        // propertyType(schema)
      })

      it("e? r", () => {
        const schema = S.Tuple([S.optionalElement(S.String)], S.Number)
        const equivalence = S.equivalence(schema)

        assertTrue(equivalence([], []))
        assertTrue(equivalence(["a"], ["a"]))
        assertTrue(equivalence(["a", 1], ["a", 1]))

        assertFalse(equivalence([], ["a"]))
        assertFalse(equivalence(["a"], []))
        assertFalse(equivalence(["a"], ["b"]))
        assertFalse(equivalence(["a", 1], ["a", 2]))

        // propertyType(schema)
      })
    })
  })

  describe("struct", () => {
    it("empty", () => {
      const schema = S.Struct({})
      const equivalence = S.equivalence(schema)

      assertFalse(equivalence({}, {}))
    })

    it("should fail on non-record inputs", () => {
      const schema = S.Struct({ a: S.String })
      const equivalence = S.equivalence(schema)
      assertFalse(equivalence({ a: "a" }, 1 as never))
    })

    it("string keys", () => {
      const schema = S.Struct({ a: MyString, b: MyNumber })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 }))
      // should ignore excess properties
      const d = Symbol.for("effect/Schema/test/d")
      const excess = {
        a: "a",
        b: 1,
        c: true,
        [d]: "d"
      }
      assertTrue(equivalence({ a: "a", b: 1 }, excess))

      assertFalse(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 }))
      assertFalse(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 }))

      // propertyType(schema)
    })

    it("symbol keys", () => {
      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Struct({ [a]: MyString, [b]: MyNumber })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ [a]: "a", [b]: 1 }, { [a]: "a", [b]: 1 }))
      // should ignore excess properties
      const d = Symbol.for("effect/Schema/test/d")
      const excess = {
        [a]: "a",
        [b]: 1,
        c: true,
        [d]: "d"
      }
      assertTrue(equivalence({ [a]: "a", [b]: 1 }, excess))

      assertFalse(equivalence({ [a]: "a", [b]: 1 }, { [a]: "c", [b]: 1 }))
      assertFalse(equivalence({ [a]: "a", [b]: 1 }, { [a]: "a", [b]: 2 }))

      // propertyType(schema)
    })

    it("exact optional property signature", () => {
      const schema = S.Struct({
        a: S.optionalWith(MyString, { exact: true }),
        b: S.optionalWith(S.Union(MyNumber, S.Undefined), { exact: true })
      })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ a: "a", b: 1 }, { a: "a", b: 1 }))
      assertTrue(equivalence({ b: 1 }, { b: 1 }))
      assertTrue(equivalence({ a: "a" }, { a: "a" }))
      assertTrue(equivalence({ a: "a", b: undefined }, { a: "a", b: undefined }))

      assertFalse(equivalence({ a: "a" }, { b: 1 }))
      assertFalse(equivalence({ a: "a", b: 1 }, { a: "a" }))
      assertFalse(equivalence({ a: "a", b: undefined }, { a: "a" }))
      assertFalse(equivalence({ a: "a" }, { a: "a", b: 1 }))
      assertFalse(equivalence({ a: "a" }, { a: "a", b: undefined }))
      assertFalse(equivalence({ a: "a", b: 1 }, { a: "c", b: 1 }))
      assertFalse(equivalence({ a: "a", b: 1 }, { a: "a", b: 2 }))

      // propertyType(schema)
    })
  })

  describe("record", () => {
    it("record(never, number)", () => {
      const schema = S.Record({ key: S.Never, value: MyNumber })
      const equivalence = S.equivalence(schema)

      const input = {}
      assertTrue(equivalence(input, input))
      assertFalse(equivalence({}, {}))
    })

    it("record(string, number)", () => {
      const schema = S.Record({ key: MyString, value: MyNumber })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({}, {}))
      assertTrue(equivalence({ a: 1 }, { a: 1 }))
      assertTrue(equivalence({ a: 1, b: 2 }, { a: 1, b: 2 }))
      // should ignore symbol excess properties
      const d = Symbol.for("effect/Schema/test/d")
      assertTrue(equivalence({ a: 1, b: 2 }, { a: 1, b: 2, [d]: "d" }))

      assertFalse(equivalence({ a: 1 }, { a: 2 }))
      assertFalse(equivalence({ a: 1, b: 2 }, { a: 1 }))
      assertFalse(equivalence({ a: 1 }, { a: 1, b: 2 }))
      assertFalse(equivalence({ a: 1 }, { b: 1 }))

      // propertyType(schema)
    })

    it("record(symbol, number)", () => {
      const schema = S.Record({ key: MySymbol, value: MyNumber })
      const equivalence = S.equivalence(schema)

      const a = Symbol.for("effect/Schema/test/a")
      const b = Symbol.for("effect/Schema/test/b")
      assertTrue(equivalence({}, {}))
      assertTrue(equivalence({ [a]: 1 }, { [a]: 1 }))
      assertTrue(equivalence({ [a]: 1, [b]: 2 }, { [a]: 1, [b]: 2 }))
      // should ignore string excess properties
      const excess = { [a]: 1, [b]: 2, c: "c" }
      assertTrue(equivalence({ [a]: 1, [b]: 2 }, excess))

      assertFalse(equivalence({ [a]: 1 }, { [a]: 2 }))
      assertFalse(equivalence({ [a]: 1, [b]: 2 }, { [a]: 1 }))
      assertFalse(equivalence({ [a]: 1 }, { [a]: 1, [b]: 2 }))
      assertFalse(equivalence({ [a]: 1 }, { [b]: 1 }))

      // propertyType(schema)
    })

    it("struct record", () => {
      const schema = S.Struct({ a: MyString, b: MyString }, S.Record({ key: MyString, value: MyString }))
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" }))
      assertTrue(equivalence({ a: "a", b: "b", c: "c" }, { a: "a", b: "b", c: "c" }))

      assertFalse(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" }))
      assertFalse(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" }))
      assertFalse(equivalence({ a: "a", b: "b", c: "c1" }, { a: "a", b: "b", c: "c2" }))

      // propertyType(schema)
    })

    it("custom equivalence", () => {
      const schema = S.Struct({ a: MyString, b: MyString }).annotations({
        equivalence: () => Equivalence.make((x, y) => x.a === y.a)
      })
      const equivalence = S.equivalence(schema)

      assertTrue(equivalence({ a: "a", b: "b" }, { a: "a", b: "b" }))
      assertTrue(equivalence({ a: "a", b: "b" }, { a: "a", b: "c" }))

      assertFalse(equivalence({ a: "a", b: "b" }, { a: "c", b: "b" }))

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
      assertTrue(equivalence(a1, a1))
      const a2: A = { a: "a1", as: [{ a: "a2", as: [] }] }
      assertTrue(equivalence(a2, a2))
      const a3: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      assertTrue(equivalence(a3, a3))

      const a4: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a4", as: [] }] }] }
      const a5: A = { a: "a1", as: [{ a: "a2", as: [] }, { a: "a3", as: [{ a: "a5", as: [] }] }] }
      assertFalse(equivalence(a4, a5))

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
      assertTrue(equivalence(a1, a1))

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
      assertFalse(equivalence(a1, a2))

      // propertyType(Operation, { numRuns: 5 })
    })
  })

  describe("should handle annotations", () => {
    const expectHook = <A, I>(source: S.Schema<A, I>) => {
      const schema = source.annotations({ equivalence: () => () => true })
      const eq = S.equivalence(schema)
      assertTrue(eq("a" as any, "b" as any))
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
