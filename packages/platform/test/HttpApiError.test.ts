import * as HttpApiError from "@effect/platform/HttpApiError"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

describe("HttpApiError", () => {
  describe("Issue schema", () => {
    it("path should handle symbol, string, and number", () => {
      const encodeSync = Schema.encodeSync(HttpApiError.Issue)
      const decodeSync = Schema.decodeSync(HttpApiError.Issue)
      const expectRoundtrip = (issue: typeof HttpApiError.Issue.Type) => {
        expect(decodeSync(encodeSync(issue))).toStrictEqual(issue)
      }

      expectRoundtrip({
        _tag: "Pointer",
        path: ["path", 1, Symbol.for("symbol")],
        message: "message"
      })
    })
  })
})
