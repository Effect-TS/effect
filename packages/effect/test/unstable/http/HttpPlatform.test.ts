import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Stream } from "effect"
import { HttpPlatform } from "effect/unstable/http"

describe("HttpPlatform", () => {
  it.effect("honors Web file offset and byte count", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileWebResponse({
        name: "file.bin",
        lastModified: 0,
        size: 4,
        type: "application/octet-stream",
        stream: () => new Blob([new Uint8Array([1, 2, 3, 4])]).stream()
      }, { offset: 1, bytesToRead: 2 })
      assert.strictEqual(response.body._tag, "Stream")
      if (response.body._tag === "Stream") {
        const bytes = yield* Stream.mkUint8Array(response.body.stream)
        assert.deepStrictEqual(Array.from(bytes), [2, 3])
      }
    }).pipe(
      Effect.provide(HttpPlatform.layer),
      Effect.provideService(FileSystem.FileSystem, {} as any)
    ))
})
