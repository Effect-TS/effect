import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BooleanFromString", () => {
  const schema = S.BooleanFromString
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "true", true)
    await Util.assertions.decoding.succeed(schema, "false", false)
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `BooleanFromString
└─ Encoded side transformation failure
   └─ a string to be decoded into a boolean
      ├─ Expected "true", actual "a"
      └─ Expected "false", actual "a"`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, true, "true")
    await Util.assertions.encoding.succeed(schema, false, "false")
  })
})
