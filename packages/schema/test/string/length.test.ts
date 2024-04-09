import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > length", () => {
  describe("decoding", () => {
    it("length: 1", async () => {
      const schema = S.String.pipe(S.length(1, { identifier: "Char" }))
      await Util.expectDecodeUnknownSuccess(schema, "a")

      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `Char
└─ Predicate refinement failure
   └─ Expected Char (a single character), actual ""`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "aa",
        `Char
└─ Predicate refinement failure
   └─ Expected Char (a single character), actual "aa"`
      )
    })

    it("length > 1", async () => {
      const schema = S.String.pipe(S.length(2, { identifier: "Char2" }))
      await Util.expectDecodeUnknownSuccess(schema, "aa")

      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `Char2
└─ Predicate refinement failure
   └─ Expected Char2 (a string 2 character(s) long), actual ""`
      )
    })

    it("length : { min > max }", async () => {
      const schema = S.String.pipe(S.length({ min: 2, max: 4 }, { identifier: "Char(2-4)" }))
      await Util.expectDecodeUnknownSuccess(schema, "aa")
      await Util.expectDecodeUnknownSuccess(schema, "aaa")
      await Util.expectDecodeUnknownSuccess(schema, "aaaa")

      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `Char(2-4)
└─ Predicate refinement failure
   └─ Expected Char(2-4) (a string at least 2 character(s) and at most 4 character(s) long), actual ""`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "aaaaa",
        `Char(2-4)
└─ Predicate refinement failure
   └─ Expected Char(2-4) (a string at least 2 character(s) and at most 4 character(s) long), actual "aaaaa"`
      )
    })

    it("length : { min = max }", async () => {
      const schema = S.String.pipe(S.length({ min: 2, max: 2 }, { identifier: "Char2" }))
      await Util.expectDecodeUnknownSuccess(schema, "aa")

      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `Char2
└─ Predicate refinement failure
   └─ Expected Char2 (a string 2 character(s) long), actual ""`
      )
    })

    it("length : { min < max }", async () => {
      const schema = S.String.pipe(S.length({ min: 2, max: 1 }, { identifier: "Char2" }))
      await Util.expectDecodeUnknownSuccess(schema, "aa")

      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `Char2
└─ Predicate refinement failure
   └─ Expected Char2 (a string 2 character(s) long), actual ""`
      )
    })
  })
})
