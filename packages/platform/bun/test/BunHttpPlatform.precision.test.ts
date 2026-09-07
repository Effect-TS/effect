import * as BunHttpPlatform from "@effect/platform-bun/BunHttpPlatform"
import { assert, describe } from "@effect/vitest"
import { afterEach, beforeEach, vi } from "vitest"
import { testFileResponsePrecision } from "../../node-shared/test/HttpPlatform.test-utils.ts"

vi.mock("@effect/platform-bun/BunFileSystem", async () => ({
  layer: (await import("../../node-shared/test/HttpPlatform.test-utils.ts")).fileSystemLayer
}))

describe("BunHttpPlatform precision", { concurrent: false }, () => {
  const slice = vi.fn((_start?: number, _end?: number) => new Blob([]))

  beforeEach(() => {
    slice.mockClear()
    // A small Blob double records range arguments without touching a real file.
    vi.spyOn(Bun, "file").mockReturnValue({ slice } as unknown as ReturnType<typeof Bun.file>)
  })
  afterEach(() => vi.restoreAllMocks())

  testFileResponsePrecision(
    BunHttpPlatform.layer,
    () => assert.deepStrictEqual(slice.mock.calls, []),
    (start, end) => assert.deepStrictEqual(slice.mock.calls, [[start, end]])
  )
})
