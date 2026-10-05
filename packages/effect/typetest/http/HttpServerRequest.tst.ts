import { HttpServerRequest } from "effect/http"
import { describe, expect, it } from "tstyche"

describe("HttpServerRequest", () => {
  it("does not claim received or forwarded methods are known HttpMethod literals", () => {
    const request = HttpServerRequest.fromWeb(new Request("http://localhost/", { method: "PROPFIND" }))
    expect(request.method).type.toBe<string>()
    expect(HttpServerRequest.toClientRequest(request).method).type.toBe<string>()
  })
})
