import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("TimeZoneOffsetFromSelf", () => {
  const schema = S.TimeZoneOffsetFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})