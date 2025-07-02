import { HttpApp, HttpServerResponse } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, FiberRef, Runtime, Stream } from "effect"

describe("Http/App", () => {
  describe("toWebHandler", () => {
    test("json", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.json({ foo: "bar" }))
      const response = await handler(new Request("http://localhost:3000/"))
      deepStrictEqual(await response.json(), {
        foo: "bar"
      })
    })

    test("cookies", async () => {
      const handler = HttpApp.toWebHandler(
        HttpServerResponse.unsafeJson({ foo: "bar" }).pipe(
          HttpServerResponse.unsafeSetCookie("foo", "bar"),
          HttpServerResponse.unsafeSetCookie("test", "123", { secure: true, httpOnly: true, sameSite: "strict" })
        )
      )
      const response = await handler(new Request("http://localhost:3000/"))
      deepStrictEqual(response.headers.getSetCookie(), [
        "foo=bar",
        "test=123; HttpOnly; Secure; SameSite=Strict"
      ])
      deepStrictEqual(await response.json(), {
        foo: "bar"
      })
    })

    test("stream", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.stream(Stream.make("foo", "bar").pipe(Stream.encodeText)))
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(await response.text(), "foobar")
    })

    test("stream scope", async () => {
      let streamFinalized = 0
      let handlerFinalized = 0
      const handler = HttpApp.toWebHandler(Effect.gen(function*() {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            handlerFinalized = Date.now()
          })
        )
        const stream = Stream.make("foo", "bar").pipe(
          Stream.encodeText,
          Stream.ensuring(Effect.sync(() => {
            streamFinalized = Date.now()
          }))
        )
        return HttpServerResponse.stream(stream)
      }))
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(await response.text(), "foobar")
      strictEqual(streamFinalized < handlerFinalized, true)
    })

    test("stream runtime", async () => {
      const handler = HttpApp.toWebHandlerRuntime(
        Runtime.defaultRuntime.pipe(
          Runtime.setFiberRef(FiberRef.currentConcurrency, 420)
        )
      )(HttpServerResponse.stream(
        FiberRef.get(FiberRef.currentConcurrency).pipe(Stream.map(String), Stream.encodeText)
      ))
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(await response.text(), "420")
    })
  })

  test("custom context", async () => {
    class Env extends Context.Reference<Env>()("Env", {
      defaultValue: () => ({ foo: "bar" })
    }) {}
    const handler = HttpApp.toWebHandler(Effect.gen(function*() {
      const env = yield* Env
      return yield* HttpServerResponse.json(env)
    }))
    const response = await handler(new Request("http://localhost:3000/"), Env.context({ foo: "baz" }))
    deepStrictEqual(await response.json(), {
      foo: "baz"
    })
  })
})
