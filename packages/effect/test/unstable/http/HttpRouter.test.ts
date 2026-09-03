import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"

describe("HttpRouter", () => {
  it("handles prefixed routes with toWebHandler", async () => {
    const { dispose, handler } = HttpRouter.toWebHandler(
      Effect.gen(function*() {
        const router = yield* HttpRouter.HttpRouter
        yield* router.prefixed("/api").add("GET", "/hello", HttpServerResponse.text("hi"))
      }).pipe(Layer.effectDiscard)
    )

    try {
      const response = await handler(new Request("http://localhost/api/hello"))
      assert.strictEqual(response.status, 200)
      assert.strictEqual(await response.text(), "hi")
    } finally {
      await dispose()
    }
  })
})
