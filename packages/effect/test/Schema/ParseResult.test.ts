import { Effect, Either, Exit } from "effect"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { inspect } from "node:util"
import { assert, describe, expect, it } from "vitest"

const expectGetRefinementExpected = (schema: S.Schema.Any, expected: string) => {
  if (AST.isRefinement(schema.ast)) {
    expect(P.getRefinementExpected(schema.ast)).toBe(expected)
  } else {
    // eslint-disable-next-line no-console
    console.log(schema.ast)
    assert.fail(`expected a Refinement`)
  }
}

describe("ParseResult", () => {
  const typeParseError1 = P.parseError(new P.Type(S.String.ast, null))
  const typeParseError2 = P.parseError(new P.Type(S.Number.ast, null))

  it("getRefinementExpected", () => {
    expectGetRefinementExpected(S.Number.pipe(S.filter(() => true)), "{ number | filter }")
    expectGetRefinementExpected(S.Number.pipe(S.int()), "an integer")
    expectGetRefinementExpected(S.Number.pipe(S.int(), S.positive()), "a positive number")
    expectGetRefinementExpected(S.Int.pipe(S.positive()), "a positive number")
  })

  describe("ParseError", () => {
    it("toString()", () => {
      const schema = S.Struct({ a: S.String })
      expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => e.toString()))).toStrictEqual(
        Either.left(`{ readonly a: string }
└─ ["a"]
   └─ is missing`)
      )
    })

    it("toJSON()", () => {
      const schema = S.Struct({ a: S.String })
      expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => (e as any).toJSON())))
        .toStrictEqual(
          Either.left({
            _id: "ParseError",
            message: `{ readonly a: string }
└─ ["a"]
   └─ is missing`
          })
        )
    })

    it("[NodeInspectSymbol]", () => {
      const schema = S.Struct({ a: S.String })
      expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => inspect(e))))
        .toStrictEqual(
          Either.left(inspect({
            _id: "ParseError",
            message: `{ readonly a: string }
└─ ["a"]
   └─ is missing`
          }))
        )
    })

    it("Error.stack", () => {
      expect(
        P.parseError(new P.Type(S.String.ast, 1)).stack?.startsWith(
          `ParseError: Expected string, actual 1`
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
      S.Boolean,
      {
        strict: true,
        decode: (n, _, ast) => P.fail(new P.Type(ast, n)),
        encode: (b, _, ast) => P.fail(new P.Type(ast, b))
      }
    ))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.issue.actual).toEqual("1")
    expect((result.left.issue as P.Transformation).issue.actual).toEqual(1)
  })

  it("transform encode", () => {
    const result = S.encodeEither(S.transformOrFail(
      S.Boolean,
      S.NumberFromString,
      {
        strict: true,
        decode: (n, _, ast) => P.fail(new P.Type(ast, n)),
        encode: (b, _, ast) => P.fail(new P.Type(ast, b))
      }
    ))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.issue.actual).toEqual(1)
    expect((result.left.issue as P.Transformation).issue.actual).toEqual("1")
  })

  it("compose decode", () => {
    const result = S.decodeEither(S.compose(S.NumberFromString, S.negative()(S.Number)))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.issue.actual).toEqual("1")
    expect((result.left.issue as P.Transformation).issue.actual).toEqual(1)
  })

  it("compose encode", () => {
    const result = S.encodeEither(S.compose(S.length(5)(S.String), S.NumberFromString))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.issue.actual).toEqual(1)
    expect((result.left.issue as P.Transformation).issue.actual).toEqual("1")
  })

  it("decode", () => {
    expect(Either.isEither(P.decode(S.String)("a")))
  })

  it("encode", () => {
    expect(Either.isEither(P.encode(S.String)("a")))
  })

  it("mergeInternalOptions", () => {
    expect(P.mergeInternalOptions(undefined, undefined)).toStrictEqual(undefined)
    expect(P.mergeInternalOptions({}, undefined)).toStrictEqual({})
    expect(P.mergeInternalOptions(undefined, {})).toStrictEqual({})
    expect(P.mergeInternalOptions({ errors: undefined }, undefined)).toStrictEqual({ errors: undefined })
    expect(P.mergeInternalOptions(undefined, { errors: undefined })).toStrictEqual({ errors: undefined })
    expect(P.mergeInternalOptions({ errors: "all" }, { errors: "first" })).toStrictEqual({
      errors: "first"
    })
    expect(P.mergeInternalOptions({ onExcessProperty: "ignore" }, { onExcessProperty: "error" })).toStrictEqual({
      onExcessProperty: "error"
    })
    expect(P.mergeInternalOptions({}, { exact: false })).toStrictEqual({ exact: false })
    expect(P.mergeInternalOptions({ exact: true }, { exact: false })).toStrictEqual({ exact: false })

    expect(P.mergeInternalOptions({ isEffectAllowed: true }, {})).toStrictEqual({ isEffectAllowed: true })
    expect(P.mergeInternalOptions({}, { isEffectAllowed: true })).toStrictEqual({ isEffectAllowed: true })
    expect(P.mergeInternalOptions({ isEffectAllowed: false }, { isEffectAllowed: true })).toStrictEqual({
      isEffectAllowed: true
    })
  })

  it("asserts", () => {
    const schema = S.String
    expect(P.asserts(schema)("a")).toEqual(undefined)
    expect(() => P.asserts(schema)(1)).toThrow(
      new Error(`Expected string, actual 1`)
    )
  })

  describe("getLiterals", () => {
    it("StringKeyword", () => {
      expect(P.getLiterals(S.String.ast, true)).toEqual([])
    })

    it("Struct", () => {
      expect(P.getLiterals(S.Struct({ _tag: S.Literal("a") }).ast, true))
        .toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Tuple", () => {
      expect(P.getLiterals(S.Tuple(S.Literal("a"), S.String).ast, true))
        .toEqual([[0, new AST.Literal("a")]])
    })

    it("Refinement", () => {
      expect(
        P.getLiterals(
          S.Struct({ _tag: S.Literal("a") }).pipe(
            S.filter(() => true)
          ).ast,
          true
        )
      ).toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Transform (decode)", () => {
      expect(
        P.getLiterals(
          S.Struct({ radius: S.Number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          true
        )
      ).toEqual([])
    })

    it("Transform (encode)", () => {
      expect(
        P.getLiterals(
          S.Struct({ radius: S.Number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          false
        )
      ).toEqual([["kind", new AST.Literal("circle")]])
    })

    it("property Transform (encode)", () => {
      expect(
        P.getLiterals(
          S.Struct({
            _tag: S.transform(
              S.Literal("a"),
              S.Literal("b"),
              { strict: true, decode: () => "b" as const, encode: () => "a" as const }
            )
          })
            .ast,
          false
        )
      ).toEqual([["_tag", new AST.Literal("b")]])
    })

    it("Class (decode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.Literal("a") }) {}
      expect(P.getLiterals(A.ast, true)).toEqual([["_tag", new AST.Literal("a")]])
    })

    it("Class (encode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.Literal("a") }) {}
      expect(P.getLiterals(A.ast, false)).toEqual([["_tag", new AST.Literal("a")]])
    })
  })

  describe("getSearchTree", () => {
    it("primitive + primitive", () => {
      expect(P.getSearchTree([S.String.ast, S.Number.ast], true)).toEqual({
        keys: {},
        otherwise: [S.String.ast, S.Number.ast]
      })
    })

    it("struct + primitive", () => {
      const a = S.Struct({ _tag: S.Literal("a") })
      expect(P.getSearchTree([a.ast, S.Number.ast], true)).toEqual(
        {
          keys: {
            _tag: {
              buckets: {
                a: [a.ast]
              },
              literals: [new AST.Literal("a")]
            }
          },
          otherwise: [S.Number.ast]
        }
      )
    })

    it("struct + struct (same tag key)", () => {
      const a = S.Struct({ _tag: S.Literal("a") })
      const b = S.Struct({ _tag: S.Literal("b") })
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
      const A = S.Struct({ a: S.Literal("A"), c: S.String })
      const B = S.Struct({ b: S.Literal("B"), d: S.Number })
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

    it("struct + struct (multiple tags)", () => {
      const A = S.Struct({ _tag: S.Literal("A"), _tag2: S.Literal("A1"), c: S.String })
      const B = S.Struct({ _tag: S.Literal("A"), _tag2: S.Literal("A2"), d: S.Number })
      expect(
        P.getSearchTree([A.ast, B.ast], true)
      ).toEqual({
        keys: {
          _tag: {
            buckets: {
              A: [A.ast]
            },
            literals: [new AST.Literal("A")]
          },
          _tag2: {
            buckets: {
              A2: [B.ast]
            },
            literals: [new AST.Literal("A2")]
          }
        },
        otherwise: []
      })
    })

    it("tuple + tuple (same tag key)", () => {
      const a = S.Tuple(S.Literal("a"), S.String)
      const b = S.Tuple(S.Literal("b"), S.Number)
      expect(
        P.getSearchTree([a.ast, b.ast], true)
      ).toEqual({
        keys: {
          0: {
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

    it("tuple + tuple (different tag key)", () => {
      const a = S.Tuple(S.Literal("a"), S.String)
      const b = S.Tuple(S.Number, S.Literal("b"))
      expect(
        P.getSearchTree([a.ast, b.ast], true)
      ).toEqual({
        keys: {
          0: {
            buckets: {
              a: [a.ast]
            },
            literals: [new AST.Literal("a")]
          },
          1: {
            buckets: {
              b: [b.ast]
            },
            literals: [new AST.Literal("b")]
          }
        },
        otherwise: []
      })
    })

    it("tuple + tuple (multiple tags)", () => {
      const a = S.Tuple(S.Literal("a"), S.Literal("b"), S.String)
      const b = S.Tuple(S.Literal("a"), S.Literal("c"), S.Number)
      expect(
        P.getSearchTree([a.ast, b.ast], true)
      ).toEqual({
        keys: {
          0: {
            buckets: {
              a: [a.ast]
            },
            literals: [new AST.Literal("a")]
          },
          1: {
            buckets: {
              c: [b.ast]
            },
            literals: [new AST.Literal("c")]
          }
        },
        otherwise: []
      })
    })

    it("should handle multiple tags", () => {
      const a = S.Struct({ category: S.Literal("catA"), tag: S.Literal("a") })
      const b = S.Struct({ category: S.Literal("catA"), tag: S.Literal("b") })
      const c = S.Struct({ category: S.Literal("catA"), tag: S.Literal("c") })
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
      const schema = S.Union(
        S.Struct({ type: S.Literal("a"), value: S.String }),
        S.Struct({ type: S.Literal("b"), value: S.String }),
        S.Struct({ type: S.Literal("c"), value: S.String }),
        S.Struct({ type: S.String, value: S.String }),
        S.Struct({ type: S.Literal(null), value: S.String }),
        S.Struct({ type: S.Undefined, value: S.String }),
        S.Struct({ type: S.Literal("d", "e"), value: S.String }),
        S.Struct({ type: S.Struct({ nested: S.String }), value: S.String }),
        S.Struct({ type: S.Array(S.Number), value: S.String })
      )
      const types = (schema.ast as AST.Union).types
      expect(P.getSearchTree(types, true)).toEqual({
        keys: {
          type: {
            buckets: {
              a: [S.Struct({ type: S.Literal("a"), value: S.String }).ast],
              b: [S.Struct({ type: S.Literal("b"), value: S.String }).ast],
              c: [S.Struct({ type: S.Literal("c"), value: S.String }).ast],
              null: [S.Struct({ type: S.Literal(null), value: S.String }).ast]
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
          S.Struct({ type: S.String, value: S.String }).ast,
          S.Struct({ type: S.Undefined, value: S.String }).ast,
          S.Struct({ type: S.Literal("d", "e"), value: S.String }).ast,
          S.Struct({ type: S.Struct({ nested: S.String }), value: S.String }).ast,
          S.Struct({ type: S.Array(S.Number), value: S.String }).ast
        ]
      })
    })

    it("nested unions", () => {
      const a = S.Struct({ _tag: S.Literal("a") })
      const b = S.Struct({ _tag: S.Literal("b") })
      const A = S.Struct({ a: S.Literal("A"), c: S.String })
      const B = S.Struct({ b: S.Literal("B"), d: S.Number })
      const ab = S.Union(a, b)
      const AB = S.Union(A, B)
      const schema = S.Union(ab, AB)
      const types = (schema.ast as AST.Union).types
      expect(P.getSearchTree(types, true)).toEqual({
        keys: {},
        otherwise: [ab.ast, AB.ast]
      })
    })
  })
})
