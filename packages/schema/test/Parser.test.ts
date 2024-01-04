import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

describe("Parser", () => {
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

  it("getLiterals", () => {
    expect(P.getLiterals(S.string.ast, true)).toEqual([])
    // TypeLiteral
    expect(P.getLiterals(S.struct({ _tag: S.literal("a") }).ast, true))
      .toEqual([["_tag", AST.createLiteral("a")]])
    // Refinement
    expect(
      P.getLiterals(
        S.struct({ _tag: S.literal("a") }).pipe(
          S.filter(() => true)
        ).ast,
        true
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])
    // declare
    expect(
      P.getLiterals(
        S.declare(
          [],
          S.struct({ _tag: S.literal("a") }),
          () => P.parse(S.struct({ _tag: S.literal("a") }))
        ).ast,
        true
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])

    // Transform
    expect(
      P.getLiterals(
        S.struct({ radius: S.number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
        true
      )
    ).toEqual([])
    // Transform encode
    expect(
      P.getLiterals(
        S.struct({ radius: S.number }).pipe(S.attachPropertySignature("kind", "circle")).ast,
        false
      )
    ).toEqual([["kind", AST.createLiteral("circle")]])
    // property Transform encode
    expect(
      P.getLiterals(
        S.struct({
          _tag: S.transform(
            S.literal("a"),
            S.literal("b"),
            () => "b" as const,
            () => "a" as const
          )
        })
          .ast,
        false
      )
    ).toEqual([["_tag", AST.createLiteral("b")]])
  })

  it("getSearchTree", () => {
    expect(P.getSearchTree([S.string.ast, S.number.ast], true)).toEqual({
      keys: {},
      otherwise: [S.string.ast, S.number.ast]
    })

    expect(P.getSearchTree([S.struct({ _tag: S.literal("a") }).ast, S.number.ast], true)).toEqual(
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
      P.getSearchTree([
        S.struct({ _tag: S.literal("a") }).ast,
        S.struct({ _tag: S.literal("b") }).ast
      ], true)
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
      P.getSearchTree([
        S.struct({ a: S.literal("A"), c: S.string }).ast,
        S.struct({ b: S.literal("B"), d: S.number }).ast
      ], true)
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
      P.getSearchTree([
        S.struct({ category: S.literal("catA"), tag: S.literal("a") }).ast,
        S.struct({ category: S.literal("catA"), tag: S.literal("b") }).ast,
        S.struct({ category: S.literal("catA"), tag: S.literal("c") }).ast
      ], true)
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

  it("getSearchTree", () => {
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
      P.getSearchTree(types, true)
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
})
