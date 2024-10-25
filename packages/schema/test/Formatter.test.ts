import * as ArrayFormatter from "@effect/schema/ArrayFormatter"
import type { ParseOptions } from "@effect/schema/AST"
import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

const options: ParseOptions = { errors: "all", onExcessProperty: "error" }

const expectIssues = <A, I>(schema: S.Schema<A, I>, input: unknown, issues: Array<ArrayFormatter.Issue>) => {
  const result = S.decodeUnknownEither(schema)(input, options).pipe(
    Either.mapLeft((e) => ArrayFormatter.formatIssueSync(e.issue))
  )
  expect(result).toStrictEqual(Either.left(issues))
}

describe("Formatter", () => {
  describe("Forbidden", () => {
    it("default message", () => {
      const schema = Util.effectify(S.String)
      const input = ""
      expect(() => S.decodeUnknownSync(schema)(input)).toThrow(
        new Error(
          `(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
        )
      )
      expectIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("default message with identifier", () => {
      const schema = Util.effectify(S.String).annotations({ identifier: "identifier" })
      const input = ""
      expect(() => S.decodeUnknownSync(schema)(input)).toThrow(
        new Error(
          `identifier
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
        )
      )
      expectIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("custom message (override=false)", () => {
      const schema = Util.effectify(S.String).annotations({ message: () => "custom message" })
      const input = ""
      expect(() => S.decodeUnknownSync(schema)(input)).toThrow(
        new Error(`(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`)
      )
      expectIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("custom message (override=true)", () => {
      const schema = Util.effectify(S.String).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = ""
      expect(() => S.decodeUnknownSync(schema)(input)).toThrow(
        new Error(`(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`)
      )
      expectIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })
  })

  describe("Missing", () => {
    it("default message", async () => {
      const schema = S.Struct({ a: S.String })
      const input = {}
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `{ readonly a: string }
└─ ["a"]
   └─ is missing`
      )
      expectIssues(schema, input, [{
        _tag: "Missing",
        path: ["a"],
        message: "is missing"
      }])
    })

    it("default message with parent identifier", async () => {
      const schema = S.Struct({ a: S.String }).annotations({ identifier: "identifier" })
      const input = {}
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ ["a"]
   └─ is missing`
      )
      expectIssues(schema, input, [{
        _tag: "Missing",
        path: ["a"],
        message: "is missing"
      }])
    })

    it("parent custom message with override=true", async () => {
      const schema = S.Struct({ a: S.String }).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = {}
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })

    describe("missing message", () => {
      it("Struct", async () => {
        const schema = S.Struct({
          a: S.propertySignature(S.String).annotations({
            description: "my description",
            missingMessage: () => "my missing message"
          })
        })
        const input = {}
        await Util.expectDecodeUnknownFailure(
          schema,
          input,
          `{ readonly a: string }
└─ ["a"]
   └─ my missing message`
        )
        expectIssues(schema, input, [{
          _tag: "Missing",
          path: ["a"],
          message: "my missing message"
        }])
      })

      describe("Tuple", () => {
        it("e", async () => {
          const schema = S.make(
            new AST.TupleType(
              [
                new AST.OptionalType(AST.stringKeyword, false, {
                  [AST.MissingMessageAnnotationId]: () => "my missing message"
                })
              ],
              [],
              true
            )
          )
          const input: Array<string> = []
          await Util.expectDecodeUnknownFailure(
            schema,
            input,
            `readonly [string]
└─ [0]
   └─ my missing message`
          )
          expectIssues(schema, input, [{
            _tag: "Missing",
            path: [0],
            message: "my missing message"
          }])
        })

        it("r + e", async () => {
          const schema = S.Tuple(
            [],
            S.String,
            S.element(S.String).annotations({ [AST.MissingMessageAnnotationId]: () => "my missing message" })
          )
          const input: Array<string> = []
          await Util.expectDecodeUnknownFailure(
            schema,
            input,
            `readonly [...string[], string]
└─ [0]
   └─ my missing message`
          )
          expectIssues(schema, input, [{
            _tag: "Missing",
            path: [0],
            message: "my missing message"
          }])
        })
      })
    })
  })

  describe("Unexpected", () => {
    it("default message", async () => {
      const schema = S.Struct({ a: S.String })
      const input = { a: "a", b: 1 }
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `{ readonly a: string }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected: "a"`
      }])
    })

    it("default message with parent identifier", async () => {
      const schema = S.Struct({ a: S.String }).annotations({ identifier: "identifier" })
      const input = { a: "a", b: 1 }
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected: "a"`
      }])
    })

    it("parent custom message with override=true", async () => {
      const schema = S.Struct({ a: S.String }).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = { a: "a", b: 1 }
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message",
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Declaration", () => {
    it("default message", async () => {
      const schema = S.OptionFromSelf(S.String)
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "Expected Option<string>, actual null"
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected Option<string>, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.OptionFromSelf(S.String).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "Expected identifier, actual null"
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected identifier, actual null"
      }])
    })

    it("custom message (override=false)", async () => {
      const schema = S.OptionFromSelf(S.String).annotations({ message: () => "custom message" })
      const input = Option.some(1)
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `Option<string>
└─ Expected string, actual 1`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual 1"
      }])
    })

    it("custom message (override=true)", async () => {
      const schema = S.OptionFromSelf(S.String).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = Option.some(1)
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("String", () => {
    it("default message", async () => {
      const schema = S.String
      const input = null
      await Util.expectDecodeUnknownFailure(schema, input, "Expected string, actual null")
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.String.annotations({ identifier: "ID" })
      const input = null
      await Util.expectDecodeUnknownFailure(schema, input, "Expected ID, actual null")
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected ID, actual null"
      }])
    })

    it("custom message", async () => {
      const schema = S.String.annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(schema, input, "custom message")
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Transformation", () => {
    it("default message", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
          strict: true,
          decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s)),
          encode: ParseResult.succeed
        }
      )
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `(string <-> string)
└─ Encoded side transformation failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
          strict: true,
          decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s)),
          encode: ParseResult.succeed
        }
      ).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ Encoded side transformation failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("default message with message field (kind=Transformation)", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
          strict: true,
          decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s, "message field")),
          encode: ParseResult.succeed
        }
      )
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `(string <-> string)
└─ Transformation process failure
   └─ message field`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "message field"
      }])
    })

    it("custom message (kind=From, override=false)", async () => {
      const schema = S.transform(
        S.String,
        S.String,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `(string <-> string)
