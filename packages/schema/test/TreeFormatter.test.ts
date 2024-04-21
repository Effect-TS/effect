import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("TreeFormatter", () => {
  describe("defaults", () => {
    it("forbidden", async () => {
      const schema = Util.effectify(S.Struct({ a: S.String }))
      expect(() => S.decodeUnknownSync(schema)({ a: "a" })).toThrow(
        new Error(
          `{ a: (string <-> string) }
└─ ["a"]
   └─ (string <-> string)
      └─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
        )
      )
    })

    it("missing", async () => {
      const schema = S.Struct({ a: S.String })
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ a: string }
└─ ["a"]
   └─ is missing`
      )
    })

    it("excess property", async () => {
      const schema = S.Struct({ a: S.String })
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a", b: 1 },
        `{ a: string }
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    describe("refinement", () => {
      it("1 refinement", async () => {
        const schema = S.String.pipe(S.minLength(1))

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `a string at least 1 character(s) long
└─ From side refinement failure
   └─ Expected a string, actual null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "",
          `a string at least 1 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
        )

        await Util.expectEncodeFailure(
          schema,
          "",
          `a string at least 1 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
        )
      })

      it("2 refinements", async () => {
        const schema = S.String.pipe(S.minLength(1), S.maxLength(3))

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `a string at most 3 character(s) long
└─ From side refinement failure
   └─ a string at least 1 character(s) long
      └─ From side refinement failure
         └─ Expected a string, actual null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "",
          `a string at most 3 character(s) long
└─ From side refinement failure
   └─ a string at least 1 character(s) long
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "aaaa",
          `a string at most 3 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at most 3 character(s) long, actual "aaaa"`
        )

        await Util.expectEncodeFailure(
          schema,
          "",
          `a string at most 3 character(s) long
└─ From side refinement failure
   └─ a string at least 1 character(s) long
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
        )
        await Util.expectEncodeFailure(
          schema,
          "aaaa",
          `a string at most 3 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at most 3 character(s) long, actual "aaaa"`
        )
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
  })

  describe("handle identifiers", () => {
    it("struct", async () => {
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
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(S.suspend(() => schema), S.Literal(null))
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
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(S.suspend(() => schema).annotations({ identifier: "A" }), S.Literal(null))
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

  describe("messages", () => {
    it("declaration", async () => {
      const schema = S.OptionFromSelf(S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("literal", async () => {
      const schema = S.Literal("a").annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("uniqueSymbolFromSelf", async () => {
      const schema = S.UniqueSymbolFromSelf(Symbol.for("@effect/schema/test/a")).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("string", async () => {
      const schema = S.String.annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("enums", async () => {
      enum Fruits {
        Apple,
        Banana
      }
      const schema = S.Enums(Fruits).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("templateLiteral", async () => {
      const schema = S.TemplateLiteral(S.Literal("a"), S.String, S.Literal("b")).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    describe("refinement", () => {
      it("top level message", async () => {
        const schema = S.String.pipe(
          S.minLength(1)
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "",
          `my custom message ""`
        )

        await Util.expectEncodeFailure(
          schema,
          "",
          `my custom message ""`
        )
      })

      it("inner messages", async () => {
        const schema = S.String.pipe(
          S.minLength(1, {
            message: (issue) => `minLength custom message ${JSON.stringify(issue.actual)}`
          }),
          S.maxLength(3, {
            message: (issue) => `maxLength custom message ${JSON.stringify(issue.actual)}`
          })
        )

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `minLength custom message null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "",
          `minLength custom message ""`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "aaaa",
          `maxLength custom message "aaaa"`
        )

        await Util.expectEncodeFailure(
          schema,
          "",
          `minLength custom message ""`
        )
        await Util.expectEncodeFailure(
          schema,
          "aaaa",
          `maxLength custom message "aaaa"`
        )
      })
    })

    it("tuple", async () => {
      const schema = S.Tuple(S.String, S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        [1, 2],
        `my custom message [1,2]`
      )
    })

    it("struct", async () => {
      const schema = S.Struct({
        a: S.String,
        b: S.String
      }).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: 2 },
        `my custom message {"a":1,"b":2}`
      )
    })

    it("union", async () => {
      const schema = S.Union(S.String, S.Number).annotations({
        message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
      })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    describe("transformation", () => {
      it("top level message", async () => {
        const schema = S.NumberFromString.annotations({
          message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
        })

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "a",
          `my custom message "a"`
        )
      })

      it("inner messages", async () => {
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

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          "please enter a string"
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "1.2",
          "please enter an integer"
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          "a",
          "please enter a decodeUnknownable string"
        )
      })
    })

    describe("suspend", () => {
      it("outer", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.suspend( // intended outer suspend
          () => S.Tuple(S.Number, S.Union(schema, S.Literal(null)))
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          [1, undefined],
          `my custom message [1,null]`
        )
      })

      it("inner/outer", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(S.suspend(() => schema), S.Literal(null))
        ).annotations({ message: (issue) => `my custom message ${JSON.stringify(issue.actual)}` })

        await Util.expectDecodeUnknownFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectDecodeUnknownFailure(
          schema,
          [1, undefined],
          `my custom message [1,null]`
        )
      })

      it("inner/inner", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(
            S.suspend(() => schema).annotations({
              message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
            }),
            S.Literal(null)
          )
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
      │  └─ my custom message undefined
      └─ Union member
         └─ Expected null, actual undefined`
        )
      })

      it("inner/inner/inner", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.Tuple(
          S.Number,
          S.Union(
            S.suspend(() =>
              schema.annotations({
                message: (issue) => `my custom message ${JSON.stringify(issue.actual)}`
              })
            ),
            S.Literal(null)
          )
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
      │  └─ my custom message undefined
      └─ Union member
         └─ Expected null, actual undefined`
        )
      })
    })
  })

  it("message as Effect", () => {
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
})
