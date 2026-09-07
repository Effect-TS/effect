import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"
import { afterEach, beforeEach, vi } from "vitest"
import { testFileResponsePrecision } from "../../node-shared/test/HttpPlatform.test-utils.ts"

vi.mock("@effect/platform-bun/BunFileSystem", async () => ({
  layer: (await import("../../node-shared/test/HttpPlatform.test-utils.ts")).fileSystemLayer
}))

describe("BunHttpPlatform precision", { concurrent: false }, () => {
  const slice = vi.fn((_start?: number, _end?: number) => new Blob([]))

  beforeEach(() => {
    slice.mockClear()
    vi.spyOn(Bun, "file").mockReturnValue({ slice } as unknown as ReturnType<typeof Bun.file>)
  })
  afterEach(() => vi.restoreAllMocks())

  testFileResponsePrecision(
    BunHttpPlatform.layer,
    () => assert.deepStrictEqual(slice.mock.calls, []),
    (start, end) => assert.deepStrictEqual(slice.mock.calls, [[start, end]])
  )

  it.effect("serves a whole oversized file without slicing it", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse("precision.bin")
      assert.strictEqual(response.status, 200)
      assert.strictEqual(response.body._tag, "Raw")
      if (response.body._tag === "Raw") {
        assert.strictEqual(response.body.body, vi.mocked(Bun.file).mock.results[0].value)
      }
      assert.strictEqual(vi.mocked(Bun.file).mock.calls.length, 1)
      assert.deepStrictEqual(slice.mock.calls, [])
    }).pipe(Effect.provide(BunHttpPlatform.layer)))
})
