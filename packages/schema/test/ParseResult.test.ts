import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Effect, Either, Exit } from "effect"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

describe("ParseResult", () => {
  const typeParseError1 = P.parseError(new P.Type(S.string.ast, null))
  const typeParseError2 = P.parseError(new P.Type(S.number.ast, null))

  it("toString()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => e.toString()))).toStrictEqual(
      Either.left(`{ a: string }
└─ ["a"]
   └─ is missing`)
    )
  })

  it("toJSON()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => (e as any).toJSON())))
      .toStrictEqual(
        Either.left({
          _id: "ParseError",
          message: `{ a: string }
└─ ["a"]
   └─ is missing`
        })
      )
  })

  it("[NodeInspectSymbol]", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => inspect(e))))
      .toStrictEqual(
        Either.left(inspect({
          _id: "ParseError",
          message: `{ a: string }
└─ ["a"]
   └─ is missing`
        }))
      )
  })

  it("Error.stack", () => {
    expect(
      P.parseError(new P.Type(S.string.ast, 1)).stack?.startsWith(
        `ParseError: Expected a string, actual 1`
      )
    )
      .toEqual(true)
  })

  it("Effect.catchTag can be used to catch ParseError", () => {
    const program = Effect.fail(typeParseError1).pipe(
      Effect.catchTag("ParseError", () => Effect.succeed(1))
    )
    expect(Effect.runSync(program)).toBe(1)
  })

  it("map (Either)", () => {
    expect(P.map(Either.right(1), (n) => n + 1)).toStrictEqual(Either.right(2))
    expect(P.map(Either.left(typeParseError1), (n) => n + 1)).toStrictEqual(
      Either.left(typeParseError1)
    )
    // pipeable
    expect(Either.right(1).pipe(P.map((n) => n + 1))).toStrictEqual(Either.right(2))
  })

  it("map (Effect)", () => {
    expect(Effect.runSyncExit(P.map(Effect.succeed(1), (n) => n + 1))).toStrictEqual(
      Exit.succeed(2)
    )
    expect(Effect.runSyncExit(P.map(Effect.fail(typeParseError1), (n) => n + 1)))
      .toStrictEqual(Exit.fail(typeParseError1))
  })

  it("mapLeft (Either)", () => {
    expect(P.mapError(Either.right(1), () => typeParseError2)).toStrictEqual(
      Either.right(1)
    )
    expect(P.mapError(Either.left(typeParseError1), () => typeParseError2))
      .toStrictEqual(Either.left(typeParseError2))
    // pipeable
    expect(Either.right(1).pipe(P.mapError(() => typeParseError2))).toStrictEqual(
      Either.right(1)
    )
  })

  it("mapLeft (Effect)", () => {
    expect(Effect.runSyncExit(P.mapError(Effect.succeed(1), () => typeParseError2)))
      .toStrictEqual(Exit.succeed(1))
    expect(
      Effect.runSyncExit(
        P.mapError(Effect.fail(typeParseError1), () => typeParseError2)
      )
    ).toStrictEqual(Exit.fail(typeParseError2))
  })

  it("mapBoth (Either)", () => {
    expect(P.mapBoth(Either.right(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 }))
      .toStrictEqual(Either.right(2))
    expect(
      P.mapBoth(Either.left(typeParseError1), {
        onFailure: () => typeParseError2,
        onSuccess: (n) => n + 1
      })
    ).toStrictEqual(Either.left(typeParseError2))
    // pipeable
    expect(Either.right(1).pipe(P.mapBoth({ onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })))
      .toStrictEqual(Either.right(2))
  })

  it("mapBoth (Effect)", () => {
    expect(
      Effect.runSyncExit(
        P.mapBoth(Effect.succeed(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })
      )
    ).toStrictEqual(Exit.succeed(2))
    expect(
      Effect.runSyncExit(
        P.mapBoth(Effect.fail(typeParseError1), {
          onFailure: () => typeParseError2,
          onSuccess: (n) => n + 1
        })
      )
    ).toStrictEqual(Exit.fail(typeParseError2))
  })

  it("orElse (Either)", () => {
    expect(P.orElse(Either.right(1), () => Either.right(2))).toStrictEqual(
      Either.right(1)
    )
    expect(P.orElse(Either.left(typeParseError1), () => Either.right(2)))
      .toStrictEqual(Either.right(2))
    // pipeable
    expect(Either.right(1).pipe(P.orElse(() => Either.right(2)))).toStrictEqual(
      Either.right(1)
    )
  })

  it("orElse (Effect)", () => {
    expect(Effect.runSyncExit(P.orElse(Effect.succeed(1), () => Either.right(2))))
      .toStrictEqual(
        Exit.succeed(1)
      )
    expect(
      Effect.runSyncExit(
        P.orElse(Effect.fail(typeParseError1), () => Either.right(2))
      )
    ).toStrictEqual(Exit.succeed(2))
  })
})

