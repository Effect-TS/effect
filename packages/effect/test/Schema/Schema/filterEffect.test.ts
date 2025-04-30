import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("filterEffect", () => {
  it("should expose the original schema as `from`", () => {
    const schema = S.filterEffect(S.String, () => Effect.succeed(true))
    strictEqual(schema.from, S.String)
    strictEqual(schema.to.ast, S.String.ast)
  })

  describe("ParseIssue overloading", () => {
    it("return a Type", async () => {
      const schema = S.filterEffect(S.Struct({ a: S.String, b: S.String }), (o) => {
        if (o.b !== o.a) {
          return Effect.succeed(
            new ParseResult.Type(S.Literal(o.a).ast, o.b, `b should be equal to a's value ("${o.a}")`)
          )
        }
        return Effect.succeed(true)
      })

      await Util.assertions.decoding.succeed(schema, { a: "x", b: "x" })
      await Util.assertions.decoding.fail(
        schema,
        { a: "a", b: "b" },
        `({ readonly a: string; readonly b: string } <-> { readonly a: string; readonly b: string })
└─ Transformation process failure
   └─ b should be equal to a's value ("a")`
      )
    })

    const ValidString = S.Trim.pipe(S.minLength(1, { message: () => "ERROR_MIN_LENGTH" }))
    const Test = S.Struct({
      a: S.Struct({
        b: S.String,
        c: ValidString
      }),
      d: S.Tuple(S.String, ValidString)
    }).annotations({ identifier: "Test" })

    it("return a Pointer", async () => {
      const schema = Test.pipe(S.filterEffect((input) => {
        if (input.a.b !== input.a.c) {
          return Effect.succeed(
            new ParseResult.Pointer(
              ["a", "c"],
              input,
              new ParseResult.Type(S.Literal(input.a.b).ast, input.a.c)
            )
          )
        }
        if (input.d[0] !== input.d[1]) {
          return Effect.succeed(
            new ParseResult.Pointer(
              ["d", 1],
              input,
              new ParseResult.Type(S.Literal(input.d[0]).ast, input.d[1])
            )
          )
        }
        return Effect.succeed(true)
      }))
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Encoded side transformation failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["a"]["c"]
      └─ Expected "b", actual "c"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["d"][1]
      └─ Expected "item0", actual "item1"`
      )
    })

    it("return a path and a message", async () => {
      const schema = Test.pipe(S.filterEffect((input) => {
        if (input.a.b !== input.a.c) {
          return Effect.succeed({
            path: ["a", "c"],
            message: "FILTER1"
          })
        }
        if (input.d[0] !== input.d[1]) {
          return Effect.succeed({
            path: ["d", 1],
            message: "FILTER2"
          })
        }
        return Effect.succeed(true)
      }))
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Encoded side transformation failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["d"][1]
      └─ FILTER2`
      )
    })

    it("return many paths and messages", async () => {
      const schema = Test.pipe(S.filterEffect((input) => {
        const issues: Array<S.FilterIssue> = []
        if (input.a.b !== input.a.c) {
          issues.push({
            path: ["a", "c"],
            message: "FILTER1"
          })
        }
        if (input.d[0] !== input.d[1]) {
          issues.push({
            path: ["d", 1],
            message: "FILTER2"
          })
        }
        return Effect.succeed(issues)
      }))
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: " " }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Encoded side transformation failure
   └─ Test
      └─ ["a"]
         └─ { readonly b: string; readonly c: minLength(1) }
            └─ ["c"]
               └─ ERROR_MIN_LENGTH`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["-", "-"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["a"]["c"]
      └─ FILTER1`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "-", c: "-" }, d: ["item0", "item1"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ ["d"][1]
      └─ FILTER2`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: { b: "b", c: "c" }, d: ["item0", "item1"] },
        `(Test <-> Test)
└─ Transformation process failure
   └─ (Test <-> Test)
      ├─ ["a"]["c"]
      │  └─ FILTER1
      └─ ["d"][1]
         └─ FILTER2`
      )
    })
  })
})
