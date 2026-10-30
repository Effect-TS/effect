import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { HttpRouter, HttpServerError, HttpServerRequest, HttpServerResponse } from "effect/http"

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

  it("toWebHandler shares in-progress disposal", async () => {
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const { dispose, handler } = HttpRouter.toWebHandler(
      Layer.effectDiscard(Effect.addFinalizer(() =>
        Effect.promise(async () => {
          started.resolve()
          await release.promise
        })
      )),
      { disableLogger: true }
    )
    await handler(new Request("http://localhost/"))

    const first = dispose()
    await started.promise
    const second = dispose()
    release.resolve()
    await Promise.all([first, second])
    assert.strictEqual(second, first)
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

  it.effect("routes a query-only URL to the root of a router mounted under a prefix", () =>
    Effect.gen(function*() {
      const admin = yield* HttpRouter.toHttpEffect(HttpRouter.use((router) => router.add("GET", "/", echoUrl)))
      const routes = HttpRouter.use((router) => router.prefixed("/admin").add("*", "*", Effect.orDie(admin)))

      const body = yield* fetchText(routes, "/admin?tab=1")

      assert.strictEqual(body, "/?tab=1")
    }))

  describe("toHttpEffect sub-apps", () => {
    const Admin = HttpRouter.add("GET", "/admin/stats", HttpServerResponse.text("admin stats"))

    const request = async (app: Layer.Layer<never, never, HttpRouter.HttpRouter>, init?: RequestInit) => {
      const { dispose, handler } = HttpRouter.toWebHandler(app, { disableLogger: true })
      try {
        const response = await handler(new Request("http://localhost/admin/stats", init))
        return { status: response.status, body: await response.text() }
      } finally {
        await dispose()
      }
    }

    it("only serves sub-app routes through the mount", async () => {
      const app = HttpRouter.use(Effect.fnUntraced(function*(router) {
        const admin = yield* HttpRouter.toHttpEffect(Admin)
        yield* router.add(
          "*",
          "/admin/*",
          Effect.gen(function*() {
            const request = yield* HttpServerRequest.HttpServerRequest
            if (request.headers.authorization !== "Bearer admin") {
              return HttpServerResponse.text("unauthorized", { status: 401 })
            }
            return yield* Effect.orDie(admin)
          })
        )
      }))

      assert.deepStrictEqual(await request(app), { status: 401, body: "unauthorized" })
      assert.deepStrictEqual(await request(app, { headers: { authorization: "Bearer admin" } }), {
        status: 200,
        body: "admin stats"
      })
    })

    it("mounts a sub-app at one of its own routes", async () => {
      const app = HttpRouter.use(Effect.fnUntraced(function*(router) {
        const admin = yield* HttpRouter.toHttpEffect(Admin)
        yield* router.add("GET", "/admin/stats", Effect.orDie(admin))
      }))

      assert.deepStrictEqual(await request(app), { status: 200, body: "admin stats" })
    })
  })

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

  it.effect("describes route misses caused by maxParamLength", () =>
    Effect.gen(function*() {
      const lookup = (method: string, path: string) =>
        Effect.gen(function*() {
          const router = yield* HttpRouter.HttpRouter
          yield* router.add("GET", "/addresses/:address", HttpServerResponse.text("ok"))
          return yield* router.asHttpEffect()
        }).pipe(
          Effect.provide(HttpRouter.layer),
          Effect.provideService(HttpRouter.RouterConfig, { maxParamLength: 5 }),
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request(`http://localhost${path}`, { method }))
          ),
          Effect.scoped
        )
      const notFound = (method: string, path: string) =>
        lookup(method, path).pipe(
          Effect.flip,
          Effect.map((error) => {
            assert.instanceOf(error, HttpServerError.HttpServerError)
            assert.instanceOf(error.reason, HttpServerError.RouteNotFound)
            return error.reason.description
          })
        )

      const response = yield* lookup("GET", "/addresses/abcde")
      assert.strictEqual(response.status, 200)
      assert.strictEqual(
        yield* notFound("GET", "/addresses/abcdef"),
        "path parameter is longer than maxParamLength (5)"
      )
      assert.strictEqual(
        yield* notFound("HEAD", "/addresses/abcdef"),
        "path parameter is longer than maxParamLength (5)"
      )
      assert.isUndefined(yield* notFound("GET", "/missing"))
    }))
})
