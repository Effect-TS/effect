import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"

describe("HttpClientRequest", () => {
  const intialRequest = HttpClientRequest.make("GET")("/test")

  it("prependUrl with a string", () => {
    const result = intialRequest.pipe(HttpClientRequest.prependUrl("https://example.com"))

    deepStrictEqual(result.url, "https://example.com/test")
  })

  it("prependUrl with an URL instance", () => {
    const result = intialRequest.pipe(HttpClientRequest.prependUrl(new URL("https://example.com")))

    deepStrictEqual(result.url, "https://example.com/test")
  })
})
