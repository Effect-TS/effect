/**
 * Minimal ASN.1 DER reader and writer for private key containers.
 *
 * @internal
 */
import type { Bytes } from "./wire.ts"
import { concat, WireError } from "./wire.ts"

/** @internal */
export interface Node {
  readonly tag: number
  readonly value: Uint8Array
}

/** @internal */
export const read = (bytes: Uint8Array, offset = 0): Node & { readonly end: number } => {
  if (offset + 2 > bytes.length) throw new WireError("truncated DER")
  const tag = bytes[offset]
  let length = bytes[offset + 1]
  let cursor = offset + 2
  if (length & 0x80) {
    const count = length & 0x7f
    if (count === 0 || count > 4 || cursor + count > bytes.length) throw new WireError("invalid DER length")
    length = 0
    for (let i = 0; i < count; i++) length = length * 256 + bytes[cursor++]
  }
  if (cursor + length > bytes.length) throw new WireError("truncated DER")
  return { tag, value: bytes.subarray(cursor, cursor + length), end: cursor + length }
}

/** @internal */
export const children = (value: Uint8Array): Array<Node> => {
  const out: Array<Node> = []
  let offset = 0
  while (offset < value.length) {
    const node = read(value, offset)
    out.push({ tag: node.tag, value: node.value })
    offset = node.end
  }
  return out
}

/** @internal */
export const decodeOid = (value: Uint8Array): string => {
  if (value.length === 0) throw new WireError("empty OID")
  const parts: Array<number> = [Math.floor(value[0] / 40), value[0] % 40]
  let current = 0
  for (let i = 1; i < value.length; i++) {
    current = current * 128 + (value[i] & 0x7f)
    if ((value[i] & 0x80) === 0) {
      parts.push(current)
      current = 0
    }
  }
  return parts.join(".")
}

/** @internal */
export const encodeOid = (oid: string): Bytes => {
  const parts = oid.split(".").map(Number)
  const out: Array<number> = [parts[0] * 40 + parts[1]]
  for (let i = 2; i < parts.length; i++) {
    let value = parts[i]
    const bytes: Array<number> = [value & 0x7f]
    value = Math.floor(value / 128)
    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80)
      value = Math.floor(value / 128)
    }
    out.push(...bytes)
  }
  return new Uint8Array(out)
}

/** @internal */
export const encode = (tag: number, value: Uint8Array): Bytes => {
  const length = value.length
  let header: Array<number>
  if (length < 0x80) {
    header = [tag, length]
  } else {
    const lengthBytes: Array<number> = []
    let remaining = length
    while (remaining > 0) {
      lengthBytes.unshift(remaining & 0xff)
      remaining = Math.floor(remaining / 256)
    }
    header = [tag, 0x80 | lengthBytes.length, ...lengthBytes]
  }
  return concat([new Uint8Array(header), value])
}

/** @internal */
export const TAG_INTEGER = 0x02
/** @internal */
export const TAG_OCTET_STRING = 0x04
/** @internal */
export const TAG_NULL = 0x05
/** @internal */
export const TAG_OID = 0x06
/** @internal */
export const TAG_SEQUENCE = 0x30

/** @internal */
export const sequence = (...items: ReadonlyArray<Uint8Array>): Bytes => encode(TAG_SEQUENCE, concat(items))

/** @internal */
export const OID_RSA_ENCRYPTION = "1.2.840.113549.1.1.1"
/** @internal */
export const OID_EC_PUBLIC_KEY = "1.2.840.10045.2.1"
/** @internal */
export const OID_ED25519 = "1.3.101.112"

/** @internal */
export const curveOids: Record<string, string> = {
  "1.2.840.10045.3.1.7": "P-256",
  "1.3.132.0.34": "P-384",
  "1.3.132.0.35": "P-521"
}
