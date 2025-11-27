import { describe, it } from "@effect/vitest"
import { assertLeft, assertTrue, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import * as AST from "effect/SchemaAST"
import * as Util from "./TestUtils.js"

const expectSyncTree = <A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
  expected: string,
  options?: {
    readonly parseOptions?: AST.ParseOptions | undefined
  } | undefined
) => {
  const actual = S.decodeUnknownEither(schema)(input, options?.parseOptions).pipe(
    Either.mapLeft((e) => ParseResult.TreeFormatter.formatIssueSync(e.issue))
  )
  assertLeft(actual, expected)
}

const expectSyncIssues = <A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
  expected: ReadonlyArray<ParseResult.ArrayFormatterIssue>
) => {
  const options: ParseOptions = { errors: "all", onExcessProperty: "error" }
  const actual = S.decodeUnknownEither(schema)(input, options).pipe(
    Either.mapLeft((e) => ParseResult.ArrayFormatter.formatIssueSync(e.issue))
  )
  assertLeft(actual, expected)
}

const expectAsyncTree = async <A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
  expected: string,
  options?: {
    readonly parseOptions?: AST.ParseOptions | undefined
  } | undefined
) => {
  const result = S.decodeUnknownEither(schema)(input, options?.parseOptions)
  assertTrue(Either.isLeft(result))
  const actualEffect = ParseResult.TreeFormatter.formatIssue(result.left.issue)
  assertTrue(Effect.isEffect(actualEffect))
  throws(() => Effect.runSync(actualEffect))
  await Effect.runPromise(actualEffect).then((actual) => {
    strictEqual(actual, expected)
  })
}

const expectAsyncIssues = async <A, I>(
  schema: S.Schema<A, I>,
  input: unknown,
  expected: ReadonlyArray<ParseResult.ArrayFormatterIssue>
) => {
  const options: ParseOptions = { errors: "all", onExcessProperty: "error" }
  const result = S.decodeUnknownEither(schema)(input, options)
  assertTrue(Either.isLeft(result))
  const actualEffect = ParseResult.ArrayFormatter.formatIssue(result.left.issue)
  assertTrue(Effect.isEffect(actualEffect))
  throws(() => Effect.runSync(actualEffect))
  await Effect.runPromise(actualEffect).then((actual) => {
    deepStrictEqual(actual, expected)
  })
}

