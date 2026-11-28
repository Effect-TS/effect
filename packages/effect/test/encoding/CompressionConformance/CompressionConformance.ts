/**
 * Helpers shared by the `Compression` conformance suites.
 */
import { assert } from "@effect/vitest"
import { Result } from "effect"
import type * as Compression from "effect/encoding/Compression"
import { readFileSync } from "node:fs"

export type Kind = Compression.CompressionError["kind"]
export type Bytes = ArrayLike<number>

export const hex = (s: string): Uint8Array => Uint8Array.from(s.match(/../g) ?? [], (byte) => parseInt(byte, 16))
export const ascii = (s: string): Uint8Array => new TextEncoder().encode(s)

const bytes = (input: Bytes): Uint8Array => input instanceof Uint8Array ? input : Uint8Array.from(input)

export const concat = (...parts: ReadonlyArray<Bytes>): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// Little-endian integer of `size` bytes, exact up to 2^53
export const le = (value: number, size: number): Array<number> => {
  const out: Array<number> = []
  for (let i = 0; i < size; i++) {
    out.push(value % 256)
    value = Math.floor(value / 256)
  }
  return out
}

// Deterministic pseudo-random bytes (xorshift32), as `random` in the Snappy
// and LZ4 generate.py
export const xorshift = (length: number, seed: number): Uint8Array => {
  const out = new Uint8Array(length)
  let x = seed
  for (let i = 0; i < length; i++) {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    out[i] = x
  }
  return out
}

const text = (lines: number): Uint8Array => {
  let s = ""
  for (let i = 0; i < lines; i++) {
    s += `line ${String(i).padStart(4, "0")}: the quick brown fox jumps over the lazy dog\n`
  }
  return ascii(s)
}

// The data behind the Snappy and LZ4 fixture files, as `mixed` in their
// generate.py
export const mixed = (): Uint8Array => {
  const t = text(200)
  const r = xorshift(2048, 1)
  return concat(t, r, new Uint8Array(5000).fill(0x61), t, r)
}

// A file of `test/fixtures/compression`, by its path from there
export const fixture = (path: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`../../fixtures/compression/${path}`, import.meta.url)))

// Assertions on the result of one decoder. `expected` may be given as ASCII
// text.
export const assertions = (
  decompress: (
    input: Uint8Array,
    options: Compression.DecompressOptions
  ) => Result.Result<Uint8Array, Compression.CompressionError>,
  codec: Compression.Codec,
  defaults: Compression.DecompressOptions = { maxOutputSize: 1 << 20 }
) => ({
  decodes: (input: Bytes, expected: Bytes | string, options = defaults): void => {
    const result = decompress(bytes(input), options)
    if (Result.isFailure(result)) return assert.fail(`${result.failure.kind}: ${result.failure.message}`)
    assert.deepStrictEqual(result.success, typeof expected === "string" ? ascii(expected) : bytes(expected))
  },
  fails: (input: Bytes, kind: Kind, options = defaults): void => {
    const result = decompress(bytes(input), options)
    if (Result.isSuccess(result)) return assert.fail(`expected ${kind}, decoded ${result.success.length} bytes`)
    assert.strictEqual(result.failure.kind, kind, result.failure.message)
    assert.strictEqual(result.failure.codec, codec)
  }
})
