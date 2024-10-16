import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("nonEmptyString", () => {
  const schema = S.NonEmptyString

  it("make", () => {
    Util.expectConstructorSuccess(S.NonEmptyString, "a")
    Util.expectConstructorFailure(
      S.NonEmptyString,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected NonEmptyString, actual ""`
    )
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "aa")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected NonEmptyString, actual ""`
    )
  })
})