└─ Encoded side transformation failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("custom message (kind=From, override=true)", async () => {
      const schema = S.transform(
        S.String,
        S.String,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message with inner custom message (kind=From, override=false)", async () => {
      const schema = S.transform(
        S.String.annotations({ message: () => "inner custom message" }),
        S.String,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "inner custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "inner custom message"
      }])
    })

    it("custom message with inner custom message (kind=From, override=true)", async () => {
      const schema = S.transform(
        S.String.annotations({ message: () => "inner custom message" }),
        S.String,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (kind=To, override=false)", async () => {
      const schema = S.transform(
        S.String,
        S.NonEmptyString,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `(string <-> NonEmptyString)
└─ Type side transformation failure
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected NonEmptyString, actual ""`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected NonEmptyString, actual ""`
      }])
    })

    it("custom message (kind=To, override=true)", async () => {
      const schema = S.transform(
        S.String,
        S.NonEmptyString,
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message with inner custom message (kind=To, override=false)", async () => {
      const schema = S.transform(
        S.String,
        S.NonEmptyString.annotations({ message: () => "inner custom message" }),
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "inner custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "inner custom message"
      }])
    })

    it("custom message with inner custom message (kind=To, override=true)", async () => {
      const schema = S.transform(
        S.String,
        S.NonEmptyString.annotations({ message: () => "inner custom message" }),
        {
          strict: true,
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (kind=Transformation, override=false)", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
          strict: true,
          decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s, "message field")),
          encode: ParseResult.succeed
        }
      ).annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (kind=Transformation, override=true)", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
          strict: true,
          decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s, "message field")),
          encode: ParseResult.succeed
        }
      ).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Transformation",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Refinement", () => {
    it("default message (kind=From)", async () => {
      const schema = S.String.pipe(S.minLength(1))
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `a string at least 1 character(s) long
└─ From side refinement failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("default message with identifier (kind=From)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ From side refinement failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("default message (kind=Predicate)", async () => {
      const schema = S.String.pipe(S.minLength(1))
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `a string at least 1 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected a string at least 1 character(s) long, actual ""`
      }])
    })

    it("default message with identifier (kind=Predicate)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({ identifier: "identifier" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ Predicate refinement failure
   └─ Expected identifier, actual ""`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected identifier, actual ""`
      }])
    })

    it("custom message (kind=From, override=false)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `a string at least 1 character(s) long
└─ From side refinement failure
   └─ Expected string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }])
    })

    it("custom message (kind=From, override=true)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Refinement",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (kind=Predicate, override=false)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Refinement",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (kind=Predicate, override=true)", async () => {
      const schema = S.String.pipe(S.minLength(1)).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Refinement",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message with inner custom message (kind=From, override=false)", async () => {
      const schema = S.String.pipe(S.minLength(1, { message: () => "inner custom message" }), S.maxLength(2))
        .annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "inner custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Refinement",
        path: [],
        message: "inner custom message"
      }])
    })

    it("custom message with inner custom message (kind=From, override=true)", async () => {
      const schema = S.String.pipe(S.minLength(1, { message: () => "inner custom message" }), S.maxLength(2))
        .annotations({ message: () => ({ message: "custom message", override: true }) })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Refinement",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Suspend", () => {
    it("outer", async () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
      )

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number, <suspended schema> | null], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, undefined],
        `readonly [number, <suspended schema> | null]
└─ [1]
   └─ <suspended schema> | null
      ├─ Expected readonly [number, <suspended schema> | null], actual undefined
      └─ Expected null, actual undefined`
      )
    })

    it("inner", async () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.Tuple(
        S.Number,
        S.Union(S.suspend(() => schema), S.Literal(null))
      )

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number, <suspended schema> | null], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, undefined],
        `readonly [number, <suspended schema> | null]
└─ [1]
   └─ <suspended schema> | null
      ├─ Expected readonly [number, <suspended schema> | null], actual undefined
      └─ Expected null, actual undefined`
      )
    })
  })

  describe("Union", () => {
    it("default message", async () => {
      const schema = S.Union(S.String, S.Number)
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `string | number
├─ Expected string, actual null
└─ Expected number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected number, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.Union(S.String, S.Number).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
├─ Expected string, actual null
└─ Expected number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected number, actual null"
      }])
    })

    it("parent custom message with override=false", async () => {
      const schema = S.Union(S.String, S.Number).annotations({
        message: () => "custom message"
      })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `string | number
├─ Expected string, actual null
└─ Expected number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected number, actual null"
      }])
    })

    it("parent custom message with override=true", async () => {
      const schema = S.Union(S.String, S.Number).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Tuple", () => {
    it("parent custom message with override=false", async () => {
      const schema = S.Tuple(S.String).annotations({ message: () => "custom message" })
      const input1 = [1]
      await Util.expectDecodeUnknownFailure(
        schema,
        input1,
        `readonly [string]
└─ [0]
   └─ Expected string, actual 1`
      )
      expectIssues(schema, input1, [{
        _tag: "Type",
        path: [0],
        message: "Expected string, actual 1"
      }])
    })

    it("parent custom message with override=true", async () => {
      const schema = S.Tuple(S.String).annotations({ message: () => ({ message: "custom message", override: true }) })
      const input1 = [1]
      await Util.expectDecodeUnknownFailure(
        schema,
        input1,
        "custom message"
      )
      expectIssues(schema, input1, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Struct", () => {
    it("parent custom message with override=false", async () => {
      const schema = S.Struct({
        as: pipe(
          S.Array(
            S.Struct({
              b: pipe(
                S.String.annotations({ message: () => "type" }),
                S.minLength(1, { message: () => "minLength" }),
                S.maxLength(2, { message: () => "maxLength" })
              )
            })
          ).annotations({ identifier: "C" }),
          S.minItems(1, { message: () => "minItems" })
        ).annotations({ identifier: "B" })
      }).annotations({ identifier: "A", message: () => "custom message" })
      const input1 = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input1,
        "custom message"
      )
      expectIssues(schema, input1, [{
        _tag: "Type",
        path: [],
        message: "custom message"
      }])

      const input2 = { as: [] }
      await Util.expectDecodeUnknownFailure(
        schema,
        input2,
        `A
└─ ["as"]
   └─ minItems`
      )
      expectIssues(schema, input2, [{
        _tag: "Refinement",
        path: ["as"],
        message: "minItems"
      }])

      const input3 = { as: [{ b: null }] }
      await Util.expectDecodeUnknownFailure(
        schema,
        input3,
        `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: a string at most 2 character(s) long }
                  └─ ["b"]
                     └─ type`
      )
      expectIssues(schema, input3, [{
        _tag: "Refinement",
        path: ["as", 0, "b"],
        message: "type"
      }])

      const input4 = { as: [{ b: "" }] }
      await Util.expectDecodeUnknownFailure(
        schema,
        input4,
        `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: a string at most 2 character(s) long }
                  └─ ["b"]
                     └─ minLength`
      )
      expectIssues(schema, input4, [{
        _tag: "Refinement",
        path: ["as", 0, "b"],
        message: "minLength"
      }])

      const input5 = { as: [{ b: "---" }] }
      await Util.expectDecodeUnknownFailure(
        schema,
        input5,
        `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: a string at most 2 character(s) long }
                  └─ ["b"]
                     └─ maxLength`
      )
      expectIssues(schema, input5, [{
        _tag: "Refinement",
        path: ["as", 0, "b"],
        message: "maxLength"
      }])
    })

    it("parent custom message with override=true", async () => {
      const schema = S.Struct({
        as: pipe(
          S.Array(
            S.Struct({
              b: pipe(
                S.String.annotations({ message: () => "type" }),
                S.minLength(1, { message: () => "minLength" }),
                S.maxLength(2, { message: () => "maxLength" })
              )
            })
          ).annotations({ identifier: "C" }),
          S.minItems(1, { message: () => "minItems" })
        ).annotations({ identifier: "B" })
      }).annotations({ identifier: "A", message: () => ({ message: "custom message", override: true }) })
      const input1 = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input1,
        "custom message"
      )
      expectIssues(schema, input1, [{
        _tag: "Type",
        path: [],
        message: "custom message"
      }])
      const input2 = { as: [] }
      await Util.expectDecodeUnknownFailure(
        schema,
        input2,
        "custom message"
      )
      expectIssues(schema, input2, [{
        _tag: "Composite",
        path: [],
        message: "custom message"
      }])
    })
  })
})

