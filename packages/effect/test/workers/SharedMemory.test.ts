import { describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { SharedMemory } from "effect/workers"
import { afterEach, vi } from "vitest"
import { assertInstanceOf, assertTrue, deepStrictEqual, strictEqual, throws } from "../utils/assert.ts"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("SharedMemory", () => {
  describe("isAvailable", () => {
    const cases: ReadonlyArray<readonly [string, () => void, boolean]> = [
      ["by default here", () => {}, true],
      ["crossOriginIsolated true", () => vi.stubGlobal("crossOriginIsolated", true), true],
      ["crossOriginIsolated false", () => vi.stubGlobal("crossOriginIsolated", false), false],
      ["no SharedArrayBuffer", () => vi.stubGlobal("SharedArrayBuffer", undefined), false]
    ]
    for (const [name, setup, expected] of cases) {
      it(name, () => {
        setup()
        strictEqual(SharedMemory.isAvailable(), expected)
      })
    }
  })

  describe("isShared", () => {
    const shared = new SharedArrayBuffer(16)
    const cases: ReadonlyArray<readonly [string, ArrayBufferView, boolean]> = [
      ["typed array on an ArrayBuffer", new Int32Array(4), false],
      ["typed array on a SharedArrayBuffer", new Int32Array(shared), true],
      ["subarray of a shared array", new Int32Array(shared).subarray(1, 2), true],
      ["DataView on a SharedArrayBuffer", new DataView(shared), true]
    ]
    for (const [name, view, expected] of cases) {
      it(name, () => strictEqual(SharedMemory.isShared(view), expected))
    }
  })

  describe("make", () => {
    it("allocates zeroed arrays in shared memory", () => {
      const ints = SharedMemory.make(Int32Array, 3)
      strictEqual(ints.constructor, Int32Array)
      assertInstanceOf(ints.buffer, SharedArrayBuffer)
      deepStrictEqual(Array.from(ints), [0, 0, 0])

      const bigints = SharedMemory.make(BigInt64Array, 2)
      strictEqual(bigints.constructor, BigInt64Array)
      strictEqual(bigints.buffer.byteLength, 16)
      deepStrictEqual(Array.from(bigints), [0n, 0n])
    })

    it("throws SharedMemoryError when shared memory is unavailable", () => {
      vi.stubGlobal("crossOriginIsolated", false)
      throws(() => SharedMemory.make(Int32Array, 1), (error) => {
        assertInstanceOf(error, SharedMemory.SharedMemoryError)
        assertTrue(error.message.includes("Cross-Origin-Opener-Policy"))
      })
    })
  })

  describe("share", () => {
    it("copies an unshared array into shared memory once", () => {
      const values = Float64Array.of(1.5, 2.5, 3.5)
      const shared = SharedMemory.share(values)
      strictEqual(shared.constructor, Float64Array)
      assertTrue(SharedMemory.isShared(shared))
      deepStrictEqual(Array.from(shared), [1.5, 2.5, 3.5])
      strictEqual(SharedMemory.share(values), shared)
    })

    it("returns a shared array itself", () => {
      const shared = SharedMemory.make(Uint8Array, 4)
      strictEqual(SharedMemory.share(shared), shared)
    })

    it("copies only the elements of a subarray", () => {
      const shared = SharedMemory.share(Int16Array.of(1, 2, 3, 4).subarray(1, 3))
      deepStrictEqual(Array.from(shared), [2, 3])
      strictEqual(shared.buffer.byteLength, 4)
    })

    it("keeps the first copy when the source changes", () => {
      const values = Uint32Array.of(1, 2)
      const shared = SharedMemory.share(values)
      values[0] = 9
      strictEqual(SharedMemory.share(values), shared)
      strictEqual(shared[0], 1)
    })

    it("throws SharedMemoryError for an unshared array when shared memory is unavailable", () => {
      vi.stubGlobal("crossOriginIsolated", false)
      throws(() => SharedMemory.share(new Int32Array(1)), (error) => {
        assertInstanceOf(error, SharedMemory.SharedMemoryError)
      })
    })
  })

  describe("schema", () => {
    const Ints = SharedMemory.schema(Int32Array)

    describe("decodes", () => {
      const cases: ReadonlyArray<readonly [string, unknown, boolean]> = [
        ["a shared array of the kind", SharedMemory.make(Int32Array, 2), true],
        ["an unshared array", new Int32Array(2), false],
        ["a shared array of another kind", SharedMemory.make(Uint32Array, 2), false],
        ["a serialized array", JSON.parse(JSON.stringify(SharedMemory.make(Int32Array, 2))), false]
      ]
      for (const [name, input, ok] of cases) {
        it(name, () => strictEqual(Schema.is(Ints)(input), ok))
      }
    })

    it("names the expected value in failures", () => {
      throws(() => Schema.decodeUnknownSync(Ints)(new Int32Array(1)), (error) => {
        assertTrue(String(error).includes("Int32Array in shared memory"))
      })
    })

    it("passes values through the JSON codec untouched", () => {
      const codec = Schema.toCodecJson(Schema.Struct({ data: Ints }))
      const data = SharedMemory.make(Int32Array, 2)
      const encoded = Schema.encodeSync(codec)({ data })
      strictEqual((encoded as { readonly data: unknown }).data, data)
      strictEqual(Schema.decodeUnknownSync(codec)(encoded).data, data)
    })

    it("keeps sharing memory through structured clone", () => {
      const codec = Schema.toCodecJson(Schema.Struct({ data: Ints }))
      const data = SharedMemory.make(Int32Array, 2)
      const received = Schema.decodeUnknownSync(codec)(structuredClone(Schema.encodeSync(codec)({ data })))
      received.data[1] = 7
      strictEqual(data[1], 7)
    })

    it("fails to encode an unshared array", () => {
      throws(() => Schema.encodeSync(Ints)(new Int32Array(1) as any))
    })
  })
})
