import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("TimeZoneNamed", () => {
  const schema = S.TimeZoneNamed

  it("property tests", () => {
    Util.roundtrip(schema)
  })
})