describe("handle identifiers", () => {
  it("Struct", async () => {
    const schema = S.Struct({
      a: S.String.annotations({ identifier: "MyString1" }),
      b: S.String.annotations({ identifier: "MyString2" })
    }).annotations({ identifier: "MySchema" })

    await Util.expectDecodeUnknownFailure(
      schema,
      { a: 1, b: 2 },
      `MySchema
├─ ["a"]
│  └─ Expected MyString1, actual 1
└─ ["b"]
   └─ Expected MyString2, actual 2`,
      Util.allErrors
    )
  })

  describe("Suspend", () => {
    it("outer", async () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
      ).annotations({ identifier: "A" })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected A, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, undefined],
        `A
└─ [1]
   └─ A | null
      ├─ Expected A, actual undefined
      └─ Expected null, actual undefined`
      )
    })

    it("inner/outer", async () => {
      type A = readonly [number, A | null]
      const schema = S.Tuple(
        S.Number,
        S.Union(S.suspend((): S.Schema<A> => schema), S.Literal(null))
      ).annotations({ identifier: "A" })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected A, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, undefined],
        `A
└─ [1]
   └─ A | null
      ├─ Expected A, actual undefined
      └─ Expected null, actual undefined`
      )
    })

    it("inner/inner", async () => {
      type A = readonly [number, A | null]
      const schema = S.Tuple(
        S.Number,
        S.Union(S.suspend((): S.Schema<A> => schema).annotations({ identifier: "A" }), S.Literal(null))
      )

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected readonly [number, A | null], actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, undefined],
        `readonly [number, A | null]
└─ [1]
   └─ A | null
      ├─ Expected A, actual undefined
      └─ Expected null, actual undefined`
      )
    })
  })
})

