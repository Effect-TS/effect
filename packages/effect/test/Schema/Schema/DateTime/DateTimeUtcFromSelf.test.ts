import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("DateTimeUtcFromSelf", () => {
  const schema = S.DateTimeUtcFromSelf

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })
})
