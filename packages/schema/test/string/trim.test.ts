import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("string > trim", () => {
  it("property tests", () => {
    const schema = S.Trim
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.string.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownSuccess(schema, "a ", "a")
    await Util.expectDecodeUnknownSuccess(schema, " a ", "a")
    await Util.expectDecodeUnknownSuccess(schema, " ", "")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `MySchema
└─ From side transformation failure
   └─ a string at least 1 character(s) long
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("encoding", async () => {
    const schema = S.string.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      "",
      `MySchema
└─ From side transformation failure
   └─ a string at least 1 character(s) long
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
    await Util.expectEncodeFailure(
      schema,
      " a",
      `MySchema
└─ To side transformation failure
   └─ Trim
      └─ To side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `MySchema
└─ To side transformation failure
   └─ Trim
      └─ To side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected Trimmed (a string with no leading or trailing whitespace), actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `MySchema
└─ To side transformation failure
   └─ Trim
      └─ To side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " ",
      `MySchema
└─ To side transformation failure
   └─ Trim
      └─ To side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " "`
    )
  })
})
