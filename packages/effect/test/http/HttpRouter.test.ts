import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Logger, Option, References, Tracer } from "effect"
import type { FindMyWay } from "effect/http"
import { HttpRouter, HttpServer, HttpServerError, HttpServerRequest, HttpServerResponse, UrlParams } from "effect/http"
import * as NetAddress from "effect/net/NetAddress"

const echoUrl = (request: HttpServerRequest.HttpServerRequest) => Effect.succeed(HttpServerResponse.text(request.url))

const layerPrefixed = (prefix: string) =>
  Layer.effect(
    HttpRouter.HttpRouter,
    Effect.map(HttpRouter.HttpRouter, (router) => router.prefixed(prefix))
  )

const fetchText = (
  app: Layer.Layer<never, never, HttpRouter.HttpRouter>,
  path: string,
  routerConfig?: Partial<FindMyWay.RouterConfig>
) =>
  Effect.acquireUseRelease(
    Effect.sync(() => HttpRouter.toWebHandler(app, { disableLogger: true, routerConfig })),
    ({ handler }) =>
      Effect.promise(async () => {
        const response = await handler(new Request(`http://localhost${path}`))
        return await response.text()
      }),
    ({ dispose }) => Effect.promise(dispose)
  )

describe("HttpRouter", () => {
  for (const first of ["static", "wildcard"] as const) {
    it.effect(`dispatches static and wildcard routes with ${first} registered first`, () =>
      Effect.gen(function*() {
        const exact = HttpRouter.route("GET", "/test", HttpServerResponse.text("static"))
        const wildcard = HttpRouter.route("GET", "/test/*", HttpServerResponse.text("wildcard"))
        const routes = HttpRouter.use(Effect.fn(function*(router) {
          for (const route of first === "static" ? [exact, wildcard] : [wildcard, exact]) {
            yield* router.addAll([route])
          }
        }))

        assert.strictEqual(yield* fetchText(routes, "/test"), "static")
        assert.strictEqual(yield* fetchText(routes, "/test/anything"), "wildcard")
      }))
  }

  for (const first of ["explicit", "wildcard"] as const) {
    it.effect(`rejects colliding regex patterns with ${first} registered first`, () =>
      Effect.gen(function*() {
        const router = yield* HttpRouter.make
        const explicit = HttpRouter.route("GET", "/files/:id(456)", HttpServerResponse.empty())
        const wildcard = HttpRouter.route("GET", "/files/:id(123)/*", HttpServerResponse.empty())
        const result = yield* Effect.exit(
          router.addAll(first === "explicit" ? [explicit, wildcard] : [wildcard, explicit])
        )
        assert.deepStrictEqual(result, Exit.die(new Error("Method 'GET' already declared for route '/files/:()'")))
      }))
  }

  it.effect("records redacted params in server spans and logs", () =>
    Effect.gen(function*() {
      const spans: Array<Tracer.NativeSpan> = []
      const tracer = Tracer.make({
        span(options) {
          const span = new Tracer.NativeSpan(options)
          spans.push(span)
          return span
        }
      })
      const urls: Array<unknown> = []
      const logger = Logger.make((options) => {
        urls.push(options.fiber.getRef(References.CurrentLogAnnotations)["http.url"])
      })
      const inner = yield* HttpRouter.toHttpEffect(
        HttpRouter.add("GET", "/:id/:secret", echoUrl, { redactedParams: ["secret"] })
      )
      const app = Layer.mergeAll(
        HttpRouter.add("GET", "/hooks/:id/:secret", echoUrl, { redactedParams: ["secret"] }),
        HttpRouter.add("GET", "/assets/*", echoUrl, { redactedParams: ["*"] }),
        // Nested regex capture shifts param indices, so all params are redacted.
        HttpRouter.add("GET", "/codes/:secret(^(a|b)\\d+)-:id", echoUrl, { redactedParams: ["secret"] }),
        HttpRouter.add("GET", "/named/:id(?<digits>\\d+)", echoUrl, { redactedParams: ["id"] }),
        HttpRouter.add("GET", "/opt/:p1-:p2?", echoUrl, { redactedParams: ["p2"] }),
        HttpRouter.add("GET", "*", echoUrl, { redactedParams: ["*"] }),
        HttpRouter.use((router) =>
          router.prefixed("/vault").add("*", "*", Effect.orDie(inner), { redactedParams: ["*"] })
        ),
        HttpRouter.use((router) => router.prefixed("/mounted").add("*", "*", Effect.orDie(inner)))
      )
      const context = Context.make(Tracer.Tracer, tracer).pipe(
        Context.add(Logger.CurrentLoggers, new Set([logger])),
        Context.add(UrlParams.CurrentRedactedNames, ["key"])
      )
      const bodies = yield* Effect.acquireUseRelease(
        Effect.sync(() => HttpRouter.toWebHandler(app)),
        ({ handler }) =>
          Effect.promise(async () => {
            const out: Array<string> = []
            for (
              const path of [
                "/hooks/123/s3cret?key=q",
                "/assets/tok/site.css",
                "/codes/a1-7",
                "/named/12",
                "/opt",
                "/other/s3cret",
                "/vault/1/s3cret",
                "/mounted/1/s3cret"
              ]
            ) {
              const response = await handler(new Request(`http://localhost${path}`), context)
              out.push(await response.text())
            }
            return out
          }),
        ({ dispose }) => Effect.promise(dispose)
      )

      const expectedPaths = [
        "/hooks/123/REDACTED",
        "/assets/REDACTED",
        "/codes/REDACTED-REDACTED",
        "/named/REDACTED",
        "/opt",
        "/REDACTED",
        "/vault/REDACTED",
        "/mounted/1/REDACTED"
      ]
      assert.strictEqual(bodies[0], "/hooks/123/s3cret?key=q")
      assert.deepStrictEqual(urls, expectedPaths)
      assert.deepStrictEqual(spans.map((span) => span.attributes.get("url.path")), expectedPaths)
      assert.strictEqual(spans[0].attributes.get("url.full"), "http://localhost/hooks/123/REDACTED?key=REDACTED")
    }))

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

    for (
      const { name, subApp } of [
        { name: "only serves sub-app routes through the mount", subApp: Admin },
        {
          name: "only serves routes of a sub-app that provides HttpRouter.layer through the mount",
          subApp: Admin.pipe(Layer.provide(HttpRouter.layer))
        }
      ]
    ) {
      it(name, async () => {
        const app = HttpRouter.use(Effect.fnUntraced(function*(router) {
          const admin = yield* HttpRouter.toHttpEffect(subApp)
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
    }

    it("mounts a sub-app at one of its own routes", async () => {
      const app = HttpRouter.use(Effect.fnUntraced(function*(router) {
        const admin = yield* HttpRouter.toHttpEffect(Admin)
        yield* router.add("GET", "/admin/stats", Effect.orDie(admin))
      }))

      assert.deepStrictEqual(await request(app), { status: 200, body: "admin stats" })
    })
  })

  it.effect("serve does not reuse an HttpRouter.layer memoized outside it", () =>
    Effect.gen(function*() {
      let serverHandler: Effect.Effect<HttpServerResponse.HttpServerResponse, unknown, any> | undefined
      const server = HttpServer.make({
        address: NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, 0),
        serve: (handler) => Effect.sync(() => void (serverHandler = handler))
      })
      const outside = HttpRouter.add("GET", "/outside", HttpServerResponse.text("outside")).pipe(
        Layer.provide(HttpRouter.layer)
      )
      const app = HttpRouter.serve(HttpRouter.add("GET", "/inside", HttpServerResponse.text("inside")), {
        disableLogger: true,
        disableListenLog: true
      }).pipe(
        Layer.provideMerge(outside),
        Layer.provide(Layer.succeed(HttpServer.HttpServer)(server))
      )
      yield* Layer.build(app)
      const status = (path: string) =>
        serverHandler!.pipe(
          Effect.catchCause((cause) => Effect.map(HttpServerError.causeResponse(cause), ([response]) => response)),
          Effect.map((response) => response.status),
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromWeb(new Request(`http://localhost${path}`))
          )
        )

      assert.strictEqual(yield* status("/inside"), 200)
      assert.strictEqual(yield* status("/outside"), 404)
    }))

  for (const ignoreDuplicateSlashes of [true, false]) {
    it.effect(`preserves the local URL with ignoreDuplicateSlashes=${ignoreDuplicateSlashes}`, () =>
      Effect.gen(function*() {
        const routes = HttpRouter.use((router) => router.prefixed("/api//v1").add("GET", "/users", echoUrl))

        const body = yield* fetchText(
          routes,
          ignoreDuplicateSlashes ? "/api/v1/users?x=1" : "/api//v1/users?x=1",
          { ignoreDuplicateSlashes }
        )

        assert.strictEqual(body, "/users?x=1")
      }))
  }

  it.effect("removes a matched prefix containing ; when useSemicolonDelimiter is false", () =>
    Effect.gen(function*() {
      const routes = HttpRouter.use((router) => router.prefixed("/tenants/:tenant").add("GET", "/users", echoUrl))

      const body = yield* fetchText(routes, "/tenants/acme;v=1/users?x=1", { useSemicolonDelimiter: false })

      assert.strictEqual(body, "/users?x=1")
    }))

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
