import { assert, describe, it } from "@effect/vitest"
import { BytePath, Equal, Hash, Result } from "effect"

const fromString = (input: string) => Result.getOrThrow(BytePath.fromString(input))
const fromBytes = (input: Uint8Array) => Result.getOrThrow(BytePath.fromBytes(input))
const failure = <A, E>(result: Result.Result<A, E>): E => Result.getOrThrow(Result.flip(result))

describe("BytePath", () => {
  it("reports exact byte lengths without exposing mutable storage", () => {
    assert.strictEqual(BytePath.byteLength(BytePath.empty), 0)
    assert.strictEqual(BytePath.byteLength(fromString("é😀")), 6)
    const raw = fromBytes(new Uint8Array([255, 128, 47]))
    assert.strictEqual(BytePath.byteLength(raw), 3)
    BytePath.toBytes(raw).fill(0)
    assert.deepStrictEqual(BytePath.toBytes(raw), new Uint8Array([255, 128, 47]))
    assert.strictEqual(BytePath.byteLength(raw), 3)
  })

  it("should preserve exact spelling when constructing valid paths", () => {
    for (const input of ["", "/a//./../b/", "a\\b", "é", "e\u0301", "\ufeffa", "😀"]) {
      const path = fromString(input)
      assert.strictEqual(Result.getOrThrow(BytePath.toString(path)), input)
      assert.deepStrictEqual(BytePath.toBytes(path), new TextEncoder().encode(input))
    }
    const emptyView = new Uint8Array(new ArrayBuffer(4), 4, 0)
    assert.isTrue(Equal.equals(BytePath.empty, fromString("")))
    assert.isTrue(Equal.equals(BytePath.empty, fromBytes(emptyView)))
  })

  it("should identify absolute paths when the first byte is a slash", () => {
    for (
      const [input, expected] of [["", false], ["a/b", false], ["\\a", false], ["/", true], ["//a", true]] as const
    ) {
      assert.strictEqual(BytePath.isAbsolute(fromString(input)), expected)
    }
  })

  it("should preserve byte identity when callers mutate input or exported bytes", () => {
    const expected = new Uint8Array([1, 255])
    for (
      const input of [new Uint8Array(expected), Buffer.from(expected), new Uint8Array([9, 1, 255, 9]).subarray(1, 3)]
    ) {
      const path = fromBytes(input)
      const hash = Hash.hash(path)
      input.fill(0)
      BytePath.toBytes(path).fill(0)
      assert.deepStrictEqual(BytePath.toBytes(path), expected)
      const equal = fromBytes(expected)
      assert.isTrue(Equal.equals(path, equal))
      assert.strictEqual(Hash.hash(path), hash)
      assert.strictEqual(Hash.hash(equal), hash)
    }
  })

  it("should compare exact bytes when paths differ in bytes or prefix length", () => {
    const a = fromBytes(new Uint8Array([127]))
    const b = fromBytes(new Uint8Array([255]))
    const c = fromBytes(new Uint8Array([255, 1]))
    assert.strictEqual(BytePath.Order(a, b), -1)
    assert.strictEqual(BytePath.Order(b, a), 1)
    assert.strictEqual(BytePath.Order(b, c), -1)
    assert.strictEqual(BytePath.Order(b, fromBytes(new Uint8Array([255]))), 0)
    assert.strictEqual(BytePath.Order(BytePath.empty, a), -1)
    assert.isFalse(Equal.equals(b, c))
    assert.isFalse(Equal.equals(fromString("/"), fromString("//")))
    assert.isFalse(Equal.equals(fromString("é"), fromString("e\u0301")))
  })

  it("should reject NUL when constructing from bytes or text", () => {
    for (const result of [BytePath.fromBytes(new Uint8Array([97, 0, 98])), BytePath.fromString("a\0b")]) {
      const error = failure(result)
      assert.strictEqual(error._tag, "BytePathError")
      assert.strictEqual(error.reason, "NulByte")
    }
  })

  it("should reject malformed text when UTF-16 contains an unpaired surrogate", () => {
    for (const input of ["\ud800", "\udc00"]) {
      assert.strictEqual(failure(BytePath.fromString(input)).reason, "InvalidUtf16")
    }
  })

  it("should preserve bytes and reject text conversion when the path contains invalid UTF-8", () => {
    const path = fromBytes(new Uint8Array([255]))
    assert.deepStrictEqual(BytePath.toBytes(path), new Uint8Array([255]))
    assert.strictEqual(failure(BytePath.toString(path)).reason, "InvalidUtf8")
  })

  it("should capture actual bytes when input properties or iterators are overridden", () => {
    const input = new Uint8Array([1, 255])
    for (
      const key of ["buffer", "byteOffset", "length", "byteLength", "constructor", Symbol.iterator, Symbol.toStringTag]
    ) {
      Object.defineProperty(input, key, {
        get() {
          throw new Error("must not run")
        }
      })
    }
    assert.deepStrictEqual(BytePath.toBytes(fromBytes(input)), new Uint8Array([1, 255]))
  })

  it("should reject shared storage when supplied directly or hidden by an overridden property", () => {
    const disguised = new Uint8Array(new SharedArrayBuffer(1)).fill(1)
    Object.defineProperty(disguised, "buffer", { value: new ArrayBuffer(1) })
    for (
      const input of [
        new Uint8Array(new SharedArrayBuffer(0)),
        new Uint8Array(new SharedArrayBuffer(2)).fill(1),
        disguised
      ]
    ) {
      assert.strictEqual(failure(BytePath.fromBytes(input)).reason, "SharedBuffer")
    }
  })

  it("should reject detached storage when the input is a nonempty or empty view", () => {
    for (const size of [0, 2]) {
      const buffer = new ArrayBuffer(size)
      const input = new Uint8Array(buffer)
      structuredClone(buffer, { transfer: [buffer] })
      assert.strictEqual(failure(BytePath.fromBytes(input)).reason, "DetachedBuffer")
    }
  })

  it("should reject out-of-bounds views when their buffer has shrunk", () => {
    const buffer = new ArrayBuffer(4, { maxByteLength: 8 })
    const fixed = new Uint8Array(buffer, 2, 2)
    const tracking = new Uint8Array(buffer, 2)
    buffer.resize(1)
    for (const input of [fixed, tracking]) {
      const error = failure(BytePath.fromBytes(input))
      assert.strictEqual(error.reason, "InvalidInput")
      assert.include(error.message, "out of bounds")
    }
    assert.deepStrictEqual(BytePath.toBytes(fromBytes(new Uint8Array(buffer, 1, 0))), new Uint8Array())
  })

  it("should return InvalidInput when constructors receive the wrong value type", () => {
    assert.strictEqual(failure(BytePath.fromBytes(new Uint8ClampedArray([1]) as never)).reason, "InvalidInput")
    assert.strictEqual(failure(BytePath.fromString(1 as never)).reason, "InvalidInput")
  })

  it("should recognize only constructed values when checking unknown input", () => {
    const path = fromString("/a")
    assert.isTrue(BytePath.isBytePath(path))
    assert.isFalse(BytePath.isBytePath(BytePath.toBytes(path)))
    assert.isFalse(BytePath.isBytePath({}))
    assert.throws(() => BytePath.toBytes({} as never))
  })
})
