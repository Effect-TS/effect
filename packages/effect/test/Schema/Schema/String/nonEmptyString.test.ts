import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("nonEmptyString", () => {
  const schema = S.NonEmptyString

  it("make", () => {
    Util.assertions.make.succeed(S.NonEmptyString, "a")
    Util.assertions.make.fail(
      S.NonEmptyString,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
    )
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "aa")

    await Util.assertions.decoding.fail(
      schema,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
    )
  })
})
