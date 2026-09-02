import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

describe("HttpRouter", () => {
  it.each(["/api", "/api/"])("prefixRoute stores the matched prefix for %s", (prefix) => {
    const route = HttpRouter.prefixRoute(
      HttpRouter.route("GET", "/users", HttpServerResponse.text("ok")),
      prefix
    )
    assert.strictEqual(route.path, "/api/users")
    assert.deepStrictEqual(route.prefix, Option.some("/api"))
  })

  for (const registration of ["add", "addAll"] as const) {
    describe(registration, () => {
      for (
        const { name, prefix, prefixes } of [
          { name: "unprefixed root", prefixes: [], prefix: "" },
          { name: "root prefix", prefixes: ["/"], prefix: "" },
          { name: "normalized prefix", prefixes: ["/api"], prefix: "/api" },
          { name: "trailing-slash prefix", prefixes: ["/api/"], prefix: "/api" },
          { name: "normalized nested prefix", prefixes: ["/v1", "/api"], prefix: "/api/v1" },
          { name: "trailing-slash nested prefix", prefixes: ["/v1/", "/api"], prefix: "/api/v1" }
        ]
      ) {
        for (
          const { params, path, searchParams, url } of [
            { path: "/users", url: "/users?x=1", params: {}, searchParams: { x: "1" } },
            {
              path: "/users/:id",
              url: "/users/alice%20smith?x=1&x=2&name=hello%20world",
              params: { id: "alice smith" },
              searchParams: { x: ["1", "2"], name: "hello world" }
            }
          ] as const
        ) {
          it.effect(`${name} preserves the local URL for ${path}`, () =>
            Effect.gen(function*() {
              const routes = HttpRouter.use((router) => {
                for (const value of prefixes) {
                  router = router.prefixed(value)
                }
                const respond = (request: HttpServerRequest.HttpServerRequest) =>
                  Effect.gen(function*() {
                    const params = yield* HttpRouter.params
                    const searchParams = yield* HttpServerRequest.ParsedSearchParams
                    return HttpServerResponse.jsonUnsafe({ url: request.url, params, searchParams })
                  })
                return registration === "add"
                  ? router.add("GET", path, respond)
                  : router.addAll([HttpRouter.route("GET", path, respond)])
              })
              const { handler } = yield* Effect.acquireRelease(
                Effect.sync(() => HttpRouter.toWebHandler(routes, { disableLogger: true })),
                ({ dispose }) => Effect.promise(dispose)
              )
              const response = yield* Effect.promise(() => handler(new Request(`http://localhost${prefix}${url}`)))
              assert.strictEqual(response.status, 200)
              const body = yield* Effect.promise(() => response.json())
              assert.deepStrictEqual(body.params, params)
              assert.deepStrictEqual(body.searchParams, searchParams)
              assert.strictEqual(body.url, url)
            }))
        }
      }
    })
  }
})
