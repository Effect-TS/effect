import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"

describe.concurrent("Parser", () => {
  it("validate", () => {
    const schema = pipe(S.string, S.maxLength(1), S.numberFromString)
    expect(P.validate(schema)(1)).toEqual(1)
    expect(P.validate(schema)(10)).toEqual(10)
    expect(() => P.validate(schema)("a")).toThrowError(
      new Error(`error(s) found
└─ Expected number, actual "a"`)
    )
  })

  it("validateOption", () => {
    const schema = pipe(S.string, S.maxLength(1), S.numberFromString)
    expect(P.validateOption(schema)(1)).toEqual(O.some(1))
    expect(P.validateOption(schema)(10)).toEqual(O.some(10))
    expect(P.validateOption(schema)("a")).toEqual(O.none())
  })

  it("validateEither", () => {
    const schema = pipe(S.string, S.maxLength(1), S.numberFromString)
    expect(P.validateEither(schema)(1)).toEqual(E.right(1))
    expect(P.validateEither(schema)(10)).toEqual(E.right(10))
    expect(P.validateEither(schema)("a")).toEqual(E.left([PR.type(S.number.ast, "a")]))
  })

  it("_getLiterals", () => {
    expect(P._getLiterals(S.string.ast)).toEqual([])
    // TypeLiteral
    expect(P._getLiterals(S.struct({ _tag: S.literal("a") }).ast))
      .toEqual([["_tag", AST.createLiteral("a")]])
    // Refinement
    expect(
      P._getLiterals(
        pipe(
          S.struct({ _tag: S.literal("a") }),
          S.filter(() => true)
        ).ast
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])
    // TypeAlias
    expect(
      P._getLiterals(
        S.declare(
          [],
          S.struct({ _tag: S.literal("a") }),
          () => P.decodeEither(S.struct({ _tag: S.literal("a") }))
        ).ast
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])

    // Transform
    expect(
      P._getLiterals(
        pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle")).ast
      )
    ).toEqual([])
    // simulate encoding
    const ast = AST.reverse(
      pipe(
        S.struct({ radius: S.number }),
        S.attachPropertySignature("kind", "circle")
      ).ast
    )
    expect(P._getLiterals(ast)).toEqual([["kind", AST.createLiteral("circle")]])
  })

  it("_getSearchTree", () => {
    expect(P._getSearchTree([S.string.ast, S.number.ast])).toEqual({
      keys: {},
      otherwise: [S.string.ast, S.number.ast]
    })

    expect(P._getSearchTree([S.struct({ _tag: S.literal("a") }).ast, S.number.ast])).toEqual(
      {
        keys: {
          _tag: {
            buckets: {
              a: [S.struct({ _tag: S.literal("a") }).ast]
            },
            ast: AST.createLiteral("a")
          }
        },
        otherwise: [S.number.ast]
      }
    )

    expect(
      P._getSearchTree([
        S.struct({ _tag: S.literal("a") }).ast,
        S.struct({ _tag: S.literal("b") }).ast
      ])
    ).toEqual({
      keys: {
        _tag: {
          buckets: {
            a: [S.struct({ _tag: S.literal("a") }).ast],
            b: [S.struct({ _tag: S.literal("b") }).ast]
          },
          ast: AST.createUnion([AST.createLiteral("a"), AST.createLiteral("b")])
        }
      },
      otherwise: []
    })

    expect(
      P._getSearchTree([
        S.struct({ a: S.literal("A"), c: S.string }).ast,
        S.struct({ b: S.literal("B"), d: S.number }).ast
      ])
    ).toEqual({
      keys: {
        a: {
          buckets: {
            A: [S.struct({ a: S.literal("A"), c: S.string }).ast]
          },
          ast: AST.createLiteral("A")
        },
        b: {
          buckets: {
            B: [S.struct({ b: S.literal("B"), d: S.number }).ast]
          },
          ast: AST.createLiteral("B")
        }
      },
      otherwise: []
    })

    // should handle multiple tags
    expect(
      P._getSearchTree([
        S.struct({ category: S.literal("catA"), tag: S.literal("a") }).ast,
        S.struct({ category: S.literal("catA"), tag: S.literal("b") }).ast,
        S.struct({ category: S.literal("catA"), tag: S.literal("c") }).ast
      ])
    ).toEqual({
      keys: {
        category: {
          buckets: {
            catA: [S.struct({ category: S.literal("catA"), tag: S.literal("a") }).ast]
          },
          ast: AST.createLiteral("catA")
        },
        tag: {
          buckets: {
            b: [S.struct({ category: S.literal("catA"), tag: S.literal("b") }).ast],
            c: [S.struct({ category: S.literal("catA"), tag: S.literal("c") }).ast]
          },
          ast: AST.createUnion([AST.createLiteral("b"), AST.createLiteral("c")])
        }
      },
      otherwise: []
    })
  })

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
  expect(
    P._getSearchTree(types)
  ).toEqual({
    keys: {
      type: {
        buckets: {
          a: [S.struct({ type: S.literal("a"), value: S.string }).ast],
          b: [S.struct({ type: S.literal("b"), value: S.string }).ast],
          c: [S.struct({ type: S.literal("c"), value: S.string }).ast],
          null: [S.struct({ type: S.literal(null), value: S.string }).ast]
        },
        ast: AST.createUnion([
          AST.createLiteral("a"),
          AST.createLiteral("b"),
          AST.createLiteral("c"),
          AST.createLiteral(null)
        ])
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
