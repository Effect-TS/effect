/** @internal */
export interface NativeDecodeOptions {
  readonly alphabet: "base64url"
}

/**
 * Decodes `str` with native `Uint8Array.fromBase64`, falling back to `Buffer`.
 *
 * Returns `undefined` when native decoding is unavailable or skipped for a
 * short input, and `null` when native decoding rejected the input. In both
 * cases the caller's JS path produces the module's own result or error.
 *
 * Native decoding also skips ASCII whitespace and accepts missing padding, so
 * callers validate the length and padding first and pass the byte length a
 * valid input decodes to. Skipped whitespace always yields fewer bytes, so a
 * result of any other length counts as rejected.
 *
 * @internal
 */
export const decodeNative = (
  str: string,
  decodedLength: number,
  options: NativeDecodeOptions | undefined
): Uint8Array | null | undefined => {
  // Native calls cost about 1 µs on V8, while the JS path stays well below that
  // until the output outgrows V8's 64-byte on-heap typed arrays.
  if (str.length < 128) return undefined
  const NativeUint8Array = Uint8Array as {
    readonly fromBase64?: (string: string, options?: NativeDecodeOptions) => Uint8Array
  }
  if (typeof NativeUint8Array.fromBase64 !== "function") {
    const Buffer = getBuffer()
    if (Buffer === undefined) return undefined
    const encoding = options === undefined ? "base64" : "base64url"
    const bytes = new Uint8Array(decodedLength)
    const buffer = Buffer.from(bytes.buffer)
    // `Buffer` skips invalid characters, accepts both alphabets and reads
    // only the low byte of each character, so only input that encodes back to
    // itself is accepted. "base64url" encodes without padding.
    const canonical = options !== undefined && str.endsWith("=") ? str.slice(0, str.indexOf("=")) : str
    return buffer.write(str, encoding) === decodedLength && buffer.toString(encoding) === canonical ? bytes : null
  }
  try {
    const bytes = NativeUint8Array.fromBase64(str, options)
    return bytes.length === decodedLength ? bytes : null
  } catch {
    return null
  }
}

interface BufferLike {
  write(string: string, encoding: string): number
  toString(encoding: string): string
}

interface BufferConstructorLike {
  from(buffer: ArrayBufferLike, byteOffset?: number, length?: number): BufferLike
}

// A polyfilled `Buffer` (browser bundles, React Native) is several times
// slower than the JS paths, so only runtimes that report a Node.js version are
// trusted to have a native one. Read at call time, without importing `node:buffer`.
const getBuffer = (): BufferConstructorLike | undefined => {
  const global = globalThis as {
    readonly Buffer?: BufferConstructorLike
    readonly process?: { readonly versions?: { readonly node?: unknown } }
  }
  return typeof global.process?.versions?.node === "string" && typeof global.Buffer === "function"
    ? global.Buffer
    : undefined
}

/**
 * Encodes `bytes` with `Buffer`, for runtimes that have it but lack native
 * `Uint8Array.prototype.toBase64`, such as Node.js 24 and earlier.
 *
 * "base64" pads the output and "base64url" does not. Returns `undefined` when
 * `Buffer` is unavailable.
 *
 * @internal
 */
export const encodeBuffer = (bytes: Uint8Array, encoding: "base64" | "base64url"): string | undefined =>
  getBuffer()?.from(bytes.buffer, bytes.byteOffset, bytes.length).toString(encoding)

/** @internal */
export const stripCrlf = (str: string): string =>
  str.indexOf("\n") === -1 && str.indexOf("\r") === -1 ? str : str.replace(/[\n\r]/g, "")
