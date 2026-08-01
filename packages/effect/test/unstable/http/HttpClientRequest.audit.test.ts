import { assert, it } from "@effect/vitest"
import { Stream } from "effect"
import { HttpBody, HttpClientRequest } from "effect/unstable/http"

it("removes stale content length when the replacement body has no known length", () => {
  const request = HttpClientRequest.bodyText(HttpClientRequest.post("https://example.com"), "abc").pipe(
    HttpClientRequest.setBody(HttpBody.stream(Stream.empty))
  )
  assert.notProperty(request.headers, "content-length")
})
