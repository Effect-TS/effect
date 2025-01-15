import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("TimeZoneOffset", () => {
  const schema = S.TimeZoneOffset

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})
