import * as E from "@effect/data/Either"
import * as O from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as AST from "@effect/schema/AST"
import * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"

describe.concurrent("Parser", () => {
  it("exports", () => {
    expect(S.parseResult).exist
    expect(S.decodeResult).exist
    expect(S.validateResult).exist
    expect(S.encodeResult).exist
  })

  it("asserts", () => {
    const schema = S.string
    expect(P.asserts(schema)("a")).toEqual(undefined)
    expect(() => P.asserts(schema)(1)).toThrowError(
      new Error(`error(s) found
└─ Expected string, actual 1`)
    )
  })

  it("parseSync", () => {
    const schema = S.NumberFromString
    expect(P.parseSync(schema)("1")).toEqual(1)
    expect(() => P.parseSync(schema)("a")).toThrowError(
      new Error(`error(s) found
└─ Expected string -> number, actual "a"`)
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
    await expect(P.parsePromise(schema)("1")).resolves.toEqual(1)
    await expect(P.parsePromise(schema)("a")).rejects.toThrow()
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
    expect(() => P.decodeSync(schema)("a")).toThrowError(
      new Error(`error(s) found
└─ Expected string -> number, actual "a"`)
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
    await expect(P.decodePromise(schema)("1")).resolves.toEqual(1)
    await expect(P.decodePromise(schema)("a")).rejects.toThrow()
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
    expect(() => P.validateSync(schema)("1")).toThrowError(
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

  it("validateResult", () => {
    const schema = S.NumberFromString
    expect(P.validateResult(schema)(1)).toEqual(E.right(1))
    expect(P.validateResult(schema)("1")).toEqual(
      E.left(PR.parseError([PR.type(S.number.ast, "1")]))
    )
  })

  it("validatePromise", async () => {
    const schema = S.NumberFromString
    await expect(P.validatePromise(schema)(1)).resolves.toEqual(1)
    await expect(P.validatePromise(schema)("1")).rejects.toThrow()
    await expect(P.validatePromise(schema)("a")).rejects.toThrow()
  })

  it("validate", async () => {
    const schema = S.NumberFromString
    expect(await Effect.runPromise(Effect.either(P.validate(schema)(1)))).toEqual(E.right(1))
    expect(await Effect.runPromise(Effect.either(P.validate(schema)("1")))).toEqual(
      E.left(PR.parseError([PR.type(S.number.ast, "1")]))
    )
  })

  it("encodeResult", () => {
    const schema = S.NumberFromString
    expect(P.encodeResult(schema)(1)).toEqual(E.right("1"))
  })

  it("encodeEither", () => {
    const schema = S.NumberFromString
    expect(P.encodeEither(schema)(1)).toEqual(E.right("1"))
  })

  it("encodePromise", async () => {
    const schema = S.NumberFromString
    await expect(P.encodePromise(schema)(1)).resolves.toEqual("1")
  })

  it("_getLiterals", () => {
    expect(P._getLiterals(S.string.ast)).toEqual([])
    // TypeLiteral
    expect(P._getLiterals(S.struct({ _tag: S.literal("a") }).ast))
      .toEqual([["_tag", AST.createLiteral("a")]])
    // Refinement
    expect(
      P._getLiterals(
        S.struct({ _tag: S.literal("a") }).pipe(
          S.filter(() => true)
        ).ast
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])
    // declare
    expect(
      P._getLiterals(
        S.declare(
          [],
          S.struct({ _tag: S.literal("a") }),
          () => P.parseResult(S.struct({ _tag: S.literal("a") }))
        ).ast
      )
    ).toEqual([["_tag", AST.createLiteral("a")]])

    // Transform
    expect(
      P._getLiterals(
        S.struct({ radius: S.number }).pipe(S.attachPropertySignature("kind", "circle")).ast
      )
    ).toEqual([])
    // simulate encoding
    const ast = P.reverse(
      S.struct({ radius: S.number }).pipe(
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
