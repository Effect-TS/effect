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

    describe("refinement", async () => {
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
│  └─ Expected a string, actual 1
└─ ["b"]
   └─ Expected a string, actual 2`,
        Util.allErrors
      )
    })
  })

  describe("messages", () => {
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

    describe("refinement", async () => {
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

    it("unions", async () => {
      const schema = S.union(S.string, S.number).pipe(
        S.message((actual) => `my custom message ${JSON.stringify(actual)}`)
      )

      await Util.expectParseFailure(
        schema,
        null,
        `my custom message null`
      )
    })

    it("transformations", async () => {
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
  })
})
