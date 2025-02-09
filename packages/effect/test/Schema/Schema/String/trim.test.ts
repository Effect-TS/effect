import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("trim", () => {
  it("property tests", () => {
    const schema = S.Trim
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownSuccess(schema, "a ", "a")
    await Util.expectDecodeUnknownSuccess(schema, " a ", "a")
    await Util.expectDecodeUnknownSuccess(schema, " ", "")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `MySchema
└─ Encoded side transformation failure
   └─ minLength(1)
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("encoding", async () => {
    const schema = S.String.pipe(S.minLength(1), S.compose(S.Trim)).annotations({ identifier: "MySchema" })
    await Util.expectEncodeSuccess(schema, "a", "a")

    await Util.expectEncodeFailure(
      schema,
      "",
      `MySchema
└─ Encoded side transformation failure
   └─ minLength(1)
      └─ Predicate refinement failure
         └─ Expected a string at least 1 character(s) long, actual ""`
    )
    await Util.expectEncodeFailure(
      schema,
      " a",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " ",
      `MySchema
└─ Type side transformation failure
   └─ Trim
      └─ Type side transformation failure
         └─ Trimmed
            └─ Predicate refinement failure
               └─ Expected a string with no leading or trailing whitespace, actual " "`
    )
  })
})
