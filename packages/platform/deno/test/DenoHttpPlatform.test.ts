import * as DenoFileSystem from "@effect/platform-deno/DenoFileSystem"
import * as DenoHttpPlatform from "@effect/platform-deno/DenoHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as ByteSize from "effect/ByteSize"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Etag from "effect/unstable/http/Etag"
import type * as HttpBody from "effect/unstable/http/HttpBody"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"

const fixture = `${import.meta.dirname}/fixtures/text.txt`

const readStream = (stream: ReadableStream<Uint8Array>) => Effect.promise(() => new globalThis.Response(stream).text())

const readBody = (body: HttpBody.HttpBody) => {
  assert.strictEqual(body._tag, "Raw")
  return Effect.promise(() => new Response((body as HttpBody.Raw).body as BodyInit).text())
}

describe("DenoHttpPlatform", () => {
  it.effect("fileResponse preserves open failures as defects after stat succeeds", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const info = yield* fs.stat(fixture)
      const platform = yield* DenoHttpPlatform.make.pipe(
        Effect.provideService(
          FileSystem.FileSystem,
          FileSystem.makeNoop({
            stat: () => Effect.succeed(info)
          })
        ),
        Effect.provide(Etag.layer)
      )

      const exit = yield* Effect.exit(platform.fileResponse(`${directory}/missing.txt`))
      assert.strictEqual(exit._tag, "Failure")
      if (exit._tag === "Failure") {
        assert.isTrue(Cause.hasDies(exit.cause))
        assert.isFalse(Cause.hasFails(exit.cause))
      }
    }).pipe(Effect.scoped, Effect.provide(DenoFileSystem.layer)))

  it.effect("fileWebResponse honors offset and bytesToRead including zero", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const file = new File(["abcd"], "file.txt", { type: "text/plain", lastModified: 0 })
      const sliced = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 2 })
      const empty = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 0 })

      assert.deepStrictEqual(
        {
          slicedLength: sliced.headers["content-length"],
          slicedBody: yield* readBody(sliced.body),
          emptyLength: empty.headers["content-length"],
          emptyBody: yield* readBody(empty.body)
        },
        { slicedLength: "2", slicedBody: "bc", emptyLength: "0", emptyBody: "" }
      )
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))

  it.effect("fileResponse reads exact bytesToRead", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse(fixture, {
        offset: ByteSize.bytes(6),
        bytesToRead: ByteSize.bytes(5)
      })

      assert.strictEqual(response.headers["content-length"], "5")
      assert.strictEqual(response.body._tag, "Raw")
      const body = (response.body as HttpBody.Raw).body
      assert(body instanceof ReadableStream)

      const text = yield* readStream(body)
      assert.strictEqual(text, "ipsum")
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))

  it.effect("fileResponse retains the requested content length beyond EOF", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse(fixture, {
        offset: ByteSize.bytes(6),
        bytesToRead: ByteSize.bytes(100)
      })

      assert.strictEqual(response.headers["content-length"], "100")
      assert.strictEqual(response.body._tag, "Raw")
      const text = yield* readStream((response.body as HttpBody.Raw).body as ReadableStream<Uint8Array>)
      assert.strictEqual(text, "ipsum dolar sit amet\n")
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))

  it.effect("fileResponse supports zero bytesToRead", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse(fixture, {
        offset: ByteSize.bytes(6),
        bytesToRead: ByteSize.zero
      })

      assert.strictEqual(response.headers["content-length"], "0")
      assert.strictEqual(response.body._tag, "Raw")
      const body = (response.body as HttpBody.Raw).body
      assert(body instanceof ReadableStream)

      const text = yield* readStream(body)
      assert.strictEqual(text, "")
    }).pipe(Effect.provide(DenoHttpPlatform.layer)))
})