it("Effect as message", () => {
  const translations = {
    it: "Nome non valido",
    en: "Invalid name"
  }

  class Translator extends Context.Tag("Translator")<Translator, {
    locale: keyof typeof translations
    translations: typeof translations
  }>() {}

  const Name = S.NonEmptyString.annotations({
    message: () =>
      Effect.gen(function*(_) {
        const service = yield* _(Effect.serviceOption(Translator))
        return Option.match(service, {
          onNone: () => "Invalid string",
          onSome: (translator) => translator.translations[translator.locale]
        })
      })
  })

  const result = S.decodeUnknownEither(Name)("")

  // no service
  expect(Either.mapLeft(result, (error) => Effect.runSync(TreeFormatter.formatError(error))))
    .toStrictEqual(Either.left("Invalid string"))

  // it locale
  expect(
    Either.mapLeft(
      result,
      (error) =>
        Effect.runSync(
          TreeFormatter.formatError(error).pipe(Effect.provideService(Translator, {
            locale: "it",
            translations
          }))
        )
    )
  ).toStrictEqual(Either.left("Nome non valido"))

  // en locale
  expect(
    Either.mapLeft(
      result,
      (error) =>
        Effect.runSync(
          TreeFormatter.formatError(error).pipe(Effect.provideService(Translator, {
            locale: "en",
            translations
          }))
        )
    )
  ).toStrictEqual(Either.left("Invalid name"))
})
