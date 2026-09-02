import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { HttpRouter, type HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

describe("HttpRouter", () => {
  it("normalizes the prefix stored by prefixRoute", () => {
    const route = HttpRouter.prefixRoute(
      HttpRouter.route("GET", "/users", HttpServerResponse.text("ok")),
      "/api/"
    )

    assert.deepStrictEqual(route.prefix, Option.some("/api"))
  })

  for (
    const { prefix, requestUrl } of [
      { prefix: "/", requestUrl: "/users" },
      { prefix: "/api/", requestUrl: "/api/users" }
    ]
  ) {
    it.effect(`preserves the local URL for the ${prefix} prefix`, () =>
      Effect.gen(function*() {
        const routes = HttpRouter.use((router) =>
          router.prefixed(prefix).add("GET", "/users", (request: HttpServerRequest.HttpServerRequest) =>
            Effect.succeed(HttpServerResponse.text(request.url)))
        )
        const body = yield* Effect.acquireUseRelease(
          Effect.sync(() =>
            HttpRouter.toWebHandler(routes, { disableLogger: true })
          ),
          ({ handler }) =>
            Effect.flatMap(
              Effect.promise(() => handler(new Request(`http://localhost${requestUrl}`))),
              (response) => Effect.promise(() => response.text())
            ),
          ({ dispose }) => Effect.promise(dispose)
        )

        assert.strictEqual(body, "/users")
      }))
  }
})