describe("ParseIssue.actual", () => {
  it("transform decode", () => {
    const result = S.decodeEither(S.transformOrFail(
      S.NumberFromString,
      S.boolean,
      (n, _, ast) => P.fail(new P.Type(ast, n)),
      (b, _, ast) => P.fail(new P.Type(ast, b))
    ))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual("1")
    expect((result.left.error as P.Transformation).error.actual).toEqual(1)
  })

  it("transform encode", () => {
    const result = S.encodeEither(S.transformOrFail(
      S.boolean,
      S.NumberFromString,
      (n, _, ast) => P.fail(new P.Type(ast, n)),
      (b, _, ast) => P.fail(new P.Type(ast, b))
    ))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual(1)
    expect((result.left.error as P.Transformation).error.actual).toEqual("1")
  })

  it("compose decode", () => {
    const result = S.decodeEither(S.compose(S.NumberFromString, S.negative()(S.number)))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual("1")
    expect((result.left.error as P.Transformation).error.actual).toEqual(1)
  })

  it("compose encode", () => {
    const result = S.encodeEither(S.compose(S.length(5)(S.string), S.NumberFromString))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual(1)
    expect((result.left.error as P.Transformation).error.actual).toEqual("1")
  })

  it("decode", () => {
    expect(Either.isEither(P.decode(S.string)("a")))
  })

  it("encode", () => {
    expect(Either.isEither(P.encode(S.string)("a")))
  })

  it("mergeParseOptions", () => {
    expect(P.mergeParseOptions(undefined, undefined)).toStrictEqual(undefined)
    expect(P.mergeParseOptions({}, undefined)).toStrictEqual({})
    expect(P.mergeParseOptions(undefined, {})).toStrictEqual({})
    expect(P.mergeParseOptions({ errors: undefined }, undefined)).toStrictEqual({ errors: undefined })
    expect(P.mergeParseOptions(undefined, { errors: undefined })).toStrictEqual({ errors: undefined })
    expect(P.mergeParseOptions({ errors: "all" }, { errors: "first" })).toStrictEqual({
      errors: "first",
      onExcessProperty: undefined
    })
    expect(P.mergeParseOptions({ onExcessProperty: "ignore" }, { onExcessProperty: "error" })).toStrictEqual({
      onExcessProperty: "error",
      errors: undefined
    })
  })

  it("asserts", () => {
    const schema = S.string
    expect(P.asserts(schema)("a")).toEqual(undefined)
    expect(() => P.asserts(schema)(1)).toThrow(
      new Error(`Expected a string, actual 1`)
    )
  })

  describe("getLiterals", () => {
    it("StringKeyword", () => {
      expect(P.getLiterals(S.string.ast, true)).toEqual([])
    })

    it("TypeLiteral", () => {
      expect(P.getLiterals(S.struct({ _tag: S.literal("a") }).ast, true))
        .toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Refinement", () => {
      expect(
        P.getLiterals(
          S.struct({ _tag: S.literal("a") }).pipe(
            S.filter(() => true)
          ).ast,
          true
        )
      ).toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Transform (decode)", () => {
      expect(
        P.getLiterals(
          S.struct({ radius: S.number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          true
        )
      ).toEqual([])
    })

    it("Transform (encode)", () => {
      expect(
        P.getLiterals(
          S.struct({ radius: S.number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          false
        )
      ).toEqual([["kind", new AST.Literal("circle")]])
    })

    it("property Transform (encode)", () => {
      expect(
        P.getLiterals(
          S.struct({
            _tag: S.transform(
              S.literal("a"),
              S.literal("b"),
              { decode: () => "b" as const, encode: () => "a" as const }
            )
          })
            .ast,
          false
        )
      ).toEqual([["_tag", new AST.Literal("b")]])
    })

    it("Class (decode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.literal("a") }) {}
      expect(P.getLiterals(A.ast, true)).toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Class (encode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.literal("a") }) {}
      expect(P.getLiterals(A.ast, false)).toEqual([["_tag", new AST.Literal("a")]])
    })
  })

  describe("getSearchTree", () => {
    it("primitive + primitive", () => {
      expect(P.getSearchTree([S.string.ast, S.number.ast], true)).toEqual({
        keys: {},
        otherwise: [S.string.ast, S.number.ast]
      })
    })

    it("struct + primitive", () => {
      const a = S.struct({ _tag: S.literal("a") })
      expect(P.getSearchTree([a.ast, S.number.ast], true)).toEqual(
        {
          keys: {
            _tag: {
              buckets: {
                a: [a.ast]
              },
              literals: [new AST.Literal("a")]
            }
          },
          otherwise: [S.number.ast]
        }
      )
    })

    it("struct + struct (same tag key)", () => {
      const a = S.struct({ _tag: S.literal("a") })
      const b = S.struct({ _tag: S.literal("b") })
      expect(P.getSearchTree([a.ast, b.ast], true)).toEqual({
        keys: {
          _tag: {
            buckets: {
              a: [a.ast],
              b: [b.ast]
            },
            literals: [new AST.Literal("a"), new AST.Literal("b")]
          }
        },
        otherwise: []
      })
    })

    it("struct + struct (different tag key)", () => {
      const A = S.struct({ a: S.literal("A"), c: S.string })
      const B = S.struct({ b: S.literal("B"), d: S.number })
      expect(
        P.getSearchTree([A.ast, B.ast], true)
      ).toEqual({
        keys: {
          a: {
            buckets: {
              A: [A.ast]
            },
            literals: [new AST.Literal("A")]
          },
          b: {
            buckets: {
              B: [B.ast]
            },
            literals: [new AST.Literal("B")]
          }
        },
        otherwise: []
      })
    })

    it("should handle multiple tags", () => {
      const a = S.struct({ category: S.literal("catA"), tag: S.literal("a") })
      const b = S.struct({ category: S.literal("catA"), tag: S.literal("b") })
      const c = S.struct({ category: S.literal("catA"), tag: S.literal("c") })
      expect(
        P.getSearchTree([
          a.ast,
          b.ast,
          c.ast
        ], true)
      ).toEqual({
        keys: {
          category: {
            buckets: {
              catA: [a.ast]
            },
            literals: [new AST.Literal("catA")]
          },
          tag: {
            buckets: {
              b: [b.ast],
              c: [c.ast]
            },
            literals: [new AST.Literal("b"), new AST.Literal("c")]
          }
        },
        otherwise: []
      })
    })

    it("big union", () => {
      const schema = S.union(
        S.struct({ type: S.literal("a"), value: S.string }),
        S.struct({ type: S.literal("b"), value: S.string }),
        S.struct({ type: S.literal("c"), value: S.string }),
        S.struct({ type: S.string, value: S.string }),
        S.struct({ type: S.literal(null), value: S.string }),
        S.struct({ type: S.undefined, value: S.string }),
        S.struct({ type: S.literal("d", "e"), value: S.string }),
        S.struct({ type: S.struct({ nested: S.string }), value: S.string }),
        S.struct({ type: S.array(S.number), value: S.string })
      )
      const types = (schema.ast as AST.Union).types
      expect(P.getSearchTree(types, true)).toEqual({
        keys: {
          type: {
            buckets: {
              a: [S.struct({ type: S.literal("a"), value: S.string }).ast],
              b: [S.struct({ type: S.literal("b"), value: S.string }).ast],
              c: [S.struct({ type: S.literal("c"), value: S.string }).ast],
              null: [S.struct({ type: S.literal(null), value: S.string }).ast]
            },
            literals: [
              new AST.Literal("a"),
              new AST.Literal("b"),
              new AST.Literal("c"),
              new AST.Literal(null)
            ]
          }
        },
        otherwise: [
          S.struct({ type: S.string, value: S.string }).ast,
          S.struct({ type: S.undefined, value: S.string }).ast,
          S.struct({ type: S.literal("d", "e"), value: S.string }).ast,
          S.struct({ type: S.struct({ nested: S.string }), value: S.string }).ast,
          S.struct({ type: S.array(S.number), value: S.string }).ast
        ]
      })
    })

    it("nested unions", () => {
      const a = S.struct({ _tag: S.literal("a") })
      const b = S.struct({ _tag: S.literal("b") })
      const A = S.struct({ a: S.literal("A"), c: S.string })
      const B = S.struct({ b: S.literal("B"), d: S.number })
      const ab = S.union(a, b)
      const AB = S.union(A, B)
      const schema = S.union(ab, AB)
      const types = (schema.ast as AST.Union).types
      expect(P.getSearchTree(types, true)).toEqual({
        keys: {},
        otherwise: [ab.ast, AB.ast]
      })
    })
  })
})
