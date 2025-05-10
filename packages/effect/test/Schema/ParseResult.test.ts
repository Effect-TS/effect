import { describe, it } from "@effect/vitest"
import {
  assertFailure,
  assertLeft,
  assertSuccess,
  assertTrue,
  deepStrictEqual,
  strictEqual,
  throws
} from "@effect/vitest/utils"
import { Cause, Effect, Either, ParseResult } from "effect"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import { inspect } from "node:util"

const asEffect = <A, E>(either: Either.Either<A, E>): Effect.Effect<A, E> => either

const expectGetRefinementExpected = (schema: S.Schema.Any, expected: string) => {
  if (AST.isRefinement(schema.ast)) {
    strictEqual(ParseResult.getRefinementExpected(schema.ast), expected)
  } else {
    // eslint-disable-next-line no-console
    console.log(schema.ast)
    throw new Error(`expected a Refinement`)
  }
}

describe("ParseResult", () => {
  const typeParseError1 = ParseResult.parseError(new ParseResult.Type(S.String.ast, null))
  const typeParseError2 = ParseResult.parseError(new ParseResult.Type(S.Number.ast, null))

  it("getRefinementExpected", () => {
    expectGetRefinementExpected(S.Number.pipe(S.filter(() => true)), "{ number | filter }")
    expectGetRefinementExpected(S.Number.pipe(S.int()), "an integer")
    expectGetRefinementExpected(S.Number.pipe(S.int(), S.positive()), "a positive number")
    expectGetRefinementExpected(S.Int.pipe(S.positive()), "a positive number")
  })

  describe("ParseError", () => {
    it("toString()", () => {
      const schema = S.Struct({ a: S.String })
      assertLeft(
        S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => e.toString())),
        `{ readonly a: string }
└─ ["a"]
   └─ is missing`
      )
    })

    it("toJSON()", () => {
      const schema = S.Struct({ a: S.String })
      assertLeft(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => (e as any).toJSON())), {
        _id: "ParseError",
        message: `{ readonly a: string }
└─ ["a"]
   └─ is missing`
      })
    })

    it("[NodeInspectSymbol]", () => {
      const schema = S.Struct({ a: S.String })
      assertLeft(
        S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => inspect(e))),
        inspect({
          _id: "ParseError",
          message: `{ readonly a: string }
└─ ["a"]
   └─ is missing`
        })
      )
    })

    it("Error.stack", () => {
      assertTrue(
        ParseResult.parseError(new ParseResult.Type(S.String.ast, 1)).stack?.startsWith(
          `ParseError: Expected string, actual 1`
        )
      )
    })

    it("Effect.catchTag can be used to catch ParseError", () => {
      const program = Effect.fail(typeParseError1).pipe(
        Effect.catchTag("ParseError", () => Effect.succeed(1))
      )
      strictEqual(Effect.runSync(program), 1)
    })
  })

  it("eitherOrUndefined", () => {
    deepStrictEqual(ParseResult.eitherOrUndefined(Either.right(1)), Either.right(1))
    deepStrictEqual(ParseResult.eitherOrUndefined(Either.left("err")), Either.left("err"))
    strictEqual(ParseResult.eitherOrUndefined(Effect.succeed(1)), undefined)
    strictEqual(ParseResult.eitherOrUndefined(Effect.fail("err")), undefined)
  })

  it("flatMap", () => {
    deepStrictEqual(
      ParseResult.flatMap(Either.right(1), (a) => Either.right(a)),
      Either.right(1) as Effect.Effect<number>
    )
    deepStrictEqual(
      ParseResult.flatMap(Either.right(1), () => Either.left("err")),
      Either.left("err") as Effect.Effect<never, string>
    )
    assertSuccess(
      Effect.runSyncExit(
        ParseResult.flatMap(Either.right(1), (a) => Either.right(a))
      ),
      1
    )
    assertSuccess(
      Effect.runSyncExit(
        ParseResult.flatMap(Either.right(1), (a) => Effect.succeed(a))
      ),
      1
    )
    assertFailure(
      Effect.runSyncExit(ParseResult.flatMap(Either.right(1), () => Either.left("err"))),
      Cause.fail("err")
    )
    assertFailure(
      Effect.runSyncExit(ParseResult.flatMap(Either.right(1), () => Effect.fail("err"))),
      Cause.fail("err")
    )
  })

  it("map", () => {
    deepStrictEqual(ParseResult.map(Either.right(1), (n) => n + 1), asEffect(Either.right(2)))
    deepStrictEqual(ParseResult.map(Either.left(typeParseError1), (n) => n + 1), asEffect(Either.left(typeParseError1)))
    deepStrictEqual(Either.right(1).pipe(ParseResult.map((n) => n + 1)), Either.right(2))
    assertSuccess(Effect.runSyncExit(ParseResult.map(Effect.succeed(1), (n) => n + 1)), 2)
    assertFailure(
      Effect.runSyncExit(ParseResult.map(Effect.fail(typeParseError1), (n) => n + 1)),
      Cause.fail(typeParseError1)
    )
  })

  it("mapError", () => {
    deepStrictEqual(ParseResult.mapError(Either.right(1), () => typeParseError2), asEffect(Either.right(1)))
    deepStrictEqual(
      ParseResult.mapError(Either.left(typeParseError1), () => typeParseError2),
      asEffect(Either.left(typeParseError2))
    )
    // pipeable
    deepStrictEqual(Either.right(1).pipe(ParseResult.mapError(() => typeParseError2)), Either.right(1))
    assertSuccess(Effect.runSyncExit(ParseResult.mapError(Effect.succeed(1), () => typeParseError2)), 1)
    assertFailure(
      Effect.runSyncExit(
        ParseResult.mapError(Effect.fail(typeParseError1), () => typeParseError2)
      ),
      Cause.fail(typeParseError2)
    )
  })

  it("mapBoth", () => {
    deepStrictEqual(
      ParseResult.mapBoth(Either.right(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 }),
      asEffect(Either.right(2))
    )
    deepStrictEqual(
      ParseResult.mapBoth(Either.left(typeParseError1), {
        onFailure: () => typeParseError2,
        onSuccess: (n) => n + 1
      }),
      asEffect(Either.left(typeParseError2))
    )
    // pipeable
    deepStrictEqual(
      Either.right(1).pipe(ParseResult.mapBoth({ onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })),
      Either.right(2)
    )
    assertSuccess(
      Effect.runSyncExit(
        ParseResult.mapBoth(Effect.succeed(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })
      ),
      2
    )
    assertFailure(
      Effect.runSyncExit(
        ParseResult.mapBoth(Effect.fail(typeParseError1), {
          onFailure: () => typeParseError2,
          onSuccess: (n) => n + 1
        })
      ),
      Cause.fail(typeParseError2)
    )
  })

  it("orElse", () => {
    deepStrictEqual(ParseResult.orElse(Either.right(1), () => Either.right(2)), asEffect(Either.right(1)))
    deepStrictEqual(ParseResult.orElse(Either.left(typeParseError1), () => Either.right(2)), asEffect(Either.right(2)))
    // pipeable
    deepStrictEqual(Either.right(1).pipe(ParseResult.orElse(() => Either.right(2))), Either.right(1))
    assertSuccess(Effect.runSyncExit(ParseResult.orElse(Effect.succeed(1), () => Either.right(2))), 1)
    assertSuccess(
      Effect.runSyncExit(
        ParseResult.orElse(Effect.fail(typeParseError1), () => Either.right(2))
      ),
      2
    )
  })
})

