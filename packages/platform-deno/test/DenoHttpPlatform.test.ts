import * as DenoHttpPlatform from "@effect/platform-deno/DenoHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"

const fixture = `${import.meta.dirname}/fixtures/text.txt`

const readStream = (stream: ReadableStream<Uint8Array>) => Effect.promise(() => new globalThis.Response(stream).text())

describe("DenoHttpPlatform", () => {
  it.effect("fileResponse reads exact bytesToRead", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse(fixture, {
        offset: 6,
        bytesToRead: 5
      })

      assert.strictEqual(response.headers["content-length"], "5")
      assert.strictEqual(response.body._tag, "Raw")
      const body = (response.body as HttpBody.Raw).body
      assert(body instanceof ReadableStream)

      const text = yield* readStream(body)
      assert.strictEqual(text, "ipsum")
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))

  it.effect("fileResponse supports zero bytesToRead", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse(fixture, {
        offset: 6,
        bytesToRead: 0
      })

      assert.strictEqual(response.headers["content-length"], "0")
      assert.strictEqual(response.body._tag, "Raw")
      const body = (response.body as HttpBody.Raw).body
      assert(body instanceof ReadableStream)

      const text = yield* readStream(body)
      assert.strictEqual(text, "")
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))
})
