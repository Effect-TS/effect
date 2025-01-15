import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeZonedFromSelf", () => {
  const schema = S.DateTimeZonedFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})
