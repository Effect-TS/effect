import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Bytes, Result } from "effect"
import { runInNewContext } from "node:vm"

const b = (...bytes: Array<number>) => new Uint8Array(bytes)

describe("Bytes", () => {
  it("should report the actual byte length of ordinary views and buffers, including empty views", () => {
    for (
      const [input, expected] of [
        [b(), 0],
        [b(1, 2, 3), 3],
        [b(0, 1, 0), 3],
        [b(9, 1, 2, 9).subarray(1, 3), 2],
        [Buffer.from([1, 2]), 2],
        [new Uint8Array(new ArrayBuffer(4), 4, 0), 0]
      ] as const
    ) {
      assert.strictEqual(Result.getOrThrow(Bytes.byteLength(input)), expected)
    }
  })

  it("should inspect a view without reading shadowed properties or changing its bytes", () => {
    const buffer = new ArrayBuffer(4)
    new Uint8Array(buffer).set([9, 1, 2, 9])
    const input = new Uint8Array(buffer, 1, 2)
    for (const key of ["buffer", "byteOffset", "byteLength", "length", "set", "constructor", Symbol.iterator]) {
      Object.defineProperty(input, key, {
        get() {
          throw new Error("The view's properties must not be read")
        }
      })
    }
    assert.strictEqual(Result.getOrThrow(Bytes.byteLength(input)), 2)
    assert.deepStrictEqual(new Uint8Array(buffer), b(9, 1, 2, 9))
  })

  it("should return InvalidInput for values that are not usable same-realm Uint8Array views", () => {
    const hostile = new Proxy(new Uint8Array(1), {
      getPrototypeOf() {
        throw new Error("Cannot inspect the proxy's prototype")
      }
    })
    for (
      const input of [
        undefined,
        null,
        1,
        "bytes",
        {},
        [],
        new ArrayBuffer(1),
        new DataView(new ArrayBuffer(1)),
        new Uint16Array(1),
        new Uint8ClampedArray(1),
        new Proxy(new Uint8Array(1), {}),
        hostile,
        runInNewContext("new Uint8Array(1)")
      ]
    ) {
      const error = Result.getOrThrow(Result.flip(Bytes.byteLength(input)))
      assert.instanceOf(error, Bytes.ByteViewError)
      assert.strictEqual(error.reason, "InvalidInput")
    }
  })

  it("should reject shared storage even when the buffer property is shadowed", () => {
    const disguised = new Uint8Array(new SharedArrayBuffer(2))
    Object.defineProperty(disguised, "buffer", { value: new ArrayBuffer(2) })
    for (const input of [new Uint8Array(new SharedArrayBuffer(0)), disguised]) {
      const error = Result.getOrThrow(Result.flip(Bytes.byteLength(input)))
      assert.instanceOf(error, Bytes.ByteViewError)
      assert.strictEqual(error.reason, "SharedBuffer")
    }
  })

  it("should detect detachment after a successful inspection, including for an empty view", () => {
    for (const size of [0, 2]) {
      const buffer = new ArrayBuffer(size)
      const input = new Uint8Array(buffer)
      assert.strictEqual(Result.getOrThrow(Bytes.byteLength(input)), size)
      structuredClone(buffer, { transfer: [buffer] })
      const error = Result.getOrThrow(Result.flip(Bytes.byteLength(input)))
      assert.instanceOf(error, Bytes.ByteViewError)
      assert.strictEqual(error.reason, "DetachedBuffer")
    }
  })

  it("should reevaluate view bounds when a resizable buffer shrinks and grows", () => {
    const buffer: ArrayBuffer = Reflect.construct(ArrayBuffer, [4, { maxByteLength: 8 }])
    const resize = Reflect.get(ArrayBuffer.prototype, "resize")
    const fixed = new Uint8Array(buffer, 2, 2)
    const tracking = new Uint8Array(buffer, 2)
    for (const input of [fixed, tracking]) assert.strictEqual(Result.getOrThrow(Bytes.byteLength(input)), 2)
    Reflect.apply(resize, buffer, [1])
    for (const input of [fixed, tracking]) {
      const error = Result.getOrThrow(Result.flip(Bytes.byteLength(input)))
      assert.instanceOf(error, Bytes.ByteViewError)
      assert.strictEqual(error.reason, "OutOfBounds")
    }
    assert.strictEqual(Result.getOrThrow(Bytes.byteLength(new Uint8Array(buffer, 1, 0))), 0)
    Reflect.apply(resize, buffer, [6])
    assert.strictEqual(Result.getOrThrow(Bytes.byteLength(fixed)), 2)
    assert.strictEqual(Result.getOrThrow(Bytes.byteLength(tracking)), 4)
  })

  it("concat", () => {
    deepStrictEqual(Bytes.concat([]), b())
    deepStrictEqual(Bytes.concat([b(1, 2, 3, 4).subarray(1, 3), b(), b(5)]), b(2, 3, 5))

    const single = b(1, 2)
    const copy = Bytes.concat([single])
    single[0] = 9
    deepStrictEqual(copy, b(1, 2))
  })

  it("Equivalence", () => {
    assertTrue(Bytes.Equivalence(b(1, 2), b(1, 2)))
    assertFalse(Bytes.Equivalence(b(1, 2), b(1, 3)))
    assertFalse(Bytes.Equivalence(b(1, 2), b(1)))
  })

  it("Order", () => {
    strictEqual(Bytes.Order(b(1, 2), b(1, 2)), 0)
    strictEqual(Bytes.Order(b(1, 2), b(1, 3)), -1)
    strictEqual(Bytes.Order(b(2), b(1, 9)), 1)
    strictEqual(Bytes.Order(b(1), b(1, 0)), -1)
    strictEqual(Bytes.Order(b(0xff), b(0x00)), 1)
  })
})
