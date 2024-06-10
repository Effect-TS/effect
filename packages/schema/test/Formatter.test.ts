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

    it("default message with identifier", async () => {
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

    it("custom message (override=false)", async () => {
      const schema = S.Struct({ a: S.String }).annotations({ message: () => "custom message" })
      const input = {}
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "TypeLiteral",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (override=true)", async () => {
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
        _tag: "TypeLiteral",
        path: [],
        message: "custom message"
      }])
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
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected "a"`
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.Struct({ a: S.String }).annotations({ identifier: "identifier" })
      const input = { a: "a", b: 1 }
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Unexpected",
        path: ["b"],
        message: `is unexpected, expected "a"`
      }])
    })

    it("custom message (override=false)", async () => {
      const schema = S.Struct({ a: S.String }).annotations({ message: () => "custom message" })
      const input = { a: "a", b: 1 }
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message",
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "TypeLiteral",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (override=true)", async () => {
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
        _tag: "TypeLiteral",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("Declaration", () => {
    it("default message", async () => {
      const schema = S.instanceOf(File)
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "Expected an instance of File, actual null"
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected an instance of File, actual null`
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.instanceOf(File).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "Expected identifier (an instance of File), actual null"
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected identifier (an instance of File), actual null"
      }])
    })

    it("custom message (override=false)", async () => {
      const schema = S.instanceOf(File).annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message",
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Declaration",
        path: [],
        message: "custom message"
      }])
    })

    it("custom message (override=true)", async () => {
      const schema = S.instanceOf(File).annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message",
        Util.onExcessPropertyError
      )
      expectIssues(schema, input, [{
        _tag: "Declaration",
        path: [],
        message: "custom message"
      }])
    })
  })

  describe("String", () => {
    it("default message", async () => {
      const schema = S.String
      const input = null
      await Util.expectDecodeUnknownFailure(schema, input, "Expected a string, actual null")
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.String.annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(schema, input, "Expected identifier (a string), actual null")
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected identifier (a string), actual null"
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("default message with message field (kind=Transformation)", async () => {
      const schema = S.transformOrFail(
        S.String,
        S.String,
        {
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }])
    })

    it("custom message (kind=From, override=true)", async () => {
      const schema = S.transform(
        S.String,
        S.String,
        {
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
        S.NonEmpty,
        {
          decode: identity,
          encode: identity
        }
      ).annotations({ message: () => "custom message" })
      const input = ""
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `(string <-> NonEmpty)
└─ Type side transformation failure
   └─ NonEmpty
      └─ Predicate refinement failure
         └─ Expected NonEmpty (a non empty string), actual ""`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected NonEmpty (a non empty string), actual ""`
      }])
    })

    it("custom message (kind=To, override=true)", async () => {
      const schema = S.transform(
        S.String,
        S.NonEmpty,
        {
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
        S.NonEmpty.annotations({ message: () => "inner custom message" }),
        {
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
        S.NonEmpty.annotations({ message: () => "inner custom message" }),
        {
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
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
   └─ Expected identifier (a string at least 1 character(s) long), actual ""`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: `Expected identifier (a string at least 1 character(s) long), actual ""`
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
   └─ Expected a string, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
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

  describe("Struct", () => {
    it("custom message (override=false)", async () => {
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
      }).annotations({ identifier: "A" })
      const input1 = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input1,
        "Expected A, actual null"
      )
      expectIssues(schema, input1, [{
        _tag: "Type",
        path: [],
        message: "Expected A, actual null"
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
  })

  describe("Member", () => {
    it("default message", async () => {
      const schema = S.Union(S.String, S.Number)
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `string | number
├─ Union member
│  └─ Expected a string, actual null
└─ Union member
   └─ Expected a number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected a number, actual null"
      }])
    })
  })

  describe("suspend", () => {
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
      ├─ Union member
      │  └─ Expected readonly [number, <suspended schema> | null], actual undefined
      └─ Union member
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
      ├─ Union member
      │  └─ Expected readonly [number, <suspended schema> | null], actual undefined
      └─ Union member
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
├─ Union member
│  └─ Expected a string, actual null
└─ Union member
   └─ Expected a number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected a number, actual null"
      }])
    })

    it("default message with identifier", async () => {
      const schema = S.Union(S.String, S.Number).annotations({ identifier: "identifier" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        `identifier
├─ Union member
│  └─ Expected a string, actual null
└─ Union member
   └─ Expected a number, actual null`
      )
      expectIssues(schema, input, [{
        _tag: "Type",
        path: [],
        message: "Expected a string, actual null"
      }, {
        _tag: "Type",
        path: [],
        message: "Expected a number, actual null"
      }])
    })

    it("custom message", async () => {
      const schema = S.Union(S.String, S.Number).annotations({ message: () => "custom message" })
      const input = null
      await Util.expectDecodeUnknownFailure(
        schema,
        input,
        "custom message"
      )
      expectIssues(schema, input, [{
        _tag: "Union",
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
│  └─ Expected MyString1 (a string), actual 1
└─ ["b"]
   └─ Expected MyString2 (a string), actual 2`,
      Util.allErrors
    )
  })

  describe("suspend", () => {
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
      ├─ Union member
      │  └─ Expected A, actual undefined
      └─ Union member
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
      ├─ Union member
      │  └─ Expected A, actual undefined
      └─ Union member
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
      ├─ Union member
      │  └─ Expected A, actual undefined
      └─ Union member
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

  const Name = S.NonEmpty.annotations({
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
