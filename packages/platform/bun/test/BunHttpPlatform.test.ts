import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as ByteSize from "effect/ByteSize"
import * as Effect from "effect/Effect"
import type * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"

const readBody = (body: HttpBody.HttpBody) => {
  assert.strictEqual(body._tag, "Raw")
  return Effect.promise(() => new Response((body as HttpBody.Raw).body as BodyInit).text())
}

describe("BunHttpPlatform", () => {
  it.effect("fileWebResponse honors offset and bytesToRead including zero", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const file = new File(["abcd"], "file.txt", { type: "text/plain", lastModified: 0 })
      const sliced = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 2 })
      const empty = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 0 })
      const clamped = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 10 })

      assert.deepStrictEqual(
        {
          sliced: yield* readBody(sliced.body),
          empty: yield* readBody(empty.body),
          clamped: yield* readBody(clamped.body)
        },
        { sliced: "bc", empty: "", clamped: "bcd" }
      )
    }).pipe(Effect.provide(BunHttpPlatform.layer)))

  it.effect("fileResponse supports exact and empty ranges", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const exact = yield* platform.fileResponse(import.meta.filename, {
        bytesToRead: ByteSize.bytes(6)
      })
      const empty = yield* platform.fileResponse(import.meta.filename, {
        offset: ByteSize.bytes(1),
        bytesToRead: ByteSize.zero
      })

      assert.deepStrictEqual(
        { exact: yield* readBody(exact.body), empty: yield* readBody(empty.body) },
        { exact: "import", empty: "" }
      )
    }).pipe(Effect.provide(BunHttpPlatform.layer)))
})
