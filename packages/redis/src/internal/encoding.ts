// Internal implementation.
import type { Argument } from "../RedisProtocol.ts"

const encoder = new TextEncoder()
const preparedFrames = new WeakMap<ReadonlyArray<Argument>, Uint8Array>()

const measure = (args: ReadonlyArray<Argument>) => {
  const lengths: Array<number> = []
  let size = String(args.length).length + 3
  for (const arg of args) {
    let length = typeof arg === "string" ? 0 : arg.length
    if (typeof arg === "string") {
      for (let index = 0; index < arg.length; index++) {
        const code = arg.charCodeAt(index)
        if (code < 0x80) length++
        else if (code < 0x800) length += 2
        else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < arg.length) {
          const next = arg.charCodeAt(index + 1)
          if (next >= 0xDC00 && next <= 0xDFFF) {
            length += 4
            index++
          } else length += 3
        } else length += 3
      }
    }
    lengths.push(length)
    size += String(length).length + length + 5
  }
  return { lengths, size }
}

const write = (
  args: ReadonlyArray<Argument>,
  lengths: ReadonlyArray<number>,
  bytes: Uint8Array,
  start: number,
  snapshot?: Array<Argument>
) => {
  let offset = start
  const header = (marker: number, size: number) => {
    bytes[offset++] = marker
    const digits = String(size)
    for (let index = 0; index < digits.length; index++) bytes[offset++] = digits.charCodeAt(index)
    bytes[offset++] = 13
    bytes[offset++] = 10
  }
  header(42, args.length)
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const size = lengths[index]
    header(36, size)
    if (typeof arg !== "string") {
      bytes.set(arg, offset)
      if (snapshot !== undefined) snapshot[index] = bytes.subarray(offset, offset + size)
    } else if (size === arg.length) {
      for (let character = 0; character < arg.length; character++) {
        bytes[offset + character] = arg.charCodeAt(character)
      }
    } else encoder.encodeInto(arg, bytes.subarray(offset, offset + size))
    offset += size
    bytes[offset++] = 13
    bytes[offset++] = 10
  }
}

export const encodeCommand = (args: ReadonlyArray<Argument>): Uint8Array => {
  const measured = measure(args)
  const bytes = new Uint8Array(measured.size)
  write(args, measured.lengths, bytes, 0)
  return bytes
}

// These arrays belong to one client invocation and never escape to the caller.
// Copy binary payloads into their wire positions and retain stable argument
// views for routing and retries, avoiding a separate payload snapshot buffer.
export const prepareSnapshots = (commands: ReadonlyArray<Array<Argument>>): void => {
  const measured = commands.map(measure)
  const bytes = new Uint8Array(measured.reduce((total, command) => total + command.size, 0))
  let offset = 0
  for (let index = 0; index < commands.length; index++) {
    const args = commands[index]
    const { lengths, size } = measured[index]
    write(args, lengths, bytes, offset, args)
    preparedFrames.set(args, bytes.subarray(offset, offset + size))
    offset += size
  }
}

// Each entry retains its frame for cancellation/capacity accounting while the
// writer can submit an intact batch without allocating or copying it again.
export const encodeCommands = (commands: ReadonlyArray<ReadonlyArray<Argument>>): Array<Uint8Array> => {
  const frames = new Array<Uint8Array>(commands.length)
  let cached = false
  for (let index = 0; index < commands.length; index++) {
    const prepared = preparedFrames.get(commands[index])
    if (prepared !== undefined) {
      frames[index] = prepared
      cached = true
    }
  }
  if (cached) {
    for (let index = 0; index < commands.length; index++) frames[index] ??= encodeCommand(commands[index])
    return frames
  }
  if (commands.length === 1) {
    frames[0] = encodeCommand(commands[0])
    return frames
  }
  const measured = commands.map(measure)
  const bytes = new Uint8Array(measured.reduce((total, command) => total + command.size, 0))
  let offset = 0
  for (let index = 0; index < commands.length; index++) {
    const { lengths, size } = measured[index]
    write(commands[index], lengths, bytes, offset)
    frames[index] = bytes.subarray(offset, offset + size)
    offset += size
  }
  return frames
}
