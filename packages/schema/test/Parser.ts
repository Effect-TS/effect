import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"

describe.concurrent("Parser", () => {
  it("_getLiterals", () => {
    expect(P._getLiterals(S.string.ast, "decoder")).toEqual([])
    // TypeLiteral
    expect(P._getLiterals(S.struct({ _tag: S.literal("a") }).ast, "decoder"))
      .toEqual([["_tag", AST.createLiteral("a")]])
    // Refinement
    expect(
      P._getLiterals(
        pipe(
          S.struct({ _tag: S.literal("a") }),
          S.filter(() => true)
        ).ast,
        "decoder"
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])
    // TypeAlias
    expect(
      P._getLiterals(
        S.typeAlias([], S.struct({ _tag: S.literal("a") })).ast,
        "decoder"
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])

    // Transform
    expect(
      P._getLiterals(
        pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle")).ast,
        "decoder"
      )
    ).toEqual([])
    expect(
      P._getLiterals(
        pipe(S.struct({ radius: S.number }), S.attachPropertySignature("kind", "circle")).ast,
        "encoder"
      )
    ).toEqual([["kind", AST.createLiteral("circle")]])
  })

  it("_getSearchTree", () => {
    expect(P._getSearchTree([S.string, S.number], "decoder")).toEqual({
      keys: {},
      otherwise: [S.string, S.number]
    })

    expect(P._getSearchTree([S.struct({ _tag: S.literal("a") }), S.number], "decoder")).toEqual(
      {
        keys: {
          _tag: {
            buckets: {
              a: [S.struct({ _tag: S.literal("a") })]
            },
            ast: AST.createLiteral("a")
          }
        },
        otherwise: [S.number]
      }
    )

    expect(
      P._getSearchTree([
        S.struct({ _tag: S.literal("a") }),
        S.struct({ _tag: S.literal("b") })
      ], "decoder")
    ).toEqual({
      keys: {
        _tag: {
          buckets: {
            a: [S.struct({ _tag: S.literal("a") })],
            b: [S.struct({ _tag: S.literal("b") })]
          },
          ast: AST.createUnion([AST.createLiteral("a"), AST.createLiteral("b")])
        }
      },
      otherwise: []
    })

    expect(
      P._getSearchTree([
        S.struct({ a: S.literal("A"), c: S.string }),
        S.struct({ b: S.literal("B"), d: S.number })
      ], "decoder")
    ).toEqual({
      keys: {
        a: {
          buckets: {
            A: [S.struct({ a: S.literal("A"), c: S.string })]
          },
          ast: AST.createLiteral("A")
        },
        b: {
          buckets: {
            B: [S.struct({ b: S.literal("B"), d: S.number })]
          },
          ast: AST.createLiteral("B")
        }
      },
      otherwise: []
    })

    // should handle multiple tags
    expect(
      P._getSearchTree([
        S.struct({ category: S.literal("catA"), tag: S.literal("a") }),
        S.struct({ category: S.literal("catA"), tag: S.literal("b") }),
        S.struct({ category: S.literal("catA"), tag: S.literal("c") })
      ], "decoder")
    ).toEqual({
      keys: {
        category: {
          buckets: {
            catA: [S.struct({ category: S.literal("catA"), tag: S.literal("a") })]
          },
          ast: AST.createLiteral("catA")
        },
        tag: {
          buckets: {
            b: [S.struct({ category: S.literal("catA"), tag: S.literal("b") })],
            c: [S.struct({ category: S.literal("catA"), tag: S.literal("c") })]
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
  const schemas = types.map(S.make)
  expect(
    P._getSearchTree(schemas, "decoder")
  ).toEqual({
    keys: {
      type: {
        buckets: {
          a: [S.struct({ type: S.literal("a"), value: S.string })],
          b: [S.struct({ type: S.literal("b"), value: S.string })],
          c: [S.struct({ type: S.literal("c"), value: S.string })],
          null: [S.struct({ type: S.literal(null), value: S.string })]
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
      S.struct({ type: S.string, value: S.string }),
      S.struct({ type: S.undefined, value: S.string }),
      S.struct({ type: S.literal("d", "e"), value: S.string }),
      S.struct({ type: S.struct({ nested: S.string }), value: S.string }),
      S.struct({ type: S.array(S.number), value: S.string })
    ]
  })
})
