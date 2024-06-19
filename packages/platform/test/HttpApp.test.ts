import { HttpApp, HttpServerResponse } from "@effect/platform"
import { Stream } from "effect"
import { assert, describe, test } from "vitest"

describe("Http/App", () => {
  describe("toWebHandler", () => {
    test("json", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.json({ foo: "bar" }))
      const response = await handler(new Request("http://localhost:3000/"))
      assert.deepStrictEqual(await response.json(), {
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
      assert.deepStrictEqual(response.headers.getSetCookie(), [
        "foo=bar",
        "test=123; HttpOnly; Secure; SameSite=Strict"
      ])
      assert.deepStrictEqual(await response.json(), {
        foo: "bar"
      })
    })

    test("stream", async () => {
      const handler = HttpApp.toWebHandler(HttpServerResponse.stream(Stream.make("foo", "bar").pipe(Stream.encodeText)))
      const response = await handler(new Request("http://localhost:3000/"))
      assert.strictEqual(await response.text(), "foobar")
    })
  })
})
