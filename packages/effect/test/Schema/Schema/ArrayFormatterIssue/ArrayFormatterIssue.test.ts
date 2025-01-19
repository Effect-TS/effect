import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("ArrayFormatterIssue", () => {
  const schema = S.ArrayFormatterIssue

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })
})
