import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeUtcFromNumber", () => {
  const schema = S.DateTimeUtcFromNumber

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })
})
