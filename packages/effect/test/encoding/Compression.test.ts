import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Compression from "effect/encoding/Compression"
import * as GzipTest from "./CompressionConformance/GzipTest.ts"
import * as Lz4Test from "./CompressionConformance/Lz4Test.ts"
import * as SnappyTest from "./CompressionConformance/SnappyTest.ts"
import * as ZstdTest from "./CompressionConformance/ZstdTest.ts"

SnappyTest.suite()
GzipTest.suite()
Lz4Test.suite()
ZstdTest.suite()

describe("Compression", () => {
  // Snappy block holding "hello"
  const hello = new Uint8Array([5, 16, 104, 101, 108, 108, 111])

  it("fails with OutputLimit when expectedSize is larger than maxOutputSize", () => {
    const result = Compression.decompressSnappy(hello, { maxOutputSize: 4, expectedSize: 5 })
    assert.isTrue(Result.isFailure(result))
    if (Result.isFailure(result)) {
      assert.isTrue(Compression.isCompressionError(result.failure))
      assert.strictEqual(result.failure.codec, "Snappy")
      assert.strictEqual(result.failure.kind, "OutputLimit")
    }
  })

  it("throws a RangeError for sizes that are not non-negative safe integers", () => {
    for (const size of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      assert.throws(() => Compression.decompressSnappy(hello, { maxOutputSize: size }), RangeError)
      assert.throws(() => Compression.decompressSnappy(hello, { maxOutputSize: 10, expectedSize: size }), RangeError)
    }
  })
})
