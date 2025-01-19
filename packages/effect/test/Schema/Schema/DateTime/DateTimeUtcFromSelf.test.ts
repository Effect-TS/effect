import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DateTimeUtcFromSelf", () => {
  const schema = S.DateTimeUtcFromSelf

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })
})
