import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Logger, Option, References } from "effect"
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

  it("disableLogger is a Layer", () => {
    assert.isTrue(Layer.isLayer(HttpRouter.disableLogger))
  })

  it.effect("disableLogger suppresses response logging only for the routes it is provided to", () =>
    Effect.gen(function*() {
      const logs: Array<Record<string, unknown>> = []
      const logger = Logger.make<unknown, void>((options) => {
        logs.push({ ...options.fiber.getRef(References.CurrentLogAnnotations) })
      })

      const Silent = HttpRouter.add("GET", "/silent", HttpServerResponse.text("silent")).pipe(
        Layer.provide(HttpRouter.disableLogger)
      )
      const Loud = HttpRouter.add("GET", "/loud", HttpServerResponse.text("loud"))
      const App = Layer.mergeAll(Silent, Loud, Logger.layer([logger]))

      yield* Effect.acquireUseRelease(
        Effect.sync(() => HttpRouter.toWebHandler(App)),
        ({ handler }) =>
          Effect.promise(async () => {
            await handler(new Request("http://localhost/silent"))
            await handler(new Request("http://localhost/loud"))
          }),
        ({ dispose }) => Effect.promise(dispose)
      )

      assert.strictEqual(logs.length, 1)
      assert.strictEqual(logs[0]?.["http.url"], "/loud")
    }))
})
