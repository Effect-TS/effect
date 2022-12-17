import { pipe } from "@fp-ts/data/Function"
import * as A from "@fp-ts/schema/Arbitrary"
import * as readonlySet from "@fp-ts/schema/data/ReadonlySet"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: S.Schema<A>) => {
  const arbitrary = A.arbitraryFor(schema)
  const guard = G.guardFor(schema)
  fc.assert(fc.property(arbitrary.arbitrary(fc), (a) => guard.is(a)))
}

describe.concurrent("Arbitrary", () => {
  it("exports", () => {
    expect(A.ArbitraryId).exist
    expect(A.make).exist
  })

  it("type alias", () => {
    const schema = readonlySet.schema(S.string)
    property(schema)
  })

  it("lazy", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.lazy<A>(() => S.tuple(S.number, S.union(schema, S.literal(null))))
    property(schema)
  })

  describe.concurrent("literal", () => {
    it("1 member", () => {
      const schema = S.literal(1)
      property(schema)
    })

    it("2 members", () => {
      const schema = S.literal(1, "a")
      property(schema)
    })
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@fp-ts/schema/test/a")
    const schema = S.uniqueSymbol(a)
    property(schema)
  })

  it("tuple", () => {
    const schema = S.tuple(S.string, S.number)
    property(schema)
  })

  describe.concurrent("tuple", () => {
    it("required element", () => {
      const schema = S.tuple(S.number)
      property(schema)
    })

    it("required element with undefined", () => {
      const schema = S.tuple(S.union(S.number, S.undefined))
      property(schema)
    })

    it("optional element", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.number))
      property(schema)
    })

    it("optional element with undefined", () => {
      const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
      property(schema)
    })

    it("baseline", () => {
      const schema = S.tuple(S.string, S.number)
      property(schema)
    })

    it("empty tuple", () => {
      const schema = S.tuple()
      property(schema)
    })

    it("optional elements", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      property(schema)
    })

    it("array", () => {
      const schema = S.array(S.string)
      property(schema)
    })

    it("post rest element", () => {
      const schema = pipe(S.array(S.number), S.element(S.boolean))
      property(schema)
    })

    it("post rest elements", () => {
      const schema = pipe(
        S.array(S.number),
        S.element(S.boolean),
        S.element(S.union(S.string, S.undefined))
      )
      property(schema)
    })

    it("post rest elements when rest is unknown", () => {
      const schema = pipe(S.array(S.unknown), S.element(S.boolean))
      property(schema)
    })

    it("all", () => {
      const schema = pipe(
        S.tuple(S.string),
        S.rest(S.number),
        S.element(S.boolean)
      )
      property(schema)
    })

    it("nonEmptyArray", () => {
      const schema = S.nonEmptyArray(S.number)
      property(schema)
    })

    it("ReadonlyArray<unknown>", () => {
      const schema = S.array(S.unknown)
      property(schema)
    })

    it("ReadonlyArray<any>", () => {
      const schema = S.array(S.any)
      property(schema)
    })
  })

  describe.concurrent("struct", () => {
    it("required field", () => {
      const schema = S.struct({ a: S.number })
      property(schema)
    })

    it("required field with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      property(schema)
    })

    it("optional field", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      property(schema)
    })

    it("optional field with undefined", () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined)) })
      property(schema)
    })

    it("baseline", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      property(schema)
    })
  })

  it("union", () => {
    const schema = S.union(S.string, S.number)
    property(schema)
  })

  it("stringIndexSignature", () => {
    const schema = S.stringIndexSignature(S.string)
    property(schema)
  })

  it("symbolIndexSignature", () => {
    const schema = S.symbolIndexSignature(S.string)
    property(schema)
  })

  describe.concurrent("partial", () => {
    it("struct", () => {
      const schema = pipe(S.struct({ a: S.number }), S.partial)
      property(schema)
    })

    it("tuple", () => {
      const schema = S.partial(S.tuple(S.string, S.number))
      property(schema)
    })

    it("array", () => {
      const schema = pipe(S.array(S.number), S.partial)
      property(schema)
    })

    it("union", () => {
      const schema = pipe(S.union(S.string, S.array(S.number)), S.partial)
      property(schema)
    })
  })

  describe.concurrent("nullables", () => {
    it("nullable (1)", () => {
      /* Schema<{ readonly a: number | null; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null)) })
      property(schema)
    })

    it("nullable (2)", () => {
      /* Schema<{ readonly a: number | null | undefined; }> */
      const schema = S.struct({ a: S.union(S.number, S.literal(null), S.undefined) })
      property(schema)
    })

    it("nullable (3)", () => {
      /*Schema<{ readonly a?: number | null | undefined; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null))) })
      property(schema)
    })

    it("nullable (4)", () => {
      /* Schema<{ readonly a?: number | null | undefined; }> */
      const schema = S.struct({ a: S.optional(S.union(S.number, S.literal(null), S.undefined)) })
      property(schema)
    })
  })

  it("minLength", () => {
    const schema = pipe(S.string, S.minLength(1))
    property(schema)
  })

  it("maxLength", () => {
    const schema = pipe(S.string, S.maxLength(2))
    property(schema)
  })

  it("lessThanOrEqualTo", () => {
    const schema = pipe(S.number, S.lessThanOrEqualTo(1))
    property(schema)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = pipe(S.number, S.greaterThanOrEqualTo(1))
    property(schema)
  })

  it("lessThan", () => {
    const schema = pipe(S.number, S.lessThan(1))
    property(schema)
  })

  it("greaterThan", () => {
    const schema = pipe(S.number, S.greaterThan(1))
    property(schema)
  })
})
