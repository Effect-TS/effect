import * as Http from "@effect/platform/HttpServer"
import { Stream } from "effect"
import { assert, describe, test } from "vitest"

describe("Http/App", () => {
  describe("toWebHandler", () => {
    test("json", async () => {
      const handler = Http.app.toWebHandler(Http.response.json({ foo: "bar" }))
      const response = await handler(new Request("http://localhost:3000/"))
      assert.deepStrictEqual(await response.json(), {
        foo: "bar"
      })
    })

    test("cookies", async () => {
      const handler = Http.app.toWebHandler(
        Http.response.unsafeJson({ foo: "bar" }).pipe(
          Http.response.unsafeSetCookie("foo", "bar"),
          Http.response.unsafeSetCookie("test", "123", { secure: true, httpOnly: true, sameSite: "strict" })
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
      const handler = Http.app.toWebHandler(Http.response.stream(Stream.make("foo", "bar").pipe(Stream.encodeText)))
      const response = await handler(new Request("http://localhost:3000/"))
      assert.strictEqual(await response.text(), "foobar")
    })
  })
})
