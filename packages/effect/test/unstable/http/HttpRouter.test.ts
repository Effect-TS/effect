import { assert, it } from "@effect/vitest"
import { Context, Effect, Exit, Fiber } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

it("passes the request and matched params to callback routes", async () => {
  let paramsPrototype: object | null | undefined
  const { dispose, handler } = HttpRouter.toWebHandler(
    HttpRouter.add("GET", "/users/:id", (request, params) => {
      paramsPrototype = Object.getPrototypeOf(params)
      return Effect.gen(function*() {
        const contextParams = yield* HttpRouter.params
        const searchParams = yield* HttpServerRequest.ParsedSearchParams
        return HttpServerResponse.jsonUnsafe({
          url: request.url,
          id: params.id,
          contextId: contextParams.id,
          active: searchParams.active
        })
      })
    }),
    { disableLogger: true }
  )

  try {
    const response = await handler(new Request("http://localhost/users/42?active=true"))
    assert.deepStrictEqual(await response.json(), {
      url: "/users/42?active=true",
      id: "42",
      contextId: "42",
      active: "true"
    })
    assert.strictEqual(paramsPrototype, null)
  } finally {
    await dispose()
  }
})

it("uses a replaced handler on a spread route", async () => {
  const original = HttpRouter.route("GET", "/", () => Effect.succeed(HttpServerResponse.text("original")))
  const replacement = {
    ...original,
    handler: Effect.succeed(HttpServerResponse.text("replacement"))
  }
  const { dispose, handler } = HttpRouter.toWebHandler(HttpRouter.addAll([replacement]), { disableLogger: true })

  try {
    const response = await handler(new Request("http://localhost/"))
    assert.strictEqual(await response.text(), "replacement")
  } finally {
    await dispose()
  }
})

it.effect("restores route context when a callback throws", () =>
  Effect.gen(function*() {
    const router = yield* HttpRouter.make
    const defect = new Error("boom")
    yield* router.add("GET", "/", (): Effect.Effect<never> => {
      throw defect
    })
    const request = HttpServerRequest.fromWeb(new Request("http://localhost/"))

    yield* Effect.gen(function*() {
      const before = yield* Effect.withFiber((fiber) => Effect.succeed(fiber.context))
      const exit = yield* Effect.exit(router.asHttpEffect())
      const after = yield* Effect.withFiber((fiber) => Effect.succeed(fiber.context))

      assert.isTrue(Exit.hasDies(exit))
      assert.strictEqual(after, before)
      assert.isUndefined(Context.getOrUndefined(after, HttpRouter.RouteContext))
    }).pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, request))
  }))

it.effect("observes pending interruption before invoking a route callback", () =>
  Effect.gen(function*() {
    const router = yield* HttpRouter.make
    let invoked = false
    yield* router.add("GET", "/", () => {
      invoked = true
      return Effect.succeed(HttpServerResponse.empty())
    })
    const request = HttpServerRequest.fromWeb(new Request("http://localhost/"))

    const fiber = yield* Effect.uninterruptible(
      Effect.withFiber((fiber) => {
        fiber.interruptUnsafe(fiber.id)
        return router.asHttpEffect()
      })
    ).pipe(
      Effect.provideService(HttpServerRequest.HttpServerRequest, request),
      Effect.forkChild
    )
    const exit = yield* Fiber.await(fiber)

    assert.isTrue(Exit.hasInterrupts(exit))
    assert.isFalse(invoked)
  }))
