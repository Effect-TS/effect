import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Effect from "effect/Effect"
import * as E from "effect/Either"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Parser", () => {
  it("asserts", () => {
    const schema = S.string
    expect(P.asserts(schema)("a")).toEqual(undefined)
    expect(() => P.asserts(schema)(1)).toThrow(
      new Error(`error(s) found
└─ Expected string, actual 1`)
    )
  })

  it("parseSync", () => {
    const schema = S.NumberFromString
    expect(P.parseSync(schema)("1")).toEqual(1)
    expect(() => P.parseSync(schema)("a")).toThrow(
      new Error(`error(s) found
└─ Expected string <-> number, actual "a"`)
    )
  })

  it("parseOption", () => {
    const schema = S.NumberFromString
    expect(P.parseOption(schema)("1")).toEqual(O.some(1))
    expect(P.parseOption(schema)("a")).toEqual(O.none())
  })

  it("parseEither", () => {
    const schema = S.NumberFromString
    expect(P.parseEither(schema)("1")).toEqual(E.right(1))
    expect(P.parseEither(schema)("a")).toEqual(E.left(PR.parseError([PR.type(schema.ast, "a")])))
  })

  it("parsePromise", async () => {
    const schema = S.NumberFromString
    await Util.resolves(P.parsePromise(schema)("1"), 1)
    await Util.rejects(P.parsePromise(schema)("a"))
  })

  it("parse", async () => {
    const schema = S.NumberFromString
    expect(await Effect.runPromise(Effect.either(P.parse(schema)("1")))).toEqual(
      E.right(1)
    )
    expect(await Effect.runPromise(Effect.either(P.parse(schema)("a")))).toEqual(
      E.left(PR.parseError([PR.type(schema.ast, "a")]))
    )
  })

  it("decode", () => {
    const schema = S.NumberFromString
    expect(P.decodeSync(schema)("1")).toEqual(1)
    expect(() => P.decodeSync(schema)("a")).toThrow(
      new Error(`error(s) found
└─ Expected string <-> number, actual "a"`)
    )
  })

  it("decodeOption", () => {
    const schema = S.NumberFromString
    expect(P.decodeOption(schema)("1")).toEqual(O.some(1))
    expect(P.decodeOption(schema)("a")).toEqual(O.none())
  })

  it("decodeEither", () => {
    const schema = S.NumberFromString
    expect(P.decodeEither(schema)("1")).toEqual(E.right(1))
    expect(P.decodeEither(schema)("a")).toEqual(E.left(PR.parseError([PR.type(schema.ast, "a")])))
  })

  it("decodePromise", async () => {
    const schema = S.NumberFromString
    await Util.resolves(P.decodePromise(schema)("1"), 1)
    await Util.rejects(P.decodePromise(schema)("a"))
  })

  it("decode", async () => {
    const schema = S.NumberFromString
    expect(await Effect.runPromise(Effect.either(P.decode(schema)("1")))).toEqual(E.right(1))
    expect(await Effect.runPromise(Effect.either(P.decode(schema)("a")))).toEqual(
      E.left(PR.parseError([PR.type(schema.ast, "a")]))
    )
  })

  it("validateSync", () => {
    const schema = S.NumberFromString
    expect(P.validateSync(schema)(1)).toEqual(1)
    expect(() => P.validateSync(schema)("1")).toThrow(
      new Error(`error(s) found
└─ Expected number, actual "1"`)
    )
  })

  it("validateOption", () => {
    const schema = S.NumberFromString
    expect(P.validateOption(schema)(1)).toEqual(O.some(1))
    expect(P.validateOption(schema)("1")).toEqual(O.none())
  })

  it("validateEither", () => {
    const schema = S.NumberFromString
    expect(P.validateEither(schema)(1)).toEqual(E.right(1))
    expect(P.validateEither(schema)("1")).toEqual(
      E.left(PR.parseError([PR.type(S.number.ast, "1")]))
    )
  })

  it("validatePromise", async () => {
    const schema = S.NumberFromString
    await Util.resolves(P.validatePromise(schema)(1), 1)
    await Util.rejects(P.validatePromise(schema)("1"))
    await Util.rejects(P.validatePromise(schema)("a"))
  })

  it("validate", async () => {
    const schema = S.NumberFromString
    expect(await Effect.runPromise(Effect.either(P.validate(schema)(1)))).toEqual(E.right(1))
    expect(await Effect.runPromise(Effect.either(P.validate(schema)("1")))).toEqual(
      E.left(PR.parseError([PR.type(S.number.ast, "1")]))
    )
  })

  it("encodeEither", () => {
    const schema = S.NumberFromString
    expect(P.encodeEither(schema)(1)).toEqual(E.right("1"))
    expect(
      P.encodeEither(
        S.union(
          S.transform(
            S.struct({ _tag: S.literal("a") }),
            S.struct({ _tag: S.literal("b") }),
            () => ({ _tag: "b" as const }),
            () => ({ _tag: "a" as const })
          ),
          S.struct({ _tag: S.literal("c") })
        )
      )({ _tag: "b" })
    ).toEqual(E.right({ _tag: "a" }))
    expect(
      P.encodeEither(
        S.union(
          S.struct({
            _tag: S.transform(
              S.literal("a"),
              S.literal("b"),
              () => "b" as const,
              () => "a" as const
            )
          }),
          S.struct({ _tag: S.literal("c") })
        )
      )({ _tag: "b" })
    ).toEqual(E.right({ _tag: "a" }))
  })

  it("encodePromise", async () => {
    const schema = S.NumberFromString
    await Util.resolves(P.encodePromise(schema)(1), "1")
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
