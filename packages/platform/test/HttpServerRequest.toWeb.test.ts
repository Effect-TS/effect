import * as Headers from "@effect/platform/Headers"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"

describe("HttpServerRequest.toWeb", () => {
  it("round-trip identity for wrapped requests", () => {
    // Create a global Request with url/method/body/headers
    const originalRequest = new Request("https://example.com/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer token123"
      },
      body: JSON.stringify({ name: "test" })
    })

    // Call fromWeb to obtain HttpServerRequest
    const httpRequest = HttpServerRequest.fromWeb(originalRequest)

    // Call toWeb and assert the returned object is strictly equal to the original Request
    const resultRequest = HttpServerRequest.toWeb(httpRequest)

    strictEqual(resultRequest, originalRequest, "toWeb should return the exact same Request object")
  })

  it("reconstructs URL/method/headers for non-wrapped implementation", () => {
    // Create a minimal stub object implementing HttpServerRequest
    // that does not wrap a source Request
    const stubRequest = {
      [HttpServerRequest.TypeId]: HttpServerRequest.TypeId,
      [IncomingMessage.TypeId]: IncomingMessage.TypeId,
      source: { custom: "source" }, // Not a Request instance
      url: "/api/users",
      originalUrl: "/api/users",
      method: "GET",
      headers: Headers.fromInput({
        "host": "example.com",
        "content-type": "application/json",
        "x-custom-header": "custom-value"
      }),
      cookies: {},
      remoteAddress: undefined as any,
      multipart: undefined as any,
      multipartStream: undefined as any,
      upgrade: undefined as any,
      modify: undefined as any,
      stream: undefined as any,
      text: undefined as any,
      json: undefined as any,
      urlParamsBody: undefined as any,
      arrayBuffer: undefined as any
    } as HttpServerRequest.HttpServerRequest

    // Call toWeb(stub) and assert the returned Request has expected properties
    const resultRequest = HttpServerRequest.toWeb(stubRequest)

    // Check that we got a Request object
    strictEqual(resultRequest instanceof Request, true, "toWeb should return a Request instance")

    // Check method
    strictEqual(resultRequest.method, "GET", "Request method should match")

    // Check URL - should be reconstructed from stub data
    const resultUrl = new URL(resultRequest.url)
    strictEqual(resultUrl.protocol, "http:", "Should default to http protocol")
    strictEqual(resultUrl.hostname, "example.com", "Should use host from headers")
    strictEqual(resultUrl.pathname, "/api/users", "Should use pathname from stub.url")

    // Check headers
    strictEqual(
      resultRequest.headers.get("content-type"),
      "application/json",
      "Should preserve content-type header"
    )
    strictEqual(
      resultRequest.headers.get("x-custom-header"),
      "custom-value",
      "Should preserve custom headers"
    )
  })

  it("reconstructs with https protocol when x-forwarded-proto header is present", () => {
    const stubRequest = {
      [HttpServerRequest.TypeId]: HttpServerRequest.TypeId,
      [IncomingMessage.TypeId]: IncomingMessage.TypeId,
      source: { custom: "source" },
      url: "/secure/path",
      originalUrl: "/secure/path",
      method: "POST",
      headers: Headers.fromInput({
        "host": "secure.example.com",
        "x-forwarded-proto": "https",
        "content-type": "text/plain"
      }),
      cookies: {},
      remoteAddress: undefined as any,
      multipart: undefined as any,
      multipartStream: undefined as any,
      upgrade: undefined as any,
      modify: undefined as any,
      stream: undefined as any,
      text: undefined as any,
      json: undefined as any,
      urlParamsBody: undefined as any,
      arrayBuffer: undefined as any
    } as HttpServerRequest.HttpServerRequest

    const resultRequest = HttpServerRequest.toWeb(stubRequest)
    const resultUrl = new URL(resultRequest.url)

    strictEqual(resultUrl.protocol, "https:", "Should use https when x-forwarded-proto is https")
    strictEqual(resultUrl.hostname, "secure.example.com", "Should use host from headers")
    strictEqual(resultUrl.pathname, "/secure/path", "Should preserve the path")
  })

  it("handles missing host header gracefully", () => {
    const stubRequest = {
      [HttpServerRequest.TypeId]: HttpServerRequest.TypeId,
      [IncomingMessage.TypeId]: IncomingMessage.TypeId,
      source: {},
      url: "/path",
      originalUrl: "/path",
      method: "GET",
      headers: Headers.empty,
      cookies: {},
      remoteAddress: undefined as any,
      multipart: undefined as any,
      multipartStream: undefined as any,
      upgrade: undefined as any,
      modify: undefined as any,
      stream: undefined as any,
      text: undefined as any,
      json: undefined as any,
      urlParamsBody: undefined as any,
      arrayBuffer: undefined as any
    } as HttpServerRequest.HttpServerRequest

    const resultRequest = HttpServerRequest.toWeb(stubRequest)
    const resultUrl = new URL(resultRequest.url)

    strictEqual(resultUrl.hostname, "localhost", "Should default to localhost when host is missing")
  })
})
