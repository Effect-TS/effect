import { assert, describe, it } from "@effect/vitest"
import { nativeUtf8Slice } from "effect/postgres/internal/utf8Slice"
import { Buffer } from "node:buffer"

const encoder = new TextEncoder()

describe("utf8Slice", () => {
  it("uses Node's native decoder on a plain Uint8Array", () => {
    const slice = nativeUtf8Slice((Buffer.prototype as any).utf8Slice)
    assert.isDefined(slice)
    assert.strictEqual(slice!.call(encoder.encode("SCRAM-SHA-256"), 0, 5), "SCRAM")
  })

  it("rejects a polyfill that decodes through toString", () => {
    // The shape of the Buffer polyfills in Workers `nodejs_compat` and celld:
    // on a plain Uint8Array, `toString` ignores the encoding and returns
    // comma-separated bytes.
    function utf8Slice(this: Uint8Array, start: number, end: number) {
      return (this.toString as (...args: Array<unknown>) => string)("utf8", start, end)
    }
    assert.strictEqual(utf8Slice.call(encoder.encode("abc"), 1, 2), "97,98,99")
    assert.isUndefined(nativeUtf8Slice(utf8Slice))
  })

  it("rejects a missing or throwing candidate", () => {
    assert.isUndefined(nativeUtf8Slice(undefined))
    assert.isUndefined(nativeUtf8Slice(() => {
      throw new Error("not a Buffer")
    }))
  })
})
