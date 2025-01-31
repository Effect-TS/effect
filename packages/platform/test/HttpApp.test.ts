import { HttpApp, HttpServerResponse } from "@effect/platform"
import { deepStrictEqual, strictEqual } from "@effect/platform/test/util"
import { Context, Effect, FiberRef, Runtime, Stream } from "effect"
import { describe, test } from "vitest"

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