describe("ParseIssue.actual", () => {
  it("transform decode", () => {
    const result = S.decodeEither(S.transformOrFail(
      S.NumberFromString,
      S.Boolean,
      {
        strict: true,
        decode: (n, _, ast) => ParseResult.fail(new ParseResult.Type(ast, n)),
        encode: (b, _, ast) => ParseResult.fail(new ParseResult.Type(ast, b))
      }
    ))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    strictEqual(result.left.issue.actual, "1")
    strictEqual((result.left.issue as ParseResult.Transformation).issue.actual, 1)
  })

  it("transform encode", () => {
    const result = S.encodeEither(S.transformOrFail(
      S.Boolean,
      S.NumberFromString,
      {
        strict: true,
        decode: (n, _, ast) => ParseResult.fail(new ParseResult.Type(ast, n)),
        encode: (b, _, ast) => ParseResult.fail(new ParseResult.Type(ast, b))
      }
    ))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    strictEqual(result.left.issue.actual, 1)
    strictEqual((result.left.issue as ParseResult.Transformation).issue.actual, "1")
  })

  it("compose decode", () => {
    const result = S.decodeEither(S.compose(S.NumberFromString, S.Number.pipe(S.negative())))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    strictEqual(result.left.issue.actual, "1")
    strictEqual((result.left.issue as ParseResult.Transformation).issue.actual, 1)
  })

  it("compose encode", () => {
    const result = S.encodeEither(S.compose(S.String.pipe(S.length(5)), S.NumberFromString))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    strictEqual(result.left.issue.actual, 1)
    strictEqual((result.left.issue as ParseResult.Transformation).issue.actual, "1")
  })

  it("decode", () => {
    assertTrue(Either.isEither(ParseResult.decode(S.String)("a")))
  })

  it("encode", () => {
    assertTrue(Either.isEither(ParseResult.encode(S.String)("a")))
  })

  it("mergeInternalOptions", () => {
    strictEqual(ParseResult.mergeInternalOptions(undefined, undefined), undefined)
    deepStrictEqual(ParseResult.mergeInternalOptions({}, undefined), {})
    deepStrictEqual(ParseResult.mergeInternalOptions(undefined, {}), {})
    deepStrictEqual(ParseResult.mergeInternalOptions({ errors: undefined }, undefined), { errors: undefined })
    deepStrictEqual(ParseResult.mergeInternalOptions(undefined, { errors: undefined }), { errors: undefined })
    deepStrictEqual(ParseResult.mergeInternalOptions({ errors: "all" }, { errors: "first" }), {
      errors: "first"
    })
    deepStrictEqual(ParseResult.mergeInternalOptions({ onExcessProperty: "ignore" }, { onExcessProperty: "error" }), {
      onExcessProperty: "error"
    })
    deepStrictEqual(ParseResult.mergeInternalOptions({}, { exact: false }), { exact: false })
    deepStrictEqual(ParseResult.mergeInternalOptions({ exact: true }, { exact: false }), { exact: false })

    deepStrictEqual(ParseResult.mergeInternalOptions({ isEffectAllowed: true }, {}), { isEffectAllowed: true })
    deepStrictEqual(ParseResult.mergeInternalOptions({}, { isEffectAllowed: true }), { isEffectAllowed: true })
    deepStrictEqual(ParseResult.mergeInternalOptions({ isEffectAllowed: false }, { isEffectAllowed: true }), {
      isEffectAllowed: true
    })
  })

  it("asserts", () => {
    const schema = S.String
    strictEqual(ParseResult.asserts(schema)("a"), undefined)
    throws(
      () => ParseResult.asserts(schema)(1),
      new ParseResult.ParseError({ issue: new ParseResult.Type(schema.ast, 1) })
    )
  })

  describe("getLiterals", () => {
    it("StringKeyword", () => {
      deepStrictEqual(ParseResult.getLiterals(S.String.ast, true), [])
    })

    it("Struct", () => {
      deepStrictEqual(ParseResult.getLiterals(S.Struct({ _tag: S.Literal("a") }).ast, true), [[
        "_tag",
        new AST.Literal("a")
      ]])
    })

    it("Tuple", () => {
      deepStrictEqual(ParseResult.getLiterals(S.Tuple(S.Literal("a"), S.String).ast, true), [[0, new AST.Literal("a")]])
    })

    it("Refinement", () => {
      deepStrictEqual(
        ParseResult.getLiterals(
          S.Struct({ _tag: S.Literal("a") }).pipe(
            S.filter(() => true)
          ).ast,
          true
        ),
        [["_tag", new AST.Literal("a")]]
      )
    })

    it("Transform (decode)", () => {
      deepStrictEqual(
        ParseResult.getLiterals(
          S.Struct({ radius: S.Number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          true
        ),
        []
      )
    })

    it("Transform (encode)", () => {
      deepStrictEqual(
        ParseResult.getLiterals(
          S.Struct({ radius: S.Number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
          false
        ),
        [["kind", new AST.Literal("circle")]]
      )
    })

    it("property Transform (encode)", () => {
      deepStrictEqual(
        ParseResult.getLiterals(
          S.Struct({
            _tag: S.transform(
              S.Literal("a"),
              S.Literal("b"),
              { strict: true, decode: () => "b" as const, encode: () => "a" as const }
            )
          })
            .ast,
          false
        ),
        [["_tag", new AST.Literal("b")]]
      )
    })

    it("Class (decode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.Literal("a") }) {}
      deepStrictEqual(ParseResult.getLiterals(A.ast, true), [["_tag", new AST.Literal("a")]])
    })

    it("Class (encode)", () => {
      class A extends S.Class<A>("A")({ _tag: S.Literal("a") }) {}
      deepStrictEqual(ParseResult.getLiterals(A.ast, false), [["_tag", new AST.Literal("a")]])
    })
  })

  describe("getSearchTree", () => {
    it("primitive + primitive", () => {
      deepStrictEqual(ParseResult.getSearchTree([S.String.ast, S.Number.ast], true), {
        keys: {},
        otherwise: [S.String.ast, S.Number.ast],
        candidates: []
      })
    })

    it("struct + primitive", () => {
      const a = S.Struct({ _tag: S.Literal("a") })
      deepStrictEqual(ParseResult.getSearchTree([a.ast, S.Number.ast], true), {
        keys: {
          _tag: {
            buckets: {
              a: [a.ast]
            },
            literals: [new AST.Literal("a")],
            candidates: [a.ast]
          }
        },
        otherwise: [S.Number.ast],
        candidates: [a.ast]
      })
    })

    it("struct + struct (same tag key)", () => {
      const a = S.Struct({ _tag: S.Literal("a") })
      const b = S.Struct({ _tag: S.Literal("b") })
      deepStrictEqual(ParseResult.getSearchTree([a.ast, b.ast], true), {
        keys: {
          _tag: {
            buckets: {
              a: [a.ast],
              b: [b.ast]
            },
            literals: [new AST.Literal("a"), new AST.Literal("b")],
            candidates: [a.ast, b.ast]
          }
        },
        otherwise: [],
        candidates: [a.ast, b.ast]
      })
    })

    it("struct + struct (different tag key)", () => {
      const A = S.Struct({ a: S.Literal("A"), c: S.String })
      const B = S.Struct({ b: S.Literal("B"), d: S.Number })
      deepStrictEqual(
        ParseResult.getSearchTree([A.ast, B.ast], true),
        {
          keys: {
            a: {
              buckets: {
                A: [A.ast]
              },
              literals: [new AST.Literal("A")],
              candidates: [A.ast]
            },
            b: {
              buckets: {
                B: [B.ast]
              },
              literals: [new AST.Literal("B")],
              candidates: [B.ast]
            }
          },
          otherwise: [],
          candidates: [A.ast, B.ast]
        }
      )
    })

    it("struct + struct (multiple tags)", () => {
      const A = S.Struct({ _tag: S.Literal("A"), _tag2: S.Literal("A1"), c: S.String })
      const B = S.Struct({ _tag: S.Literal("A"), _tag2: S.Literal("A2"), d: S.Number })
      deepStrictEqual(
        ParseResult.getSearchTree([A.ast, B.ast], true),
        {
          keys: {
            _tag: {
              buckets: {
                A: [A.ast]
              },
              literals: [new AST.Literal("A")],
              candidates: [A.ast]
            },
            _tag2: {
              buckets: {
                A2: [B.ast]
              },
              literals: [new AST.Literal("A2")],
              candidates: [B.ast]
            }
          },
          otherwise: [],
          candidates: [A.ast, B.ast]
        }
      )
    })

    it("tuple + tuple (same tag key)", () => {
      const a = S.Tuple(S.Literal("a"), S.String)
      const b = S.Tuple(S.Literal("b"), S.Number)
      deepStrictEqual(
        ParseResult.getSearchTree([a.ast, b.ast], true),
        {
          keys: {
            0: {
              buckets: {
                a: [a.ast],
                b: [b.ast]
              },
              literals: [new AST.Literal("a"), new AST.Literal("b")],
              candidates: [a.ast, b.ast]
            }
          },
          otherwise: [],
          candidates: [a.ast, b.ast]
        }
      )
    })

    it("tuple + tuple (different tag key)", () => {
      const a = S.Tuple(S.Literal("a"), S.String)
      const b = S.Tuple(S.Number, S.Literal("b"))
      deepStrictEqual(
        ParseResult.getSearchTree([a.ast, b.ast], true),
        {
          keys: {
            0: {
              buckets: {
                a: [a.ast]
              },
              literals: [new AST.Literal("a")],
              candidates: [a.ast]
            },
            1: {
              buckets: {
                b: [b.ast]
              },
              literals: [new AST.Literal("b")],
              candidates: [b.ast]
            }
          },
          otherwise: [],
          candidates: [a.ast, b.ast]
        }
      )
    })

    it("tuple + tuple (multiple tags)", () => {
      const a = S.Tuple(S.Literal("a"), S.Literal("b"), S.String)
      const b = S.Tuple(S.Literal("a"), S.Literal("c"), S.Number)
      deepStrictEqual(
        ParseResult.getSearchTree([a.ast, b.ast], true),
        {
          keys: {
            0: {
              buckets: {
                a: [a.ast]
              },
              literals: [new AST.Literal("a")],
              candidates: [a.ast]
            },
            1: {
              buckets: {
                c: [b.ast]
              },
              literals: [new AST.Literal("c")],
              candidates: [b.ast]
            }
          },
          otherwise: [],
          candidates: [a.ast, b.ast]
        }
      )
    })

    it("should handle multiple tags", () => {
      const a = S.Struct({ category: S.Literal("catA"), tag: S.Literal("a") })
      const b = S.Struct({ category: S.Literal("catA"), tag: S.Literal("b") })
      const c = S.Struct({ category: S.Literal("catA"), tag: S.Literal("c") })
      deepStrictEqual(
        ParseResult.getSearchTree([
          a.ast,
          b.ast,
          c.ast
        ], true),
        {
          keys: {
            category: {
              buckets: {
                catA: [a.ast]
              },
              literals: [new AST.Literal("catA")],
              candidates: [a.ast]
            },
            tag: {
              buckets: {
                b: [b.ast],
                c: [c.ast]
              },
              literals: [new AST.Literal("b"), new AST.Literal("c")],
              candidates: [b.ast, c.ast]
            }
          },
          otherwise: [],
          candidates: [a.ast, b.ast, c.ast]
        }
      )
    })

    it("big union", () => {
      const a = S.Struct({ type: S.Literal("a"), value: S.String })
      const b = S.Struct({ type: S.Literal("b"), value: S.String })
      const c = S.Struct({ type: S.Literal("c"), value: S.String })
      const n = S.Struct({ type: S.Literal(null), value: S.String })
      const schema = S.Union(
        a,
        b,
        c,
        S.Struct({ type: S.String, value: S.String }),
        n,
        S.Struct({ type: S.Undefined, value: S.String }),
        S.Struct({ type: S.Literal("d", "e"), value: S.String }),
        S.Struct({ type: S.Struct({ nested: S.String }), value: S.String }),
        S.Struct({ type: S.Array(S.Number), value: S.String })
      )
      const types = (schema.ast as AST.Union).types
      deepStrictEqual(ParseResult.getSearchTree(types, true), {
        keys: {
          type: {
            buckets: {
              a: [a.ast],
              b: [b.ast],
              c: [c.ast],
              null: [n.ast]
            },
            literals: [
              new AST.Literal("a"),
              new AST.Literal("b"),
              new AST.Literal("c"),
              new AST.Literal(null)
            ],
            candidates: [a.ast, b.ast, c.ast, n.ast]
          }
        },
        otherwise: [
          S.Struct({ type: S.String, value: S.String }).ast,
          S.Struct({ type: S.Undefined, value: S.String }).ast,
          S.Struct({ type: S.Literal("d", "e"), value: S.String }).ast,
          S.Struct({ type: S.Struct({ nested: S.String }), value: S.String }).ast,
          S.Struct({ type: S.Array(S.Number), value: S.String }).ast
        ],
        candidates: [
          a.ast,
          b.ast,
          c.ast,
          n.ast
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
      deepStrictEqual(ParseResult.getSearchTree(types, true), {
        keys: {},
        otherwise: [ab.ast, AB.ast],
        candidates: []
      })
    })
  })
})
