import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("TimeZoneOffset", () => {
  const schema = S.TimeZoneOffset

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })
})
