import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("TimeZone", () => {
  const schema = S.TimeZone

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})
