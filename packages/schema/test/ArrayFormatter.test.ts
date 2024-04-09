import * as ArrayFormatter from "@effect/schema/ArrayFormatter"
import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

const options: ParseOptions = { errors: "all", onExcessProperty: "error" }

const expectIssues = <A, I>(schema: S.Schema<A, I>, input: unknown, issues: Array<ArrayFormatter.Issue>) => {
  const result = S.decodeUnknownEither(schema)(input, options).pipe(
    Either.mapLeft((e) =>
      ArrayFormatter.formatIssueSync(e.error).map((issue) => ({ ...issue, message: String(issue.message) }))
    )
  )
  expect(result).toStrictEqual(Either.left(issues))
}

describe("ArrayFormatter", () => {
  describe("defaults", () => {
    it("declaration", () => {
      const schema = S.OptionFromSelf(S.Number)
      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "Expected Option<number>, actual null"
      }])
      expectIssues(schema, Option.some("a"), [{
        _tag: "Type",
        path: [],
        message: `Expected a number, actual "a"`
      }])
    })

    it("Type", () => {
      const schema = S.String
      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("Type with custom message", () => {
      const schema = S.String.pipe(
        S.transformOrFail(
          S.String,
          {
            decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s, "my custom message")),
            encode: ParseResult.succeed
          }
        )
      )
      expectIssues(schema, "", [{
        _tag: "Type",
        path: [],
        message: "my custom message"
      }])
    })

    it("Key", () => {
      const schema = S.Struct({ a: S.String })
      expectIssues(schema, { a: null }, [{
        _tag: "Type",
        path: ["a"],
        message: "Expected a string, actual null"
      }])
    })

    it("Index", () => {
      const schema = S.Tuple(S.String)
      expectIssues(schema, [null], [{
        _tag: "Type",
        path: [0],
        message: "Expected a string, actual null"
      }])
    })

    it("Unexpected (struct)", () => {
      const schema = S.Struct({ a: S.String })
      expectIssues(schema, { a: "a", b: 1 }, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected "a"`
      }])
    })

    it("Unexpected (tuple)", () => {
      const schema = S.Tuple(S.String)
      expectIssues(schema, ["a", 1], [{
        _tag: "Unexpected",
        path: [1],
        message: "is unexpected, expected 0"
      }])
    })

    it("Missing (struct)", () => {
      const schema = S.Struct({ a: S.String })
      expectIssues(schema, {}, [{
        _tag: "Missing",
        path: ["a"],
        message: "is missing"
      }])
    })

    it("Missing (tuple)", () => {
      const schema = S.Tuple(S.String)
      expectIssues(schema, [], [{
        _tag: "Missing",
        path: [0],
        message: "is missing"
      }])
    })

    it("Member", () => {
      const schema = S.Union(S.String, S.Number)
      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected a number, actual null"
      }])
    })

    it("Forbidden", () => {
      const schema = Util.AsyncString
      expectIssues(schema, "", [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("real world example", () => {
      const Name = S.Trim.pipe(
        S.minLength(2, { message: () => "We expect a name of at least 2 characters" }),
        S.maxLength(100, { message: () => "We expect a name with a maximum of 100 characters" })
      )
      const schema = S.Struct({
        name: Name,
        age: S.Number,
        tags: S.Array(S.String)
      })
      expectIssues(schema, { name: "", tags: ["b", null], a: 1 }, [
        {
          _tag: "Unexpected",
          path: ["a"],
          message: `is unexpected, expected "age" | "name" | "tags"`
        },
        {
          _tag: "Missing",
          path: ["age"],
          message: "is missing"
        },
        {
          _tag: "Refinement",
          path: ["name"],
          message: "We expect a name of at least 2 characters"
        },
        {
          _tag: "Type",
          path: ["tags", 1],
          message: "Expected a string, actual null"
        }
      ])
    })
  })

  describe("messages", () => {
    it("declaration", () => {
      const schema = S.OptionFromSelf(S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Declaration",
        path: [],
        message: "my custom message null"
      }])
    })

    it("literal", () => {
      const schema = S.Literal("a").annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("uniqueSymbolFromSelf", () => {
      const schema = S.UniqueSymbolFromSelf(Symbol.for("@effect/schema/test/a")).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("string", () => {
      const schema = S.String.annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("enums", () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.Enums(Fruits).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("templateLiteral", () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    describe("refinement", () => {
      it("top level message", () => {
        const schema = S.String.pipe(
          S.minLength(1)
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        expectIssues(schema, null, [{
          _tag: "Refinement",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, "", [{
          _tag: "Refinement",
          path: [],
          message: `my custom message ""`
        }])
      })

      it("inner messages", () => {
        const schema = S.String.pipe(
          S.minLength(1, {
            message: (issue) => `minLength custom message ${JSON.stringify(issue.actual)}`
          }),
          S.maxLength(3, {
            message: (issue) => `maxLength custom message ${JSON.stringify(issue.actual)}`
          })
        )

        expectIssues(schema, null, [{
          _tag: "Refinement",
          path: [],
          message: "minLength custom message null"
        }])
        expectIssues(schema, "", [{
          _tag: "Refinement",
          path: [],
          message: `minLength custom message ""`
        }])
        expectIssues(schema, "aaaa", [{
          _tag: "Refinement",
          path: [],
          message: `maxLength custom message "aaaa"`
        }])
      })
    })

    it("tuple", () => {
      const schema = S.Tuple(S.String, S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
      expectIssues(schema, [1, 2], [{
        _tag: "TupleType",
        path: [],
        message: "my custom message [1,2]"
      }])
    })

    it("struct", () => {
      const schema = S.Struct({
        a: S.String,
        b: S.String
      }).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
      expectIssues(schema, { a: 1, b: 2 }, [{
        _tag: "TypeLiteral",
        path: [],
        message: `my custom message {"a":1,"b":2}`
      }])
    })

    it("union", () => {
      const schema = S.Union(S.String, S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      expectIssues(schema, null, [{
        _tag: "Union",
        path: [],
        message: "my custom message null"
      }])
    })

    describe("transformation", () => {
      it("top level message", () => {
        const schema = S.NumberFromString.annotations({
          message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
        })

        expectIssues(schema, null, [{
          _tag: "Transformation",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, "a", [{
          _tag: "Transformation",
          path: [],
          message: `my custom message "a"`
        }])
      })

      it("inner messages", () => {
        const schema = S.transformOrFail(
          S.String.annotations({ message: () => "please enter a string" }),
          S.Int.annotations({ message: () => "please enter an integer" }),
          {
            decode: (s, _, ast) => {
              const n = Number(s)
              return Number.isNaN(n)
                ? ParseResult.fail(new ParseResult.Type(ast, s))
                : ParseResult.succeed(n)
            },
            encode: (n) => ParseResult.succeed(String(n))
          }
        ).annotations({
          identifier: "IntFromString",
          message: () => "please enter a decodeUnknownable string"
        })

        expectIssues(schema, null, [{
          _tag: "Transformation",
          path: [],
          message: "please enter a string"
        }])
        expectIssues(schema, "1.2", [{
          _tag: "Transformation",
          path: [],
          message: "please enter an integer"
        }])
        expectIssues(schema, "a", [{
          _tag: "Transformation",
          path: [],
          message: "please enter a decodeUnknownable string"
        }])
      })
    })

    describe("suspend", () => {
      it("outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Suspend( // intended outer suspend
          () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "TupleType",
          path: [],
          message: "my custom message [1,null]"
        }])
      })

      it("inner/outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(S.Suspend(() => schema), S.Literal(null))
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "TupleType",
          path: [],
          message: "my custom message [1,null]"
        }])
      })

      it("inner/inner", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(
            S.Suspend(() => schema).annotations({
              message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
            }),
            S.Literal(null)
          )
        )

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "Expected readonly [number, <suspended schema> | null], actual null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "Type",
          path: [1],
          message: "my custom message undefined"
        }, {
          _tag: "Type",
          path: [1],
          message: "Expected null, actual undefined"
        }])
      })

      it("inner/inner/inner", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(
            S.Suspend(() =>
              schema.annotations({
                message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
              })
            ),
            S.Literal(null)
          )
        )

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "Expected readonly [number, <suspended schema> | null], actual null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "Type",
          path: [1],
          message: "my custom message undefined"
        }, {
          _tag: "Type",
          path: [1],
          message: "Expected null, actual undefined"
        }])
      })
    })
  })
})
