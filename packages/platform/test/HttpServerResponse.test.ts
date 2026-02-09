import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"

describe("json", () => {
  it.effect("with a content-type", () =>
    Effect.gen(function*() {
      const response = yield* HttpServerResponse.json({}, {
        contentType: "application/custom+json",
        headers: { "content-type": "application/other+json" }
      })

      strictEqual(response.headers["content-type"], "application/custom+json")
    }))

  it.effect("with a content-type header", () =>
    Effect.gen(function*() {
      const response = yield* HttpServerResponse.json({}, { headers: { "content-type": "application/custom+json" } })

      strictEqual(response.headers["content-type"], "application/custom+json")
    }))

  it.effect("without a content-type", () =>
    Effect.gen(function*() {
      const response = yield* HttpServerResponse.json({})

      strictEqual(response.headers["content-type"], "application/json")
    }))
})
