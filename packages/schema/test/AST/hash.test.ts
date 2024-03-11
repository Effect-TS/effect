import * as S from "@effect/schema/Schema"
import { describe, expect, it } from "vitest"

const expectToString = <A, I, R>(schema: S.Schema<A, I, R>, expected: string) => {
  const actual = JSON.stringify(schema.ast.toJSON(), null, 2)
  expect(actual).toBe(expected)
}

const expectHash = <A, I, R>(schema: S.Schema<A, I, R>, n: number) => {
  expect(S.hash(schema)).toBe(n)
  expect(S.hash(schema)).toBe(n)
}

describe("AST > .toString()", () => {
  it("string", () => {
    const schema = S.string
    expectToString(
      schema,
      `{
  "_tag": "StringKeyword",
  "annotations": {
    "Symbol(@effect/schema/annotation/Title)": "string",
    "Symbol(@effect/schema/annotation/Description)": "a string"
  }
}`
    )
  })

  it("string with annotations", () => {
    const schema1 = S.string.pipe(S.identifier("I"), S.title("T"))
    const schema2 = S.string.pipe(S.title("T"), S.identifier("I"))
    expect(S.hash(schema1)).toStrictEqual(S.hash(schema2))
  })

  it("refinement", () => {
    const schema = S.string.pipe(S.filter((s) => s.length > 0))
    expectToString(
      schema,
      `{
  "_tag": "Refinement",
  "from": {
    "_tag": "StringKeyword",
    "annotations": {
      "Symbol(@effect/schema/annotation/Title)": "string",
      "Symbol(@effect/schema/annotation/Description)": "a string"
    }
  },
  "annotations": {}
}`
    )
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string
    })
    expectToString(
      schema,
      `{
  "_tag": "TypeLiteral",
  "propertySignatures": [
    {
      "name": "a",
      "type": {
        "_tag": "StringKeyword",
        "annotations": {
          "Symbol(@effect/schema/annotation/Title)": "string",
          "Symbol(@effect/schema/annotation/Description)": "a string"
        }
      },
      "isOptional": false,
      "isReadonly": true,
      "annotations": {}
    }
  ],
  "indexSignatures": [],
  "annotations": {}
}`
    )
  })

  describe("suspend", () => {
    it("outer", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.tuple(S.number, S.union(schema, S.literal(null)))
      )
      expectToString(
        schema,
        `{
  "_tag": "Suspend",
  "ast": {
    "_tag": "TupleType",
    "elements": [
      {
        "type": {
          "_tag": "NumberKeyword",
          "annotations": {
            "Symbol(@effect/schema/annotation/Title)": "number",
            "Symbol(@effect/schema/annotation/Description)": "a number"
          }
        },
        "isOptional": false
      },
      {
        "type": {
          "_tag": "Union",
          "types": [
            {
              "_tag": "Suspend"
            },
            {
              "_tag": "Literal",
              "literal": null,
              "annotations": {}
            }
          ],
          "annotations": {}
        },
        "isOptional": false
      }
    ],
    "rest": [],
    "isReadonly": true,
    "annotations": {}
  },
  "annotations": {}
}`
      )
    })
  })

  it("inner/outer", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.tuple(
      S.number,
      S.union(S.suspend(() => schema), S.literal(null))
    )

    expectToString(
      schema,
      `{
  "_tag": "TupleType",
  "elements": [
    {
      "type": {
        "_tag": "NumberKeyword",
        "annotations": {
          "Symbol(@effect/schema/annotation/Title)": "number",
          "Symbol(@effect/schema/annotation/Description)": "a number"
        }
      },
      "isOptional": false
    },
    {
      "type": {
        "_tag": "Union",
        "types": [
          {
            "_tag": "Suspend",
            "ast": {
              "_tag": "TupleType",
              "elements": [
                {
                  "type": {
                    "_tag": "NumberKeyword",
                    "annotations": {
                      "Symbol(@effect/schema/annotation/Title)": "number",
                      "Symbol(@effect/schema/annotation/Description)": "a number"
                    }
                  },
                  "isOptional": false
                },
                {
                  "type": {
                    "_tag": "Union",
                    "types": [
                      {
                        "_tag": "Suspend"
                      },
                      {
                        "_tag": "Literal",
                        "literal": null,
                        "annotations": {}
                      }
                    ],
                    "annotations": {}
                  },
                  "isOptional": false
                }
              ],
              "rest": [],
              "isReadonly": true,
              "annotations": {}
            },
            "annotations": {}
          },
          {
            "_tag": "Literal",
            "literal": null,
            "annotations": {}
          }
        ],
        "annotations": {}
      },
      "isOptional": false
    }
  ],
  "rest": [],
  "isReadonly": true,
  "annotations": {}
}`
    )
  })

  it("inner/inner", () => {
    type A = readonly [number, A | null]
    const schema: S.Schema<A> = S.tuple(
      S.number,
      S.union(
        S.suspend(() => schema),
        S.literal(null)
      )
    )

    expectToString(
      schema,
      `{
  "_tag": "TupleType",
  "elements": [
    {
      "type": {
        "_tag": "NumberKeyword",
        "annotations": {
          "Symbol(@effect/schema/annotation/Title)": "number",
          "Symbol(@effect/schema/annotation/Description)": "a number"
        }
      },
      "isOptional": false
    },
    {
      "type": {
        "_tag": "Union",
        "types": [
          {
            "_tag": "Suspend",
            "ast": {
              "_tag": "TupleType",
              "elements": [
                {
                  "type": {
                    "_tag": "NumberKeyword",
                    "annotations": {
                      "Symbol(@effect/schema/annotation/Title)": "number",
                      "Symbol(@effect/schema/annotation/Description)": "a number"
                    }
                  },
                  "isOptional": false
                },
                {
                  "type": {
                    "_tag": "Union",
                    "types": [
                      {
                        "_tag": "Suspend"
                      },
                      {
                        "_tag": "Literal",
                        "literal": null,
                        "annotations": {}
                      }
                    ],
                    "annotations": {}
                  },
                  "isOptional": false
                }
              ],
              "rest": [],
              "isReadonly": true,
              "annotations": {}
            },
            "annotations": {}
          },
          {
            "_tag": "Literal",
            "literal": null,
            "annotations": {}
          }
        ],
        "annotations": {}
      },
      "isOptional": false
    }
  ],
  "rest": [],
  "isReadonly": true,
  "annotations": {}
}`
    )
  })
})

describe("AST > hash", () => {
  it("string", () => {
    const schema = S.string
    expectHash(schema, -806008681)
  })

  it("refinement", () => {
    const schema = S.string.pipe(S.filter((s) => s.length > 0))
    expectHash(schema, 809682243)
  })

  it("struct", () => {
    const schema = S.struct({
      a: S.string
    })
    expectHash(schema, 799162257)
  })

  describe("suspend", () => {
    it("outer", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.tuple(S.number, S.union(schema, S.literal(null)))
      )
      expectHash(schema, -887784700)
    })

    it("inner/outer", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.tuple(
        S.number,
        S.union(S.suspend(() => schema), S.literal(null))
      )

      expectHash(schema, 757654673)
    })

    it("inner/inner", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.tuple(
        S.number,
        S.union(
          S.suspend(() => schema),
          S.literal(null)
        )
      )

      expectHash(schema, 757654673)
    })
  })
})
