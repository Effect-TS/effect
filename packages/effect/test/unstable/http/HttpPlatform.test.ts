import { assert, describe, it } from "@effect/vitest"
import { ByteSize, Effect, FileSystem, Option, Stream } from "effect"
import { HttpPlatform } from "effect/unstable/http"

describe("HttpPlatform", () => {
  for (const size of [0n, 4n, 9007199254740993n]) {
    it.effect(`serves a whole ${size}-byte file with an exact content-length header`, () =>
      Effect.gen(function*() {
        const platform = yield* HttpPlatform.HttpPlatform
        const response = yield* platform.fileResponse("file.bin")
        assert.strictEqual(response.status, 200)
        assert.strictEqual(response.headers["content-length"], size.toString())
      }).pipe(
        Effect.provide(HttpPlatform.layer),
        Effect.provide(FileSystem.layerNoop({
          stat: () =>
            Effect.succeed({
              type: "File",
              size: ByteSize.bytes(size),
              mtime: Option.none()
            } as FileSystem.File.Info),
          // The body is deliberately empty: only metadata and headers are under test.
          stream: () => Stream.empty
        }))
      ))
  }

  const file = {
    name: "file.bin",
    lastModified: 0,
    size: 4,
    type: "application/octet-stream",
    stream: () => new Blob([new Uint8Array([1, 2, 3, 4])]).stream()
  }

  it.effect("honors Web file offset and byte count", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 2 })
      assert.strictEqual(response.body._tag, "Stream")
      if (response.body._tag === "Stream") {
        assert.strictEqual(response.body.contentLength, 2)
        const bytes = yield* Stream.mkUint8Array(response.body.stream)
        assert.deepStrictEqual(Array.from(bytes), [2, 3])
      }
    }).pipe(
      Effect.provide(HttpPlatform.layer),
      Effect.provideService(FileSystem.FileSystem, {} as any)
    ))

  it.effect("retains the requested Web file content length beyond EOF", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileWebResponse(file, { offset: 1, bytesToRead: 10 })
      assert.strictEqual(response.body._tag, "Stream")
      if (response.body._tag === "Stream") {
        assert.strictEqual(response.body.contentLength, 10)
        const bytes = yield* Stream.mkUint8Array(response.body.stream)
        assert.deepStrictEqual(Array.from(bytes), [2, 3, 4])
      }
    }).pipe(
      Effect.provide(HttpPlatform.layer),
      Effect.provideService(FileSystem.FileSystem, {} as any)
    ))

  it.effect("honors Web file chunk size", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileWebResponse(file, { offset: 0, bytesToRead: 4, chunkSize: 2 })
      assert.strictEqual(response.body._tag, "Stream")
      if (response.body._tag === "Stream") {
        assert.strictEqual(response.body.contentLength, 4)
        const chunks = yield* Stream.runCollect(response.body.stream)
        assert.deepStrictEqual(chunks.map((chunk) => Array.from(chunk)), [[1, 2], [3, 4]])
      }
    }).pipe(
      Effect.provide(HttpPlatform.layer),
      Effect.provideService(FileSystem.FileSystem, {} as any)
    ))

  it.effect("keeps the source chunking by default", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileWebResponse(file)
      assert.strictEqual(response.body._tag, "Stream")
      if (response.body._tag === "Stream") {
        const chunks = yield* Stream.runCollect(response.body.stream)
        assert.deepStrictEqual(chunks.map((chunk) => Array.from(chunk)), [[1, 2, 3, 4]])
      }
    }).pipe(
      Effect.provide(HttpPlatform.layer),
      Effect.provideService(FileSystem.FileSystem, {} as any)
    ))
})
