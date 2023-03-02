import { pipe } from "@effect/data/Function"
import * as A from "@effect/schema/Arbitrary"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as fc from "fast-check"

export const property = <A>(schema: S.Schema<A>) => {
  const arbitrary = A.arbitrary(schema)
  const is = P.is(schema)
  fc.assert(fc.property(arbitrary(fc), (a) => is(a)))
}

describe.concurrent("Arbitrary", () => {
  it("exports", () => {
    expect(A.make).exist
    expect(A.arbitrary).exist
  })

  it("type alias without annotations", () => {
    const schema = S.typeAlias([], S.string)
    property(schema)
  })

  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    property(schema)
  })

  it("templateLiteral. a b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
    property(schema)
  })

  it("templateLiteral. a${string}", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string)
    property(schema)
  })

  it("templateLiteral. a", () => {
    const schema = S.templateLiteral(S.literal("a"))
    property(schema)
  })

  it("templateLiteral. ${string}", () => {
    const schema = S.templateLiteral(S.string)
    property(schema)
  })

  it("templateLiteral. a${string}b", () => {
    const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
    property(schema)
  })

  it("never", () => {
    expect(() => A.arbitrary(S.never)(fc)).toThrowError(
      new Error("cannot build an Arbitrary for `never`")
    )
  })

  it("string", () => {
    property(S.string)
  })

  it("void", () => {
    property(S.void)
  })

  it("number", () => {
    property(S.number)
  })

  it("boolean", () => {
    property(S.boolean)
  })

  it("bigint", () => {
    property(S.bigint)
  })

  it("symbol", () => {
    property(S.symbol)
  })

  it("object", () => {
    property(S.object)
  })

  it("literal 1 member", () => {
    const schema = S.literal(1)
    property(schema)
  })

  it("literal 2 members", () => {
    const schema = S.literal(1, "a")
    property(schema)
  })

  it("uniqueSymbol", () => {
    const a = Symbol.for("@effect/schema/test/a")
    const schema = S.uniqueSymbol(a)
    property(schema)
  })

  it("empty enums should throw", () => {
    enum Fruits {}
    const schema = S.enums(Fruits)
    expect(() => A.arbitrary(schema)(fc)).toThrowError(
      new Error("cannot build an Arbitrary for an empty enum")
    )
  })

  it("Numeric enums", () => {
    enum Fruits {
      Apple,
      Banana
    }
    const schema = S.enums(Fruits)
    property(schema)
  })

  it("String enums", () => {
    enum Fruits {
      Apple = "apple",
      Banana = "banana",
      Cantaloupe = 0
    }
    const schema = S.enums(Fruits)
    property(schema)
  })

  it("Const enums", () => {
    const Fruits = {
      Apple: "apple",
      Banana: "banana",
      Cantaloupe: 3
    } as const
    const schema = S.enums(Fruits)
    property(schema)
  })

  it("tuple. empty", () => {
    const schema = S.tuple()
    property(schema)
  })

  it("tuple. required element", () => {
    const schema = S.tuple(S.number)
    property(schema)
  })

  it("tuple. required element with undefined", () => {
    const schema = S.tuple(S.union(S.number, S.undefined))
    property(schema)
  })

  it("tuple. optional element", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.number))
    property(schema)
  })

  it("tuple. optional element with undefined", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.union(S.number, S.undefined)))
    property(schema)
  })

  it("tuple. e + e?", () => {
    const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
    property(schema)
  })

  it("tuple. e + r", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number))
    property(schema)
  })

  it("tuple. e? + r", () => {
    const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(S.number))
    property(schema)
  })

  it("tuple. r", () => {
    const schema = S.array(S.number)
    property(schema)
  })

  it("tuple. r + e", () => {
    const schema = pipe(S.array(S.string), S.element(S.number))
    property(schema)
  })

  it("tuple. e + r + e", () => {
    const schema = pipe(S.tuple(S.string), S.rest(S.number), S.element(S.boolean))
    property(schema)
  })

  it("lazy", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.lazy<A>(
      () => S.tuple(S.number, S.union(schema, S.literal(null)))
    )
    property(schema)
  })

  describe.concurrent("struct", () => {
    it("required property signature", () => {
      const schema = S.struct({ a: S.number })
      property(schema)
    })

    it("required property signature with undefined", () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      property(schema)
    })

    it("optional property signature", () => {
      const schema = S.struct({ a: S.optional(S.number) })
      property(schema)
    })

    it("optional property signature with undefined", () => {
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

  it("record(string, string)", () => {
    const schema = S.record(S.string, S.string)
    property(schema)
  })

  it("record(symbol, string)", () => {
    const schema = S.record(S.symbol, S.string)
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

  it("startsWith", () => {
    const schema = pipe(S.string, S.startsWith("a"))
    property(schema)
  })

  it("endsWith", () => {
    const schema = pipe(S.string, S.endsWith("a"))
    property(schema)
  })

  it("int", () => {
    const schema = pipe(S.number, S.int())
    property(schema)
  })

  it("nonNaN", () => {
    const schema = pipe(S.number, S.nonNaN())
    property(schema)
  })

  it("finite", () => {
    const schema = pipe(S.number, S.finite())
    property(schema)
  })

  it("extend/ struct + record", () => {
    const schema = pipe(
      S.struct({ a: S.string }),
      S.extend(S.record(S.string, S.union(S.string, S.number)))
    )
    property(schema)
  })
})
