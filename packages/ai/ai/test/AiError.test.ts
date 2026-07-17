import * as AiError from "@effect/ai/AiError"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Schema } from "effect"

describe("AiError", () => {
  it("accepts uncommon HTTP methods in request details", () => {
    const details = Schema.decodeUnknownSync(AiError.HttpRequestDetails)({
      method: "PROPFIND",
      url: "https://example.com",
      urlParams: [],
      hash: { _tag: "None" },
      headers: {}
    })

    strictEqual(details.method, "PROPFIND")
  })
})
