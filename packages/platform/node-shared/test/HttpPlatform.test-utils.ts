import { assert, it } from "@effect/vitest"
import * as ByteSize from "effect/ByteSize"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import type * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as HttpPlatform from "effect/unstable/http/HttpPlatform"

const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
const oversized = maxSafe + 2n

export const fileSystemLayer = FileSystem.layerNoop({
  stat: () =>
    Effect.succeed({
      type: "File",
      size: ByteSize.bytes(oversized),
      mtime: Option.none(),
      atime: Option.none(),
      birthtime: Option.none(),
      dev: 0,
      mode: 0,
      ino: Option.none(),
      nlink: Option.none(),
      uid: Option.none(),
      gid: Option.none(),
      rdev: Option.none(),
      blksize: Option.none(),
      blocks: Option.none()
    })
})

export const testFileResponsePrecision = (
  layer: Layer.Layer<HttpPlatform.HttpPlatform>,
  assertNoRead: () => void,
  assertRange: (start: number, exclusiveEnd: number) => void
) => {
  for (
    const [name, options] of [
      ["an unsafe offset", { offset: ByteSize.bytes(oversized), bytesToRead: ByteSize.bytes(1) }],
      ["an unsafe byte count", { bytesToRead: ByteSize.bytes(oversized) }],
      ["an unsafe sum of safe offset and byte count", {
        offset: ByteSize.bytes(maxSafe),
        bytesToRead: ByteSize.bytes(2)
      }],
      ["an unsafe offset with an empty range", { offset: ByteSize.bytes(oversized), bytesToRead: ByteSize.zero }]
    ] as const
  ) {
    it.effect(`fileResponse rejects ${name} with BadArgument before passing the range to the runtime`, () =>
      Effect.gen(function*() {
        const platform = yield* HttpPlatform.HttpPlatform
        const result = yield* Effect.result(platform.fileResponse("precision.bin", options))
        assertNoRead()
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "PlatformError")
          assert.strictEqual(result.failure.reason._tag, "BadArgument")
        }
      }).pipe(Effect.provide(layer)))
  }

  for (const field of ["offset", "bytesToRead"] as const) {
    it.effect(`fileResponse rejects an unsafe number ${field} as BadArgument, not a defect`, () =>
      Effect.gen(function*() {
        const platform = yield* HttpPlatform.HttpPlatform
        const exit = yield* Effect.exit(platform.fileResponse("precision.bin", {
          [field]: Number.MAX_SAFE_INTEGER + 1
        }))
        assertNoRead()
        assert.strictEqual(exit._tag, "Failure")
        if (exit._tag === "Failure") {
          assert.isFalse(Cause.hasDies(exit.cause))
          const error = Option.getOrThrow(Cause.findErrorOption(exit.cause))
          assert.strictEqual(error._tag, "PlatformError")
          assert.strictEqual(error.reason._tag, "BadArgument")
        }
      }).pipe(Effect.provide(layer)))
  }

  it.effect("fileResponse preserves a safe range ending at MAX_SAFE_INTEGER", () =>
    Effect.gen(function*() {
      const platform = yield* HttpPlatform.HttpPlatform
      const response = yield* platform.fileResponse("precision.bin", {
        offset: ByteSize.bytes(maxSafe - 1n),
        bytesToRead: ByteSize.bytes(1)
      })
      assert.strictEqual(response.status, 200)
      assertRange(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER)
    }).pipe(Effect.provide(layer)))
}
