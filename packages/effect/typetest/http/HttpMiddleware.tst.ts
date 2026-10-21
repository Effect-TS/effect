import { Effect } from "effect"
import { HttpMiddleware, type HttpServerResponse } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const app: Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">

describe("HttpMiddleware", () => {
  describe("make", () => {
    it("preserves app types with an explicitly generic Effect.fn", () => {
      const middleware = HttpMiddleware.make(
        Effect.fn("middleware")(function*<E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) {
          return yield* app
        })
      )

      expect(middleware(app)).type.toBe<
        Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">
      >()
    })
  })
})
