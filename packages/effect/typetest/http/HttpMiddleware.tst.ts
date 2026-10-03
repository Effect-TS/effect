import { Effect } from "effect"
import { HttpMiddleware, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "tstyche"

declare const app: Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">

describe("HttpMiddleware.make", () => {
  it("preserves app types with an explicitly generic Effect.fn", () => {
    const middleware = HttpMiddleware.make(
      Effect.fn(function*<E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) {
        return yield* app
      })
    )

    expect(middleware(app)).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">
    >()
    expect(middleware(Effect.succeed(HttpServerResponse.empty()))).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse>
    >()
    expect(middleware).type.not.toBeCallableWith(Effect.succeed("not a response"))
  })

  it("preserves app types with an explicitly generic named Effect.fn", () => {
    const withHeader = HttpMiddleware.make(
      Effect.fn("withHeader")(function*<E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) {
        const response = yield* app
        return HttpServerResponse.setHeader(response, "x-service", "example")
      })
    )

    expect(withHeader(app)).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">
    >()
    expect(withHeader(Effect.succeed(HttpServerResponse.empty()))).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse>
    >()
    expect(withHeader).type.not.toBeCallableWith(Effect.succeed("not a response"))
  })

  it("preserves app types with an explicitly generic Effect.fnUntraced", () => {
    const middleware = HttpMiddleware.make(
      Effect.fnUntraced(function*<E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) {
        return yield* app
      })
    )

    expect(middleware(app)).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse, "app-error", "app-service">
    >()
    expect(middleware(Effect.succeed(HttpServerResponse.empty()))).type.toBe<
      Effect.Effect<HttpServerResponse.HttpServerResponse>
    >()
    expect(middleware).type.not.toBeCallableWith(Effect.succeed("not a response"))
  })
})
