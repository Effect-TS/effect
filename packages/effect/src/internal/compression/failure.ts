// Shared pieces of the decoders behind `effect/encoding/Compression`.

/**
 * Why a decoder stopped. The public module turns this into a
 * `CompressionError` with the same `kind`.
 *
 * @internal
 */
export type FailureKind = "Malformed" | "Truncated" | "Checksum" | "OutputLimit" | "Unsupported"

/**
 * Thrown by the decoders on bad input or when the output limit is reached.
 *
 * @internal
 */
export class DecodeFailure extends Error {
  readonly kind: FailureKind
  constructor(kind: FailureKind, message: string) {
    super(message)
    this.kind = kind
  }
}

/** @internal */
export const fail = (kind: FailureKind, message: string): never => {
  throw new DecodeFailure(kind, message)
}

/** @internal */
export const failOutputLimit = (limit: number): never =>
  fail("OutputLimit", `the output is larger than the limit of ${limit} bytes`)

/**
 * Reads the little-endian unsigned 32-bit integer at `offset`.
 *
 * @internal
 */
export const readUint32 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0

/**
 * A byte buffer that grows as output is appended and fails with
 * `OutputLimit` before it would hold more than `limit` bytes. `sizeHint`,
 * when known, sizes the first allocation (never above `limit`).
 *
 * @internal
 */
export class Output {
  buffer: Uint8Array
  length = 0
  readonly limit: number

  constructor(limit: number, sizeHint?: number) {
    this.limit = limit
    this.buffer = new Uint8Array(Math.min(limit, sizeHint ?? 64 * 1024))
  }

  // Makes room for `n` more bytes
  reserve(n: number): void {
    const needed = this.length + n
    if (needed > this.limit) failOutputLimit(this.limit)
    if (needed > this.buffer.length) {
      const next = new Uint8Array(Math.min(this.limit, Math.max(needed, this.buffer.length * 2)))
      next.set(this.buffer.subarray(0, this.length))
      this.buffer = next
    }
  }

  // The output written so far, without copying when the buffer is full
  finish(): Uint8Array {
    return this.length === this.buffer.length ? this.buffer : this.buffer.slice(0, this.length)
  }
}

/**
 * The signature of every decoder: `limit` is the most output allowed,
 * `sizeHint` the expected output size when the caller knows it.
 *
 * @internal
 */
export type Decoder = (input: Uint8Array, limit: number, sizeHint: number | undefined) => Uint8Array
