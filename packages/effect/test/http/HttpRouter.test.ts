import { assert, describe, it } from "@effect/vitest"
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
  it("registers fresh shared routes on both web handlers with a shared memo map", async () => {
    const memoMap = Layer.makeMemoMapUnsafe()
    const health = HttpRouter.add("GET", "/health", HttpServerResponse.text("healthy"))
    const publicHandler = HttpRouter.toWebHandler(
      Layer.mergeAll(HttpRouter.add("GET", "/public", HttpServerResponse.text("public")), Layer.fresh(health)),
      { memoMap, disableLogger: true }
    )
    const internalHandler = HttpRouter.toWebHandler(
      Layer.mergeAll(HttpRouter.add("GET", "/internal", HttpServerResponse.text("internal")), Layer.fresh(health)),
      { memoMap, disableLogger: true }
    )
    try {
      const status = (handler: typeof publicHandler.handler, path: string) =>
        handler(new Request("http://localhost" + path)).then((response) => response.status)
      assert.strictEqual(await status(publicHandler.handler, "/health"), 200)
      assert.strictEqual(await status(internalHandler.handler, "/health"), 200)
      assert.strictEqual(await status(publicHandler.handler, "/internal"), 404)
      assert.strictEqual(await status(internalHandler.handler, "/public"), 404)
    } finally {
      await Promise.all([publicHandler.dispose(), internalHandler.dispose()])
    }
  })

  it.effect("registers fresh shared routes on both HTTP effects with a shared memo map", () =>
    Effect.gen(function*() {
      const memoMap = Layer.makeMemoMapUnsafe()
      const health = HttpRouter.add("GET", "/health", HttpServerResponse.text("healthy"))
      const publicHandler = yield* HttpRouter.toHttpEffect(
        Layer.mergeAll(HttpRouter.add("GET", "/public", HttpServerResponse.text("public")), Layer.fresh(health)),
        { memoMap }
      )
      const internalHandler = yield* HttpRouter.toHttpEffect(
        Layer.mergeAll(HttpRouter.add("GET", "/internal", HttpServerResponse.text("internal")), Layer.fresh(health)),
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
      assert.strictEqual(yield* status(publicHandler, "/health"), 200)
      assert.strictEqual(yield* status(internalHandler, "/health"), 200)
      const publicMiss = yield* Effect.exit(status(publicHandler, "/internal"))
      const internalMiss = yield* Effect.exit(status(internalHandler, "/public"))
      assert.isTrue(Exit.isFailure(publicMiss))
      assert.isTrue(Exit.isFailure(internalMiss))
      if (Exit.isFailure(publicMiss)) assert.match(Cause.pretty(publicMiss.cause), /RouteNotFound/)
      if (Exit.isFailure(internalMiss)) assert.match(Cause.pretty(internalMiss.cause), /RouteNotFound/)
    }).pipe(Effect.scoped))

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

  it("serves its own router when the app outputs another router in toWebHandler", async () => {
    const foreign = Layer.effect(
      HttpRouter.HttpRouter,
      Effect.gen(function*() {
        yield* (yield* HttpRouter.HttpRouter).add("GET", "/own", HttpServerResponse.text("own"))
        const router = yield* HttpRouter.make
        yield* router.add("GET", "/foreign", HttpServerResponse.text("foreign"))
        return router
      })
    )
    const { dispose, handler } = HttpRouter.toWebHandler(foreign, { disableLogger: true })
    try {
      assert.strictEqual((await handler(new Request("http://localhost/own"))).status, 200)
      assert.strictEqual((await handler(new Request("http://localhost/foreign"))).status, 404)
    } finally {
      await dispose()
    }
  })

  it.effect("serves its own router when the app outputs another router in toHttpEffect", () =>
    Effect.gen(function*() {
      const foreign = Layer.effect(
        HttpRouter.HttpRouter,
        Effect.gen(function*() {
          yield* (yield* HttpRouter.HttpRouter).add("GET", "/own", HttpServerResponse.text("own"))
          const router = yield* HttpRouter.make
          yield* router.add("GET", "/foreign", HttpServerResponse.text("foreign"))
          return router
        })
      )
      const handler = yield* HttpRouter.toHttpEffect(foreign)
      const status = (path: string) =>
        handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request("http://localhost" + path))
          ),
          Effect.map((response) => response.status)
        )
      assert.strictEqual(yield* status("/own"), 200)
      const foreignMiss = yield* Effect.exit(status("/foreign"))
      assert.isTrue(Exit.isFailure(foreignMiss))
      if (Exit.isFailure(foreignMiss)) assert.match(Cause.pretty(foreignMiss.cause), /RouteNotFound/)
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
