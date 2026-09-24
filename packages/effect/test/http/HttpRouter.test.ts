import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Layer, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"

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
  it("isolates toWebHandler routes even with a shared memo map", async () => {
    const memoMap = Layer.makeMemoMapUnsafe()
    const publicHandler = HttpRouter.toWebHandler(
      HttpRouter.add("GET", "/public", HttpServerResponse.text("public")),
      { memoMap, disableLogger: true }
    )
    const internalHandler = HttpRouter.toWebHandler(
      HttpRouter.add("GET", "/internal", HttpServerResponse.text("internal")),
      { memoMap, disableLogger: true }
    )
    try {
      const status = (handler: typeof publicHandler.handler, path: string) =>
        handler(new Request("http://localhost" + path)).then((response) => response.status)
      assert.strictEqual(await status(publicHandler.handler, "/public"), 200)
      assert.strictEqual(await status(internalHandler.handler, "/internal"), 200)
      assert.strictEqual(await status(publicHandler.handler, "/internal"), 404)
      assert.strictEqual(await status(internalHandler.handler, "/public"), 404)
    } finally {
      await Promise.all([publicHandler.dispose(), internalHandler.dispose()])
    }
  })

  it.effect("isolates toHttpEffect routes with a shared memo map", () =>
    Effect.gen(function*() {
      const memoMap = Layer.makeMemoMapUnsafe()
      const publicHandler = yield* HttpRouter.toHttpEffect(
        HttpRouter.add("GET", "/public", HttpServerResponse.text("public")),
        { memoMap }
      )
      const internalHandler = yield* HttpRouter.toHttpEffect(
        HttpRouter.add("GET", "/internal", HttpServerResponse.text("internal")),
        { memoMap }
      )
      const status = (handler: typeof publicHandler, path: string) =>
        handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request("http://localhost" + path))
          ),
          Effect.map((response) => response.status)
        )
      assert.strictEqual(yield* status(publicHandler, "/public"), 200)
      assert.strictEqual(yield* status(internalHandler, "/internal"), 200)
      const publicMiss = yield* Effect.exit(status(publicHandler, "/internal"))
      const internalMiss = yield* Effect.exit(status(internalHandler, "/public"))
      assert.isTrue(Exit.isFailure(publicMiss))
      assert.isTrue(Exit.isFailure(internalMiss))
      if (Exit.isFailure(publicMiss)) assert.match(Cause.pretty(publicMiss.cause), /RouteNotFound/)
      if (Exit.isFailure(internalMiss)) assert.match(Cause.pretty(internalMiss.cause), /RouteNotFound/)
    }).pipe(Effect.scoped))

  it("rejects an app that outputs a foreign router in toWebHandler", async () => {
    const app = Layer.succeed(HttpRouter.HttpRouter, {} as HttpRouter.HttpRouter)
    const { dispose, handler } = HttpRouter.toWebHandler(app as Layer.Layer<never>, { disableLogger: true })
    try {
      await expect(handler(new Request("http://localhost/"))).rejects.toThrow(/foreign.*router/i)
    } finally {
      await dispose()
    }
  })

  it.effect("rejects an app that outputs a foreign router in toHttpEffect", () =>
    Effect.gen(function*() {
      const app = Layer.succeed(HttpRouter.HttpRouter, {} as HttpRouter.HttpRouter)
      const exit = yield* Effect.exit(HttpRouter.toHttpEffect(app as Layer.Layer<never>))
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) assert.match(Cause.pretty(exit.cause), /foreign.*router/i)
    }).pipe(Effect.scoped))

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
})
