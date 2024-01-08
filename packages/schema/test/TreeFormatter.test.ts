import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as _ from "@effect/schema/TreeFormatter"
import { describe, expect, it } from "vitest"

describe("TreeFormatter", () => {
  describe("defaults", () => {
    it("forbidden", async () => {
      const schema = Util.effectify(S.struct({ a: S.string }))
      expect(() => S.parseSync(schema)({ a: "a" })).toThrow(
        new Error(`{ a: (string <-> string) }
└─ ["a"]
   └─ is forbidden`)
      )
    })

    it("missing", async () => {
      const schema = S.struct({ a: S.string })
      await Util.expectParseFailure(
        schema,
        {},
        `{ a: string }
└─ ["a"]
   └─ is missing`
      )
    })

    it("excess property", async () => {
      const schema = S.struct({ a: S.string })
      await Util.expectParseFailure(
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
        const schema = S.string.pipe(S.minLength(1))

        await Util.expectParseFailure(
          schema,
          null,
          `a string at least 1 character(s) long
└─ From side refinement failure
   └─ Expected a string, actual null`
        )
        await Util.expectParseFailure(
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
        const schema = S.string.pipe(S.minLength(1), S.maxLength(3))

        await Util.expectParseFailure(
          schema,
          null,
          `a string at most 3 character(s) long
└─ From side refinement failure
   └─ a string at least 1 character(s) long
      └─ From side refinement failure
         └─ Expected a string, actual null`
        )
        await Util.expectParseFailure(
          schema,
          "",
          `a string at most 3 character(s) long
└─ From side refinement failure
   └─ a string at least 1 character(s) long
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
        )
        await Util.expectParseFailure(
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
          () => S.tuple(S.number, S.union(schema, S.literal(null)))
        )

        await Util.expectParseFailure(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        await Util.expectParseFailure(
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
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(S.suspend(() => schema), S.literal(null))
        )

        await Util.expectParseFailure(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        await Util.expectParseFailure(
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
      const schema = S.struct({
        a: S.string.pipe(S.identifier("MyString1")),
        b: S.string.pipe(S.identifier("MyString2"))
      }).pipe(S.identifier("MySchema"))

      await Util.expectParseFailure(
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
          () => S.tuple(S.number, S.union(schema, S.literal(null)))
        ).pipe(S.identifier("A"))

        await Util.expectParseFailure(
          schema,
          null,
          `Expected A, actual null`
        )
        await Util.expectParseFailure(
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
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(S.suspend(() => schema), S.literal(null))
        ).pipe(S.identifier("A"))

        await Util.expectParseFailure(
          schema,
          null,
          `Expected A, actual null`
        )
        await Util.expectParseFailure(
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
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(S.suspend(() => schema).pipe(S.identifier("A")), S.literal(null))
        )

        await Util.expectParseFailure(
          schema,
          null,
          `Expected readonly [number, A | null], actual null`
        )
        await Util.expectParseFailure(
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
      const schema = S.optionFromSelf(S.number).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("literal", async () => {
      const schema = S.literal("a").pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("uniqueSymbol", async () => {
      const schema = S.uniqueSymbol(Symbol.for("@effect/schema/test/a")).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("string", async () => {
      const schema = S.string.pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
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
      const schema = S.enums(Fruits).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("templateLiteral", async () => {
      const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b")).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    describe("refinement", () => {
      it("top level message", async () => {
        const schema = S.string.pipe(
          S.minLength(1),
          S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
        )

        await Util.expectParseFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectParseFailure(
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
        const schema = S.string.pipe(
          S.minLength(1, {
            message: (actual) => `minLength custom message ${JSON.stringify(actual)}`
          }),
          S.maxLength(3, {
            message: (actual) => `maxLength custom message ${JSON.stringify(actual)}`
          })
        )

        await Util.expectParseFailure(
          schema,
          null,
          `minLength custom message null`
        )
        await Util.expectParseFailure(
          schema,
          "",
          `minLength custom message ""`
        )
        await Util.expectParseFailure(
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
      const schema = S.tuple(S.string, S.number).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
      await Util.expectParseFailure(
        schema,
        [1, 2],
        `my custom message [1,2]`
      )
    })

    it("struct", async () => {
      const schema = S.struct({
        a: S.string,
        b: S.string
      }).pipe(S.message((actual) => `my custom message ${JSON.stringify(actual)}`))

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: 2 },
        `my custom message {"a":1,"b":2}`
      )
    })

    it("union", async () => {
      const schema = S.union(S.string, S.number).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    describe("transformation", () => {
      it("top level message", async () => {
        const schema = S.NumberFromString.pipe(
          S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
        )

        await Util.expectParseFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectParseFailure(
          schema,
          "a",
          `my custom message "a"`
        )
      })

      it("inner messages", async () => {
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
        ).pipe(S.identifier("IntFromString"), S.message(() => "please enter a parseable string"))

        await Util.expectParseFailure(
          schema,
          null,
          "please enter a string"
        )
      })
    })

    describe("suspend", () => {
      it("outer", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.suspend( // intended outer suspend
          () => S.tuple(S.number, S.union(schema, S.literal(null)))
        ).pipe(S.message((actual) => `my custom message ${JSON.stringify(actual)}`))

        await Util.expectParseFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectParseFailure(
          schema,
          [1, undefined],
          `my custom message [1,null]`
        )
      })

      it("inner/outer", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(S.suspend(() => schema), S.literal(null))
        ).pipe(S.message((actual) => `my custom message ${JSON.stringify(actual)}`))

        await Util.expectParseFailure(
          schema,
          null,
          `my custom message null`
        )
        await Util.expectParseFailure(
          schema,
          [1, undefined],
          `my custom message [1,null]`
        )
      })

      it("inner/inner", async () => {
        type A = readonly [number, A | null]
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(
            S.suspend(() => schema).pipe(
              S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
            ),
            S.literal(null)
          )
        )

        await Util.expectParseFailure(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        await Util.expectParseFailure(
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
        const schema: S.Schema<A> = S.tuple(
          S.number,
          S.union(
            S.suspend(() =>
              schema.pipe(
                S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
              )
            ),
            S.literal(null)
          )
        )

        await Util.expectParseFailure(
          schema,
          null,
          `Expected readonly [number, <suspended schema> | null], actual null`
        )
        await Util.expectParseFailure(
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
})
