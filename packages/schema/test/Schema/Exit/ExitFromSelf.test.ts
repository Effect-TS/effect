import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("ExitFromSelf", () => {
  it("arbitrary", () => {
    Util.expectArbitrary(S.ExitFromSelf({ failure: S.String, success: S.Number }))
  })
})
