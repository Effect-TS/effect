import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpMethod from "@effect/platform/HttpMethod"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"

const uncommonMethods = [
  "PROPFIND",
  "PROPPATCH",
  "MKCOL",
  "COPY",
  "MOVE",
  "LOCK",
  "UNLOCK",
  "TRACE",
  "SEARCH",
  "REPORT",
  "MKCALENDAR"
] as const satisfies ReadonlyArray<HttpMethod.HttpMethod>

describe("HttpMethod", () => {
  it("recognizes uncommon HTTP methods", () => {
    for (const method of uncommonMethods) {
      assertTrue(HttpMethod.isHttpMethod(method))
      assertTrue(HttpMethod.all.has(method))
    }
  })

  it("treats TRACE as a no-body method", () => {
    assertFalse(HttpMethod.hasBody("TRACE"))
  })

  it("supports uncommon methods in HttpLayerRouter", () => {
    for (const method of uncommonMethods) {
      const route = HttpLayerRouter.route(method, "/", HttpServerResponse.empty())
      strictEqual(route.method, method)
    }
  })
})
