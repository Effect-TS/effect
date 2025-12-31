import { HttpApp, HttpServerResponse } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, FiberRef, Runtime, Stream } from "effect"
import * as Layer from "effect/Layer"

describe("Http/App", () => {
  describe("toWebHandler", () => {
    test("json", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.json({ foo: "bar" }))
      const response = await handler(new Request("http://localhost:3000/"))
      deepStrictEqual(await response.json(), {
        foo: "bar"
      })
    })

    test("json preserves content-type", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.json({ foo: "bar" }))
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(response.headers.get("Content-Type"), "application/json")
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
      let order = 0
      let streamFinalized = 0
      let handlerFinalized = 0
      const handler = HttpApp.toWebHandler(Effect.gen(function*() {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            handlerFinalized = order
            order += 1
          })
        )
        const stream = Stream.make("foo", "bar").pipe(
          Stream.encodeText,
          Stream.ensuring(Effect.sync(() => {
            streamFinalized = order
            order += 1
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

    test("stream layer", async () => {
      const { handler } = HttpApp.toWebHandlerLayer(
        HttpServerResponse.stream(
          FiberRef.get(FiberRef.currentConcurrency).pipe(Stream.map(String), Stream.encodeText)
        ),
        Layer.locallyScoped(FiberRef.currentConcurrency, 420)
      )
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

  describe("fromWebHandler", () => {
    test("basic GET request", async () => {
      const webHandler = async (request: Request) => {
        return new Response(`Hello from ${request.url}`, {
          status: 200,
          headers: { "Content-Type": "text/plain" }
        })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(new Request("http://localhost:3000/hello"))
      strictEqual(response.status, 200)
      strictEqual(await response.text(), "Hello from http://localhost:3000/hello")
    })

    test("POST with JSON body", async () => {
      const webHandler = async (request: Request) => {
        const body = await request.json()
        return Response.json({ received: body })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(
        new Request("http://localhost:3000/", {
          method: "POST",
          body: JSON.stringify({ message: "hello" }),
          headers: { "Content-Type": "application/json" }
        })
      )
      deepStrictEqual(await response.json(), {
        received: { message: "hello" }
      })
    })

    test("preserves request headers", async () => {
      const webHandler = async (request: Request) => {
        return Response.json({
          authorization: request.headers.get("Authorization"),
          custom: request.headers.get("X-Custom-Header")
        })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(
        new Request("http://localhost:3000/", {
          headers: {
            "Authorization": "Bearer token123",
            "X-Custom-Header": "custom-value"
          }
        })
      )
      deepStrictEqual(await response.json(), {
        authorization: "Bearer token123",
        custom: "custom-value"
      })
    })

    test("preserves response status and headers", async () => {
      const webHandler = async (_request: Request) => {
        return new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
          headers: {
            "X-Error-Code": "RESOURCE_NOT_FOUND",
            "Content-Type": "text/plain"
          }
        })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(new Request("http://localhost:3000/missing"))
      strictEqual(response.status, 404)
      strictEqual(response.headers.get("X-Error-Code"), "RESOURCE_NOT_FOUND")
      strictEqual(await response.text(), "Not Found")
    })

    test("round-trip with toWebHandler", async () => {
      // Create an Effect app, convert to web handler, then back to Effect app
      const originalApp = HttpServerResponse.json({ source: "effect" })
      const webHandler = HttpApp.toWebHandler(originalApp)
      const wrappedApp = HttpApp.fromWebHandler(webHandler)
      const finalHandler = HttpApp.toWebHandler(wrappedApp)

      const response = await finalHandler(new Request("http://localhost:3000/"))
      deepStrictEqual(await response.json(), { source: "effect" })
    })

    test("preserves response content-type header", async () => {
      const webHandler = async (_request: Request) => {
        return Response.json({ message: "hello" })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(response.headers.get("Content-Type"), "application/json")
      deepStrictEqual(await response.json(), { message: "hello" })
    })

    test("preserves custom content-type header", async () => {
      const webHandler = async (_request: Request) => {
        return new Response("<html></html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        })
      }
      const app = HttpApp.fromWebHandler(webHandler)
      const handler = HttpApp.toWebHandler(app)
      const response = await handler(new Request("http://localhost:3000/"))
      strictEqual(response.headers.get("Content-Type"), "text/html; charset=utf-8")
    })
  })
})
