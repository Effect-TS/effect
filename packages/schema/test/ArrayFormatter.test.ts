import * as _ from "@effect/schema/ArrayFormatter"
import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

const options: ParseOptions = { errors: "all", onExcessProperty: "error" }

const expectIssues = <A, I>(schema: S.Schema<A, I>, input: unknown, issues: Array<_.Issue>) => {
  const result = S.decodeUnknownEither(schema)(input, options).pipe(
    Either.mapLeft((e) => _.formatIssues([e.error]))
  )
  expect(result).toStrictEqual(Either.left(issues))
}

describe("ArrayFormatter", () => {
  describe("defaults", () => {
    it("declaration", () => {
      const schema = S.optionFromSelf(S.number)
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
      const schema = S.string
      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("Type with custom message", () => {
      const schema = S.string.pipe(
        S.transformOrFail(
          S.string,
          (s, _, ast) => ParseResult.fail(ParseResult.type(ast, s, "my custom message")),
          ParseResult.succeed
        )
      )
      expectIssues(schema, "", [{
        _tag: "Type",
        path: [],
        message: "my custom message"
      }])
    })

    it("Key", () => {
      const schema = S.struct({ a: S.string })
      expectIssues(schema, { a: null }, [{
        _tag: "Type",
        path: ["a"],
        message: "Expected a string, actual null"
      }])
    })

    it("Index", () => {
      const schema = S.tuple(S.string)
      expectIssues(schema, [null], [{
        _tag: "Type",
        path: [0],
        message: "Expected a string, actual null"
      }])
    })

    it("Unexpected (struct)", () => {
      const schema = S.struct({ a: S.string })
      expectIssues(schema, { a: "a", b: 1 }, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected "a"`
      }])
    })

    it("Unexpected (tuple)", () => {
      const schema = S.tuple(S.string)
      expectIssues(schema, ["a", 1], [{
        _tag: "Unexpected",
        path: [1],
        message: "is unexpected, expected 0"
      }])
    })

    it("Missing (struct)", () => {
      const schema = S.struct({ a: S.string })
      expectIssues(schema, {}, [{
        _tag: "Missing",
        path: ["a"],
        message: "is missing"
      }])
    })

    it("Missing (tuple)", () => {
      const schema = S.tuple(S.string)
      expectIssues(schema, [], [{
        _tag: "Missing",
        path: [0],
        message: "is missing"
      }])
    })

    it("Member", () => {
      const schema = S.union(S.string, S.number)
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
          `Fiber #7 cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("real world example", () => {
      const Name = S.Trim.pipe(
        S.minLength(2, { message: () => "We expect a name of at least 2 characters" }),
        S.maxLength(100, { message: () => "We expect a name with a maximum of 100 characters" })
      )
      const schema = S.struct({
        name: Name,
        age: S.number,
        tags: S.array(S.string)
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
      const schema = S.optionFromSelf(S.number).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Declaration",
        path: [],
        message: "my custom message null"
      }])
    })

    it("literal", () => {
      const schema = S.literal("a").pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("uniqueSymbol", () => {
      const schema = S.uniqueSymbol(Symbol.for("@effect/schema/test/a")).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("string", () => {
      const schema = S.string.pipe(S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`))

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
      const schema = S.enums(Fruits).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    it("templateLiteral", () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b")).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
    })

    describe("refinement", () => {
      it("top level message", () => {
        const schema = S.string.pipe(
          S.minLength(1),
          S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
        )

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
        const schema = S.string.pipe(
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
      const schema = S.tuple(S.string, S.number).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Type",
        path: [],
        message: "my custom message null"
      }])
      expectIssues(schema, [1, 2], [{
        _tag: "Tuple",
        path: [],
        message: "my custom message [1,2]"
      }])
    })

    it("struct", () => {
      const schema = S.struct({
        a: S.string,
        b: S.string
      }).pipe(S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`))

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
      const schema = S.union(S.string, S.number).pipe(
        S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
      )

      expectIssues(schema, null, [{
        _tag: "Union",
        path: [],
        message: "my custom message null"
      }])
    })

    describe("transformation", () => {
      it("top level message", () => {
        const schema = S.NumberFromString.pipe(
          S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
        )

        expectIssues(schema, null, [{
          _tag: "Transform",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, "a", [{
          _tag: "Transform",
          path: [],
          message: `my custom message "a"`
        }])
      })

      it("inner messages", () => {
        const schema = S.transformOrFail(
          S.string.pipe(S.message(() => "please enter a string")),
          S.Int.pipe(S.message(() => "please enter an integer")),
          (s, _, ast) => {
            const n = Number(s)
            return Number.isNaN(n)
              ? ParseResult.fail(ParseResult.type(ast, s))
              : ParseResult.succeed(n)
          },
          (n) => ParseResult.succeed(String(n))
        ).pipe(S.identifier("IntFromString"), S.message(() => "please enter a decodeUnknownable string"))

        expectIssues(schema, null, [{
          _tag: "Transform",
          path: [],
          message: "please enter a string"
        }])
        expectIssues(schema, "1.2", [{
          _tag: "Transform",
          path: [],
          message: "please enter an integer"
        }])
        expectIssues(schema, "a", [{
          _tag: "Transform",
          path: [],
          message: "please enter a decodeUnknownable string"
        }])
      })
    })

    describe("suspend", () => {
      it("outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.suspend( // intended outer suspend
          () => S.tuple(S.number, S.union(schema, S.literal(null)))
        ).pipe(S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`))

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "Tuple",
          path: [],
          message: "my custom message [1,null]"
        }])
      })

      it("inner/outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(S.suspend(() => schema), S.literal(null))
        ).pipe(S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`))

        expectIssues(schema, null, [{
          _tag: "Type",
          path: [],
          message: "my custom message null"
        }])
        expectIssues(schema, [1, undefined], [{
          _tag: "Tuple",
          path: [],
          message: "my custom message [1,null]"
        }])
      })

      it("inner/inner", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(
            S.suspend(() => schema).pipe(
              S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
            ),
            S.literal(null)
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
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(
            S.suspend(() =>
              schema.pipe(
                S.message((issue) => `my custom message ${JSON.stringify(issue.actual)}`)
              )
            ),
            S.literal(null)
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
