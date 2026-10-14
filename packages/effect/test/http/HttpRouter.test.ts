import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, type HttpServerRequest, HttpServerResponse } from "effect/http"

const echoUrl = (request: HttpServerRequest.HttpServerRequest) => Effect.succeed(HttpServerResponse.text(request.url))

const layerPrefixed = (prefix: string) =>
  Layer.effect(
    HttpRouter.HttpRouter,
    Effect.map(HttpRouter.HttpRouter, (router) => router.prefixed(prefix))
  )

const fetchText = (app: Layer.Layer<never, never, HttpRouter.HttpRouter>, path: string) =>
  Effect.acquireUseRelease(
    Effect.sync(() => HttpRouter.toWebHandler(app, { disableLogger: true })),
    ({ handler }) =>
      Effect.promise(async () => {
        const response = await handler(new Request(`http://localhost${path}`))
        return await response.text()
      }),
    ({ dispose }) => Effect.promise(dispose)
  )

describe("HttpRouter", () => {
  it("normalizes the prefix stored by prefixRoute", () => {
    const route = HttpRouter.prefixRoute(
      HttpRouter.route("GET", "/users", HttpServerResponse.text("ok")),
      "/api/"
    )

    assert.deepStrictEqual(route.prefix, Option.some("/api"))
  })

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

  for (
    const { prefix, requestUrl } of [
      { prefix: "/", requestUrl: "/users" },
      { prefix: "/api/", requestUrl: "/api/users" }
    ]
  ) {
    it.effect(`preserves the local URL for the ${prefix} prefix`, () =>
      Effect.gen(function*() {
        const routes = HttpRouter.use((router) => router.prefixed(prefix).add("GET", "/users", echoUrl))

        const body = yield* fetchText(routes, requestUrl)

        assert.strictEqual(body, "/users")
      }))
  }

  for (
    const { prefix, requestUrl, expected } of [
      { prefix: "/tenants/:tenant", requestUrl: "/tenants/a/users?x=1", expected: "/users?x=1" },
      { prefix: "/tenants/:tenant([^/]+)", requestUrl: "/tenants/acme/users?x=1", expected: "/users?x=1" },
      { prefix: "/café", requestUrl: "/caf%C3%A9/users", expected: "/users" }
    ]
  ) {
    it.effect(`removes the matched ${prefix} prefix from ${requestUrl}`, () =>
      Effect.gen(function*() {
        const routes = HttpRouter.use((router) => router.prefixed(prefix).add("GET", "/users", echoUrl))

        const body = yield* fetchText(routes, requestUrl)

        assert.strictEqual(body, expected)
      }))
  }

  for (const ignoreDuplicateSlashes of [true, false]) {
    it.effect(`preserves the local URL with ignoreDuplicateSlashes=${ignoreDuplicateSlashes}`, () =>
      Effect.gen(function*() {
        const routes = HttpRouter.use((router) => router.prefixed("/api//v1").add("GET", "/users", echoUrl)).pipe(
          Layer.provide(
            Layer.succeed(HttpRouter.RouterConfig)(ignoreDuplicateSlashes ? {} : { ignoreDuplicateSlashes })
          )
        )

        const body = yield* fetchText(routes, ignoreDuplicateSlashes ? "/api/v1/users?x=1" : "/api//v1/users?x=1")

        assert.strictEqual(body, "/users?x=1")
      }))
  }

  it.effect("nests a prefixed sub-router beneath a prefixed parent router", () =>
    Effect.gen(function*() {
      const routes = HttpRouter.use((router) => router.prefixed("/app").add("GET", "/users", echoUrl)).pipe(
        Layer.provide(layerPrefixed("/api"))
      )

      const body = yield* fetchText(routes, "/api/app/users")

      assert.strictEqual(body, "/users")
    }))

  it.effect("nests a prefixRoute prefix beneath a prefixed parent router", () =>
    Effect.gen(function*() {
      const users = HttpRouter.prefixRoute(HttpRouter.route("GET", "/users", echoUrl), "/app")
      const routes = HttpRouter.use((router) => router.addAll([users])).pipe(
        Layer.provide(layerPrefixed("/api"))
      )

      const body = yield* fetchText(routes, "/api/app/users")

      assert.strictEqual(body, "/users")
    }))
})
