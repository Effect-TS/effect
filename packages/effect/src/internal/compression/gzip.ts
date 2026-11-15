// gzip (RFC 1952) decoder: parses each member's header and trailer around the
// raw deflate decoder that `effect/encoding/Zip` also uses.

import { crc32 } from "../crc32.ts"
import { ByteQueue, InflateError, InflateMemory, Inflater, NeedInput } from "../inflate.ts"
import { type Decoder, fail, Output, readUint32 } from "./failure.ts"

// FLG bits (RFC 1952, section 2.3.1)
const FHCRC = 2
const FEXTRA = 4
const FNAME = 8
const FCOMMENT = 16
const FRESERVED = 0xe0

// Deflate cannot expand data by more than about 1032 times, which bounds the
// size hint taken from the untrusted trailer
const MAX_RATIO = 1032

// Decoding is synchronous, so one set of inflater arrays serves every call
let memory: InflateMemory | undefined

// Returns the offset of the deflate data of the member at `offset`
const readHeader = (input: Uint8Array, offset: number): number => {
  const length = input.length
  // Bytes that do not start like a member are not a truncated one
  if (
    (offset < length && input[offset] !== 31) ||
    (offset + 1 < length && input[offset + 1] !== 139)
  ) {
    fail("Malformed", `expected a gzip member at offset ${offset}`)
  }
  if (offset + 10 > length) fail("Truncated", "the input ends inside a gzip header")
  if (input[offset + 2] !== 8) fail("Malformed", `unknown compression method ${input[offset + 2]}`)
  const flags = input[offset + 3]
  // A compliant decompressor must give an error when reserved bits are set
  if ((flags & FRESERVED) !== 0) fail("Malformed", "reserved header flags are set")
  // MTIME, XFL and OS carry no information needed to decode
  let position = offset + 10
  if ((flags & FEXTRA) !== 0) {
    if (position + 2 > length) fail("Truncated", "the input ends inside the gzip extra field")
    position += 2 + (input[position] | (input[position + 1] << 8))
    if (position > length) fail("Truncated", "the input ends inside the gzip extra field")
  }
  if ((flags & FNAME) !== 0) {
    const end = input.indexOf(0, position)
    if (end === -1) fail("Truncated", "the input ends inside the gzip file name")
    position = end + 1
  }
  if ((flags & FCOMMENT) !== 0) {
    const end = input.indexOf(0, position)
    if (end === -1) fail("Truncated", "the input ends inside the gzip comment")
    position = end + 1
  }
  if ((flags & FHCRC) !== 0) {
    if (position + 2 > length) fail("Truncated", "the input ends inside the gzip header CRC")
    const expected = input[position] | (input[position + 1] << 8)
    if ((crc32(0, input.subarray(offset, position)) & 0xffff) !== expected) {
      fail("Checksum", "the gzip header CRC does not match")
    }
    position += 2
  }
  return position
}

// Inflates the deflate stream at `offset` into `output` and returns its end
const inflate = (input: Uint8Array, offset: number, output: Output): number => {
  const queue = new ByteQueue()
  queue.push(input.subarray(offset))
  const inflater = new Inflater(queue, memory ??= new InflateMemory())
  try {
    while (true) {
      const chunk = inflater.pull()
      if (chunk === undefined) break
      // All of the input is queued, so asking for more means it was cut short
      if (chunk === NeedInput) return fail("Truncated", "the input ends inside the deflate data")
      output.reserve(chunk.length)
      output.buffer.set(chunk, output.length)
      output.length += chunk.length
    }
  } catch (error) {
    if (error instanceof InflateError) fail("Malformed", error.message)
    throw error
  }
  // The inflater puts back the bytes after the stream
  return offset + queue.consumed
}

/** @internal */
export const gzip: Decoder = (input, limit, sizeHint) => {
  if (input.length === 0) fail("Truncated", "the input is empty")
  // A single member records its size, modulo 2^32, in its last four bytes
  const hint = sizeHint ?? (input.length >= 18
    ? Math.min(readUint32(input, input.length - 4), input.length * MAX_RATIO)
    : undefined)
  const output = new Output(limit, hint)
  let offset = 0
  // Members follow one another to the end of the input (RFC 1952, section 2.2)
  while (offset < input.length) {
    const start = output.length
    offset = inflate(input, readHeader(input, offset), output)
    if (offset + 8 > input.length) fail("Truncated", "the input ends inside the gzip trailer")
    const crc = crc32(0, output.buffer.subarray(start, output.length))
    if (crc !== readUint32(input, offset)) fail("Checksum", "the gzip CRC-32 does not match the data")
    if (((output.length - start) % 0x100000000) !== readUint32(input, offset + 4)) {
      fail("Malformed", "the gzip trailer size does not match the data")
    }
    offset += 8
  }
  return output.finish()
}
