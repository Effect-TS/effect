import * as NodeHttpPlatform from "@effect/platform-node/NodeHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Etag from "effect/unstable/http/Etag"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"
import * as Fs from "node:fs"
import { Readable } from "node:stream"
import { beforeEach, vi } from "vitest"
import { fileSystemLayer, testFileResponsePrecision } from "../../node-shared/test/HttpPlatform.test-utils.ts"

vi.mock("node:fs", async (importOriginal) => ({
  ...await importOriginal<typeof Fs>(),
  createReadStream: vi.fn(() => Readable.from([]))
}))

describe("NodeHttpPlatform precision", { concurrent: false }, () => {
  beforeEach(() => vi.mocked(Fs.createReadStream).mockClear())

  const layer = Layer.effect(HttpPlatform.HttpPlatform)(NodeHttpPlatform.make).pipe(
    Layer.provide(fileSystemLayer),
    Layer.provide(Etag.layer)
  )

  testFileResponsePrecision(
    layer,
    () => assert.deepStrictEqual(vi.mocked(Fs.createReadStream).mock.calls, []),
    (start, end) =>
      assert.deepStrictEqual(vi.mocked(Fs.createReadStream).mock.calls, [["precision.bin", { start, end: end - 1 }]])
  )

  it.effect("serves a whole oversized file with an exact content length and no end offset", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse("precision.bin")
      assert.strictEqual(response.status, 200)
      assert.strictEqual(response.headers["content-length"], "9007199254740993")
      assert.deepStrictEqual(vi.mocked(Fs.createReadStream).mock.calls, [["precision.bin", {
        start: 0,
        end: undefined
      }]])
    }).pipe(Effect.provide(layer)))
})
