import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("encodedBoundSchema", () => {
  const StringTransformation = S.transform(
    S.String.pipe(S.minLength(2)).annotations({ identifier: "String2" }),
    S.String,
    {
      strict: true,
      encode: (s) => s,
      decode: (s) => s
    }
  ).annotations({ identifier: "StringTransformation" })

  it("struct", async () => {
    const String3 = S.String.pipe(S.minLength(3)).annotations({ identifier: "String3" })

    const schema = S.Struct({
      a: S.Array(StringTransformation),
      b: String3
    }).annotations({ identifier: "FullSchema" })

    const bound = S.encodedBoundSchema(schema)

    await Util.assertions.decoding.succeed(bound, {
      a: ["ab"],
      b: "abc"
    })

    await Util.assertions.decoding.fail(
      bound,
      {
        a: ["a"],
        b: "abc"
      },
      `{ readonly a: ReadonlyArray<String2>; readonly b: String3 }
└─ ["a"]
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
    )

    await Util.assertions.decoding.fail(
      bound,
      {
        a: ["ab"],
        b: "ab"
      },
      `{ readonly a: ReadonlyArray<String2>; readonly b: String3 }
└─ ["b"]
   └─ String3
      └─ Predicate refinement failure
         └─ Expected a string at least 3 character(s) long, actual "ab"`
    )
  })

  describe("Stable filters", () => {
    describe("Array", () => {
      it("minItems", async () => {
        const schema = S.Array(StringTransformation).pipe(S.minItems(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `minItems(2)
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab"],
          `minItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at least 2 item(s), actual ["ab"]`
        )
      })

      it("maxItems", async () => {
        const schema = S.Array(StringTransformation).pipe(S.maxItems(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `maxItems(2)
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab", "cd", "ef"],
          `maxItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual ["ab","cd","ef"]`
        )
      })

      it("itemsCount", async () => {
        const schema = S.Array(StringTransformation).pipe(S.itemsCount(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `itemsCount(2)
└─ From side refinement failure
   └─ ReadonlyArray<String2>
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab"],
          `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual ["ab"]`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab", "cd", "ef"],
          `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual ["ab","cd","ef"]`
        )
      })
    })

    describe("NonEmptyArray", () => {
      it("minItems", async () => {
        const schema = S.NonEmptyArray(StringTransformation).pipe(S.minItems(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `minItems(2)
└─ From side refinement failure
   └─ readonly [String2, ...String2[]]
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab"],
          `minItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at least 2 item(s), actual ["ab"]`
        )
      })

      it("maxItems", async () => {
        const schema = S.NonEmptyArray(StringTransformation).pipe(S.maxItems(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `maxItems(2)
└─ From side refinement failure
   └─ readonly [String2, ...String2[]]
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab", "cd", "ef"],
          `maxItems(2)
└─ Predicate refinement failure
   └─ Expected an array of at most 2 item(s), actual ["ab","cd","ef"]`
        )
      })

      it("itemsCount", async () => {
        const schema = S.NonEmptyArray(StringTransformation).pipe(S.itemsCount(2))
        const bound = S.encodedBoundSchema(schema)

        await Util.assertions.decoding.succeed(bound, ["ab", "cd"])
        await Util.assertions.decoding.fail(
          bound,
          ["a"],
          `itemsCount(2)
└─ From side refinement failure
   └─ readonly [String2, ...String2[]]
      └─ [0]
         └─ String2
            └─ Predicate refinement failure
               └─ Expected a string at least 2 character(s) long, actual "a"`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab"],
          `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual ["ab"]`
        )
        await Util.assertions.decoding.fail(
          bound,
          ["ab", "cd", "ef"],
          `itemsCount(2)
└─ Predicate refinement failure
   └─ Expected an array of exactly 2 item(s), actual ["ab","cd","ef"]`
        )
      })
    })
  })
})
