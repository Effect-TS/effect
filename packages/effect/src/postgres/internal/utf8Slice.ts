/**
 * Node's own UTF-8 decoder, which reads straight out of the buffer with no
 * view and about a quarter less overhead than `TextDecoder`. It swaps
 * replacement characters in where `TextDecoder` would fail, so callers hand a
 * result that contains one to the strict decoder after all: either the
 * character was really in the text and the same string comes back, or the
 * bytes were invalid and the failure is the one `TextDecoder` always raised.
 *
 * Buffer polyfills (Workers `nodejs_compat`, celld) define `utf8Slice` in
 * terms of `this.toString(...)`, which on a plain `Uint8Array` returns its
 * comma-separated bytes. A candidate is only used when it decodes a plain
 * `Uint8Array` correctly.
 *
 * @internal
 */
export const nativeUtf8Slice = (
  candidate: unknown
): ((this: Uint8Array, start: number, end: number) => string) | undefined => {
  if (typeof candidate !== "function") return undefined
  try {
    return candidate.call(new Uint8Array([0x61, 0x62, 0x63]), 1, 2) === "b"
      ? candidate as (this: Uint8Array, start: number, end: number) => string
      : undefined
  } catch {
    return undefined
  }
}

/** @internal */
export const utf8Slice = nativeUtf8Slice((globalThis as any).Buffer?.prototype?.utf8Slice)
