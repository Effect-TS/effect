import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"

describe("ArrayFormatterIssue", () => {
  const schema = S.ArrayFormatterIssue

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })
})