describe("Formatters output", () => {
  it("Effect async message", async () => {
    const EffectAsyncMessage = S.String.annotations({
      message: () =>
        Effect.gen(function*() {
          yield* Effect.sleep("10 millis")
          return "custom message"
        })
    })
    const schema = EffectAsyncMessage
    const input = null
    await expectAsyncTree(
      schema,
      input,
      "custom message"
    )
    await expectAsyncIssues(
      schema,
      input,
      [{
        _tag: "Type",
        path: [],
        message: "custom message"
      }]
    )
  })

  it("Effect sync messages", () => {
    const EffectSyncMessage = S.String.annotations({
      message: () => Effect.succeed(1).pipe(Effect.as("custom message"))
    })
    const schema = EffectSyncMessage
    const input = null
    expectSyncTree(
      schema,
      input,
      "custom message"
    )
    expectSyncIssues(
      schema,
      input,
      [{
        _tag: "Type",
        path: [],
        message: "custom message"
      }]
    )
  })

  describe("Forbidden", () => {
    it("default message", () => {
      const schema = Util.AsyncStringWithoutIdentifier
      const input = ""
      expectSyncTree(
        schema,
        input,
        `(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
      expectSyncIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("default message with identifier", () => {
      const schema = Util.AsyncString
      const input = ""
      expectSyncTree(
        schema,
        input,
        `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
      expectSyncIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("custom message (override=false)", () => {
      const schema = Util.AsyncString.annotations({ message: () => "custom message" })
      const input = ""
      expectSyncTree(
        schema,
        input,
        `(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
      expectSyncIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })

    it("custom message (override=true)", () => {
      const schema = Util.AsyncString.annotations({
        message: () => ({ message: "custom message", override: true })
      })
      const input = ""
      expectSyncTree(
        schema,
        input,
        `(string <-> string)
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
      expectSyncIssues(schema, input, [{
        _tag: "Forbidden",
        path: [],
        message:
          `cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      }])
    })
  })

  describe("sync messages", () => {
    describe("Missing", () => {
      it("default message", () => {
        const schema = S.Struct({ a: S.String })
        const input = {}
        expectSyncTree(
          schema,
          input,
          `{ readonly a: string }
└─ ["a"]
   └─ is missing`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Missing",
          path: ["a"],
          message: "is missing"
        }])
      })

      it("default message with parent identifier", () => {
        const schema = S.Struct({ a: S.String }).annotations({ identifier: "identifier" })
        const input = {}
        expectSyncTree(
          schema,
          input,
          `identifier
└─ ["a"]
   └─ is missing`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Missing",
          path: ["a"],
          message: "is missing"
        }])
      })

      it("parent custom message with override=true", () => {
        const schema = S.Struct({ a: S.String }).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = {}
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })

      describe("missing message", () => {
        describe("Struct", () => {
          it("PropertySignatureDeclaration", () => {
            const schema = S.Struct({
              a: S.propertySignature(S.String).annotations({
                missingMessage: () => "a80b642a-729f-4676-ba6a-235964afd52b"
              })
            })
            const input = {}
            expectSyncTree(
              schema,
              input,
              `{ readonly a: string }
└─ ["a"]
   └─ a80b642a-729f-4676-ba6a-235964afd52b`
            )
            expectSyncIssues(schema, input, [{
              _tag: "Missing",
              path: ["a"],
              message: "a80b642a-729f-4676-ba6a-235964afd52b"
            }])
          })

          it("PropertySignatureDeclaration + PropertySignatureTransformation", () => {
            const schema = S.Struct({
              a: S.propertySignature(S.String).annotations({
                missingMessage: () => "1ff9f37a-1f50-4ee2-906d-e824067d4cf7"
              }),
              b: S.propertySignature(S.String).annotations({
                missingMessage: () => "132f0e48-ae12-4bbb-8473-3dd433de2eb0"
              }).pipe(S.fromKey("c"))
            })
            const input = {}
            expectSyncTree(
              schema,
              input,
              `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      ├─ ["a"]
      │  └─ 1ff9f37a-1f50-4ee2-906d-e824067d4cf7
      └─ ["c"]
         └─ 132f0e48-ae12-4bbb-8473-3dd433de2eb0`,
              { parseOptions: Util.ErrorsAll }
            )
            expectSyncIssues(schema, input, [{
              _tag: "Missing",
              path: ["a"],
              message: "1ff9f37a-1f50-4ee2-906d-e824067d4cf7"
            }, {
              _tag: "Missing",
              path: ["c"],
              message: "132f0e48-ae12-4bbb-8473-3dd433de2eb0"
            }])
          })
        })

        describe("Tuple", () => {
          it("e", () => {
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
            expectSyncTree(
              schema,
              input,
              `readonly [string]
└─ [0]
   └─ my missing message`
            )
            expectSyncIssues(schema, input, [{
              _tag: "Missing",
              path: [0],
              message: "my missing message"
            }])
          })

          it("r + e", () => {
            const schema = S.Tuple(
              [],
              S.String,
              S.element(S.String).annotations({ [AST.MissingMessageAnnotationId]: () => "my missing message" })
            )
            const input: Array<string> = []
            expectSyncTree(
              schema,
              input,
              `readonly [...string[], string]
└─ [0]
   └─ my missing message`
            )
            expectSyncIssues(schema, input, [{
              _tag: "Missing",
              path: [0],
              message: "my missing message"
            }])
          })
        })
      })
    })

    describe("Unexpected", () => {
      it("default message", () => {
        const schema = S.Struct({ a: S.String })
        const input = { a: "a", b: 1 }
        expectSyncTree(
          schema,
          input,
          `{ readonly a: string }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
          { parseOptions: Util.onExcessPropertyError }
        )
        expectSyncIssues(schema, input, [{
          _tag: "Unexpected",
          path: ["b"],
          message: `is unexpected, expected: "a"`
        }])
      })

      it("default message with parent identifier", () => {
        const schema = S.Struct({ a: S.String }).annotations({ identifier: "identifier" })
        const input = { a: "a", b: 1 }
        expectSyncTree(
          schema,
          input,
          `identifier
└─ ["b"]
   └─ is unexpected, expected: "a"`,
          { parseOptions: Util.onExcessPropertyError }
        )
        expectSyncIssues(schema, input, [{
          _tag: "Unexpected",
          path: ["b"],
          message: `is unexpected, expected: "a"`
        }])
      })

      it("parent custom message with override=true", () => {
        const schema = S.Struct({ a: S.String }).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = { a: "a", b: 1 }
        expectSyncTree(
          schema,
          input,
          "custom message",
          { parseOptions: Util.onExcessPropertyError }
        )
        expectSyncIssues(schema, input, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Declaration", () => {
      it("default message", () => {
        const schema = S.OptionFromSelf(S.String)
        const input = null
        expectSyncTree(
          schema,
          input,
          "Expected Option<string>, actual null"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected Option<string>, actual null"
        }])
      })

      it("default message with identifier", () => {
        const schema = S.OptionFromSelf(S.String).annotations({ identifier: "identifier" })
        const input = null
        expectSyncTree(
          schema,
          input,
          "Expected identifier, actual null"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected identifier, actual null"
        }])
      })

      it("custom message (override=false)", () => {
        const schema = S.OptionFromSelf(S.String).annotations({ message: () => "custom message" })
        const input = Option.some(1)
        expectSyncTree(
          schema,
          input,
          `Option<string>
└─ Expected string, actual 1`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual 1"
        }])
      })

      it("custom message (override=true)", () => {
        const schema = S.OptionFromSelf(S.String).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = Option.some(1)
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("String", () => {
      it("default message", () => {
        const schema = S.String
        const input = null
        expectSyncTree(
          schema,
          input,
          "Expected string, actual null"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("default message with identifier", () => {
        const schema = S.String.annotations({ identifier: "ID" })
        const input = null
        expectSyncTree(
          schema,
          input,
          "Expected ID, actual null"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected ID, actual null"
        }])
      })

      it("custom message", () => {
        const schema = S.String.annotations({ message: () => "custom message" })
        const input = null
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Transformation", () => {
      it("default message", () => {
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
        expectSyncTree(
          schema,
          input,
          `(string <-> string)
└─ Encoded side transformation failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("default message with identifier", () => {
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
        expectSyncTree(
          schema,
          input,
          `identifier
└─ Encoded side transformation failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("default message with message field (kind=Transformation)", () => {
        const schema = S.transformOrFail(
          S.String,
          S.String,
          {
            strict: true,
            decode: (s, _, ast) => ParseResult.fail(new ParseResult.Type(ast, s, "transformation failure")),
            encode: ParseResult.succeed
          }
        )
        const input = ""
        expectSyncTree(
          schema,
          input,
          `(string <-> string)
└─ Transformation process failure
   └─ transformation failure`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "transformation failure"
        }])
      })

      it("custom message (kind=From, override=false)", () => {
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
        expectSyncTree(
          schema,
          input,
          `(string <-> string)
└─ Encoded side transformation failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("custom message (kind=From, override=true)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message with inner custom message (kind=From, override=false)", () => {
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
        expectSyncTree(
          schema,
          input,
          "inner custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "inner custom message"
        }])
      })

      it("custom message with inner custom message (kind=From, override=true)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message (kind=To, override=false)", () => {
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
        expectSyncTree(
          schema,
          input,
          `(string <-> NonEmptyString)
└─ Type side transformation failure
   └─ NonEmptyString
      └─ Predicate refinement failure
         └─ Expected a non empty string, actual ""`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: `Expected a non empty string, actual ""`
        }])
      })

      it("custom message (kind=To, override=true)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message with inner custom message (kind=To, override=false)", () => {
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
        expectSyncTree(
          schema,
          input,
          "inner custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "inner custom message"
        }])
      })

      it("custom message with inner custom message (kind=To, override=true)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message (kind=Transformation, override=false)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message (kind=Transformation, override=true)", () => {
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
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Transformation",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Refinement", () => {
      it("default message (kind=From)", () => {
        const schema = S.String.pipe(S.minLength(1))
        const input = null
        expectSyncTree(
          schema,
          input,
          `minLength(1)
└─ From side refinement failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("default message with identifier (kind=From)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({ identifier: "identifier" })
        const input = null
        expectSyncTree(
          schema,
          input,
          `identifier
└─ From side refinement failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("default message (kind=Predicate)", () => {
        const schema = S.String.pipe(S.minLength(1))
        const input = ""
        expectSyncTree(
          schema,
          input,
          `minLength(1)
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: `Expected a string at least 1 character(s) long, actual ""`
        }])
      })

      it("default message with identifier (kind=Predicate)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({ identifier: "identifier" })
        const input = ""
        expectSyncTree(
          schema,
          input,
          `identifier
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: `Expected a string at least 1 character(s) long, actual ""`
        }])
      })

      it("custom message (kind=From, override=false)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({ message: () => "custom message" })
        const input = null
        expectSyncTree(
          schema,
          input,
          `minLength(1)
└─ From side refinement failure
   └─ Expected string, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }])
      })

      it("custom message (kind=From, override=true)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = null
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message (kind=Predicate, override=false)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({ message: () => "custom message" })
        const input = ""
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message (kind=Predicate, override=true)", () => {
        const schema = S.String.pipe(S.minLength(1)).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = ""
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: "custom message"
        }])
      })

      it("custom message with inner custom message (kind=From, override=false)", () => {
        const schema = S.String.pipe(S.minLength(1, { message: () => "inner custom message" }), S.maxLength(2))
          .annotations({ message: () => "custom message" })
        const input = ""
        expectSyncTree(
          schema,
          input,
          "inner custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: "inner custom message"
        }])
      })

      it("custom message with inner custom message (kind=From, override=true)", () => {
        const schema = S.String.pipe(S.minLength(1, { message: () => "inner custom message" }), S.maxLength(2))
          .annotations({ message: () => ({ message: "custom message", override: true }) })
        const input = ""
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Refinement",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Suspend", () => {
      it("outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.suspend( // intended outer suspend
          () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
        )

        expectSyncTree(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        expectSyncTree(
          schema,
          [1, undefined],
          `readonly [number, <suspended schema> | null]
└─ [1]
   └─ <suspended schema> | null
      ├─ Expected readonly [number, <suspended schema> | null], actual undefined
      └─ Expected null, actual undefined`
        )
      })

      it("inner", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(S.suspend(() => schema), S.Literal(null))
        )

        expectSyncTree(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        expectSyncTree(
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
      it("default message", () => {
        const schema = S.Union(S.String, S.Number)
        const input = null
        expectSyncTree(
          schema,
          input,
          `string | number
├─ Expected string, actual null
└─ Expected number, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }, {
          _tag: "Type",
          path: [],
          message: "Expected number, actual null"
        }])
      })

      it("default message with identifier", () => {
        const schema = S.Union(S.String, S.Number).annotations({ identifier: "identifier" })
        const input = null
        expectSyncTree(
          schema,
          input,
          `identifier
├─ Expected string, actual null
└─ Expected number, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }, {
          _tag: "Type",
          path: [],
          message: "Expected number, actual null"
        }])
      })

      it("parent custom message with override=false", () => {
        const schema = S.Union(S.String, S.Number).annotations({
          message: () => "custom message"
        })
        const input = null
        expectSyncTree(
          schema,
          input,
          `string | number
├─ Expected string, actual null
└─ Expected number, actual null`
        )
        expectSyncIssues(schema, input, [{
          _tag: "Type",
          path: [],
          message: "Expected string, actual null"
        }, {
          _tag: "Type",
          path: [],
          message: "Expected number, actual null"
        }])
      })

      it("parent custom message with override=true", () => {
        const schema = S.Union(S.String, S.Number).annotations({
          message: () => ({ message: "custom message", override: true })
        })
        const input = null
        expectSyncTree(
          schema,
          input,
          "custom message"
        )
        expectSyncIssues(schema, input, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Tuple", () => {
      it("parent custom message with override=false", () => {
        const schema = S.Tuple(S.String).annotations({ message: () => "custom message" })
        const input1 = [1]
        expectSyncTree(
          schema,
          input1,
          `readonly [string]
└─ [0]
   └─ Expected string, actual 1`
        )
        expectSyncIssues(schema, input1, [{
          _tag: "Type",
          path: [0],
          message: "Expected string, actual 1"
        }])
      })

      it("parent custom message with override=true", () => {
        const schema = S.Tuple(S.String).annotations({ message: () => ({ message: "custom message", override: true }) })
        const input1 = [1]
        expectSyncTree(
          schema,
          input1,
          "custom message"
        )
        expectSyncIssues(schema, input1, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })
    })

    describe("Struct", () => {
      it("parent custom message with override=false", () => {
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
        expectSyncTree(
          schema,
          input1,
          "custom message"
        )
        expectSyncIssues(schema, input1, [{
          _tag: "Type",
          path: [],
          message: "custom message"
        }])

        const input2 = { as: [] }
        expectSyncTree(
          schema,
          input2,
          `A
└─ ["as"]
   └─ minItems`
        )
        expectSyncIssues(schema, input2, [{
          _tag: "Refinement",
          path: ["as"],
          message: "minItems"
        }])

        const input3 = { as: [{ b: null }] }
        expectSyncTree(
          schema,
          input3,
          `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: minLength(1) & maxLength(2) }
                  └─ ["b"]
                     └─ type`
        )
        expectSyncIssues(schema, input3, [{
          _tag: "Refinement",
          path: ["as", 0, "b"],
          message: "type"
        }])

        const input4 = { as: [{ b: "" }] }
        expectSyncTree(
          schema,
          input4,
          `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: minLength(1) & maxLength(2) }
                  └─ ["b"]
                     └─ minLength`
        )
        expectSyncIssues(schema, input4, [{
          _tag: "Refinement",
          path: ["as", 0, "b"],
          message: "minLength"
        }])

        const input5 = { as: [{ b: "---" }] }
        expectSyncTree(
          schema,
          input5,
          `A
└─ ["as"]
   └─ B
      └─ From side refinement failure
         └─ C
            └─ [0]
               └─ { readonly b: minLength(1) & maxLength(2) }
                  └─ ["b"]
                     └─ maxLength`
        )
        expectSyncIssues(schema, input5, [{
          _tag: "Refinement",
          path: ["as", 0, "b"],
          message: "maxLength"
        }])
      })

      it("parent custom message with override=true", () => {
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
        expectSyncTree(
          schema,
          input1,
          "custom message"
        )
        expectSyncIssues(schema, input1, [{
          _tag: "Type",
          path: [],
          message: "custom message"
        }])
        const input2 = { as: [] }
        expectSyncTree(
          schema,
          input2,
          "custom message"
        )
        expectSyncIssues(schema, input2, [{
          _tag: "Composite",
          path: [],
          message: "custom message"
        }])
      })
    })
  })

  describe("handle identifiers", () => {
    it("Struct", () => {
      const schema = S.Struct({
        a: S.String.annotations({ identifier: "MyString1" }),
        b: S.String.annotations({ identifier: "MyString2" })
      }).annotations({ identifier: "MySchema" })

      expectSyncTree(
        schema,
        { a: 1, b: 2 },
        `MySchema
├─ ["a"]
│  └─ Expected MyString1, actual 1
└─ ["b"]
   └─ Expected MyString2, actual 2`,
        { parseOptions: Util.ErrorsAll }
      )
    })

    describe("Suspend", () => {
      it("outer", () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.suspend( // intended outer suspend
          () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
        ).annotations({ identifier: "A" })

        expectSyncTree(
          schema,
          null,
          `Expected readonly [number, A | null], actual null`
        )
        expectSyncTree(
          schema,
          [1, undefined],
          `readonly [number, A | null]
└─ [1]
   └─ A | null
      ├─ Expected readonly [number, A | null], actual undefined
      └─ Expected null, actual undefined`
        )
      })

      it("inner/outer", () => {
        type A = readonly [number, A | null]
        const schema = S.Tuple(
          S.Number,
          S.Union(S.suspend((): S.Schema<A> => schema), S.Literal(null))
        ).annotations({ identifier: "A" })

        expectSyncTree(
          schema,
          null,
          `Expected A, actual null`
        )
        expectSyncTree(
          schema,
          [1, undefined],
          `A
└─ [1]
   └─ A | null
      ├─ Expected A, actual undefined
      └─ Expected null, actual undefined`
        )
      })

      it("inner/inner", () => {
        type A = readonly [number, A | null]
        const schema = S.Tuple(
          S.Number,
          S.Union(S.suspend((): S.Schema<A> => schema).annotations({ identifier: "A" }), S.Literal(null))
        )

        expectSyncTree(
          schema,
          null,
          `Expected readonly [number, A | null], actual null`
        )
        expectSyncTree(
          schema,
          [1, undefined],
          `readonly [number, A | null]
└─ [1]
   └─ A | null
      ├─ Expected readonly [number, A | null], actual undefined
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
        Effect.gen(function*() {
          const service = yield* Effect.serviceOption(Translator)
          return Option.match(service, {
            onNone: () => "Invalid string",
            onSome: (translator) => translator.translations[translator.locale]
          })
        })
    })

    const result = S.decodeUnknownEither(Name)("")

    // no service
    assertLeft(
      Either.mapLeft(result, (error) => Effect.runSync(ParseResult.TreeFormatter.formatError(error))),
      "Invalid string"
    )

    // it locale
    assertLeft(
      Either.mapLeft(
        result,
        (error) =>
          Effect.runSync(
            ParseResult.TreeFormatter.formatError(error).pipe(Effect.provideService(Translator, {
              locale: "it",
              translations
            }))
          )
      ),
      "Nome non valido"
    )

    // en locale
    assertLeft(
      Either.mapLeft(
        result,
        (error) =>
          Effect.runSync(
            ParseResult.TreeFormatter.formatError(error).pipe(Effect.provideService(Translator, {
              locale: "en",
              translations
            }))
          )
      ),
      "Invalid name"
    )
  })
})
