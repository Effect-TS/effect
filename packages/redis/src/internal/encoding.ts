// Internal implementation.
import type { Argument } from "../RedisProtocol.ts"

const encoder = new TextEncoder()
const preparedFrames = new WeakMap<ReadonlyArray<Argument>, Frame>()

export interface Frame {
  readonly bytes: string | Uint8Array | ReadonlyArray<string | Uint8Array>
  readonly size: number
}

export const isVector: (bytes: Frame["bytes"]) => bytes is ReadonlyArray<string | Uint8Array> = Array.isArray

const hasLargeBinary = (args: ReadonlyArray<Argument>): boolean => {
  for (const arg of args) {
    if (typeof arg !== "string" && arg.length >= 1024) return true
  }
  return false
}

interface Layout {
  readonly fixed: ReadonlyArray<{ readonly offset: number; readonly bytes: Uint8Array }>
  readonly binary: ReadonlyArray<{ readonly index: number; readonly offset: number; readonly size: number }>
}

interface Measured {
  readonly lengths: ReadonlyArray<number>
  readonly size: number
  layout?: Layout
}

const measure = (args: ReadonlyArray<Argument>): Measured => {
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

const sameShape = (left: ReadonlyArray<Argument>, right: ReadonlyArray<Argument>): boolean => {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) {
    const argument = left[index]
    const previous = right[index]
    if (typeof argument === "string") {
      if (argument !== previous) return false
    } else if (typeof previous === "string" || argument.length !== previous.length) return false
  }
  return true
}

// Repeated batch shapes share immutable length metadata. Binary bytes are
// still copied separately for each command, even when their lengths match.
const compileLayout = (args: ReadonlyArray<Argument>, lengths: ReadonlyArray<number>): Layout => {
  const fixed: Array<{ readonly offset: number; readonly bytes: Uint8Array }> = []
  const binary: Array<{ readonly index: number; readonly offset: number; readonly size: number }> = []
  let offset = 0
  let text = `*${args.length}\r\n`
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const size = lengths[index]
    text += `$${size}\r\n`
    if (typeof arg === "string") text += `${arg}\r\n`
    else {
      const bytes = encoder.encode(text)
      fixed.push({ offset, bytes })
      offset += bytes.length
      binary.push({ index, offset, size })
      offset += size
      text = "\r\n"
    }
  }
  if (text.length > 0) fixed.push({ offset, bytes: encoder.encode(text) })
  return { fixed, binary }
}

const measureCommands = (commands: ReadonlyArray<ReadonlyArray<Argument>>) => {
  const measured: Array<Measured> = []
  for (let index = 0; index < commands.length; index++) {
    if (index > 0 && sameShape(commands[index], commands[index - 1])) {
      const previous = measured[index - 1]
      previous.layout ??= compileLayout(commands[index], previous.lengths)
      measured.push(previous)
    } else measured.push(measure(commands[index]))
  }
  return measured
}

const write = (
  args: ReadonlyArray<Argument>,
  lengths: ReadonlyArray<number>,
  bytes: Uint8Array,
  start: number,
  snapshot?: Array<Argument>,
  layout?: Layout
) => {
  if (layout !== undefined) {
    for (const span of layout.fixed) bytes.set(span.bytes, start + span.offset)
    for (const field of layout.binary) {
      const offset = start + field.offset
      bytes.set(args[field.index] as Uint8Array, offset)
      if (snapshot !== undefined) snapshot[field.index] = bytes.subarray(offset, offset + field.size)
    }
    return
  }
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

// Transports can encode immutable text directly into their socket write. Keep
// byte counts separate from JS string length for capacity and Unicode headers.
export const encodeFrame = (args: ReadonlyArray<Argument>): Frame => {
  const prepared = preparedFrames.get(args)
  if (prepared !== undefined) return prepared
  if (hasLargeBinary(args)) {
    const snapshot = args.slice()
    prepareSnapshots([snapshot])
    return preparedFrames.get(snapshot)!
  }
  for (const arg of args) {
    if (typeof arg !== "string") {
      const bytes = encodeCommand(args)
      return { bytes, size: bytes.length }
    }
  }
  const { lengths, size } = measure(args)
  let bytes = `*${args.length}\r\n`
  for (let index = 0; index < args.length; index++) bytes += `$${lengths[index]}\r\n${args[index]}\r\n`
  return { bytes, size }
}

// A physical session retains at most one small immutable text frame. Validate
// owned argument values on each invocation, including repeated Effects using
// caller arrays that can change; binary inputs always retain the copy path.
export const makeFrameEncoder = (): (args: ReadonlyArray<Argument>) => Frame => {
  let previous: ReadonlyArray<string> | undefined
  let previousFrame: Frame | undefined
  return (args) => {
    let same = previous !== undefined && args.length === previous.length
    for (let index = 0; index < args.length; index++) {
      const arg = args[index]
      if (typeof arg !== "string") return encodeFrame(args)
      if (same && arg !== previous![index]) same = false
    }
    if (same) return previousFrame!
    const snapshot = args.slice() as Array<string>
    const frame = encodeFrame(snapshot)
    if (frame.size <= 4096) {
      previous = snapshot
      previousFrame = frame
    } else {
      previous = undefined
      previousFrame = undefined
    }
    return frame
  }
}

const vectorFrame = (args: ReadonlyArray<Argument>, measured: Measured): Frame => {
  const layout = measured.layout ??= compileLayout(args, measured.lengths)
  const parts: Array<string | Uint8Array> = []
  for (let index = 0; index < layout.binary.length; index++) {
    parts.push(layout.fixed[index].bytes)
    parts.push(args[layout.binary[index].index] as Uint8Array)
  }
  parts.push(layout.fixed[layout.fixed.length - 1].bytes)
  return { bytes: parts, size: measured.size }
}

const prepareVectorSnapshots = (commands: ReadonlyArray<Array<Argument>>, measured: ReadonlyArray<Measured>) => {
  const snapshots = new Map<Uint8Array, { readonly offset: number; bytes?: Uint8Array }>()
  let size = 0
  for (const args of commands) {
    for (const arg of args) {
      if (typeof arg !== "string" && !snapshots.has(arg)) {
        snapshots.set(arg, { offset: size })
        size += arg.length
      }
    }
  }
  // Only exact source identities share a snapshot, within this invocation.
  // Distinct views, even with equal lengths or contents, keep distinct ranges.
  const owned = new Uint8Array(size)
  for (const [arg, snapshot] of snapshots) {
    owned.set(arg, snapshot.offset)
    snapshot.bytes = owned.subarray(snapshot.offset, snapshot.offset + arg.length)
  }
  const large = commands.map(hasLargeBinary)
  const small = new Uint8Array(measured.reduce((total, command, index) => total + (large[index] ? 0 : command.size), 0))
  let offset = 0
  let previousVector: Frame | undefined
  for (let index = 0; index < commands.length; index++) {
    const args = commands[index]
    for (let argument = 0; argument < args.length; argument++) {
      const value = args[argument]
      if (typeof value !== "string") args[argument] = snapshots.get(value)!.bytes!
    }
    const metadata = measured[index]
    if (large[index]) {
      let same = previousVector !== undefined && metadata === measured[index - 1]
      if (same) {
        // Shared metadata guarantees identical fixed spans and binary lengths.
        // Reuse a vector only for the exact owned snapshots of this invocation.
        const previous = commands[index - 1]
        for (const field of metadata.layout!.binary) {
          if (args[field.index] !== previous[field.index]) {
            same = false
            break
          }
        }
      }
      if (!same) previousVector = vectorFrame(args, metadata)
      preparedFrames.set(args, previousVector!)
    } else {
      previousVector = undefined
      write(args, metadata.lengths, small, offset, undefined, metadata.layout)
      preparedFrames.set(args, { bytes: small.subarray(offset, offset + metadata.size), size: metadata.size })
      offset += metadata.size
    }
  }
}

// These arrays belong to one client invocation and never escape to the caller.
// Small binary batches snapshot into contiguous wire positions. Large payloads
// use one owned slab for unique source objects, retained by vectors and routing
// views without copying repeated payloads into every command frame.
export const prepareSnapshots = (commands: ReadonlyArray<Array<Argument>>): void => {
  const measured = measureCommands(commands)
  if (commands.some(hasLargeBinary)) return prepareVectorSnapshots(commands, measured)
  const bytes = new Uint8Array(measured.reduce((total, command) => total + command.size, 0))
  let offset = 0
  for (let index = 0; index < commands.length; index++) {
    const args = commands[index]
    const { lengths, size, layout } = measured[index]
    write(args, lengths, bytes, offset, args, layout)
    preparedFrames.set(args, { bytes: bytes.subarray(offset, offset + size), size })
    offset += size
  }
}

const frameBytes = (frame: Frame): Uint8Array => {
  if (typeof frame.bytes === "string") return encoder.encode(frame.bytes)
  if (!isVector(frame.bytes)) return frame.bytes
  const bytes = new Uint8Array(frame.size)
  let offset = 0
  for (const part of frame.bytes) {
    if (typeof part === "string") offset += encoder.encodeInto(part, bytes.subarray(offset)).written
    else {
      bytes.set(part, offset)
      offset += part.length
    }
  }
  return bytes
}

// Each entry retains its frame for cancellation/capacity accounting while the
// writer can submit an intact batch without allocating or copying it again.
export const encodeCommands = (commands: ReadonlyArray<ReadonlyArray<Argument>>): Array<Uint8Array> => {
  const frames = new Array<Uint8Array>(commands.length)
  let cached = false
  for (let index = 0; index < commands.length; index++) {
    const prepared = preparedFrames.get(commands[index])
    if (prepared !== undefined) {
      frames[index] = frameBytes(prepared)
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
  const measured = measureCommands(commands)
  const bytes = new Uint8Array(measured.reduce((total, command) => total + command.size, 0))
  let offset = 0
  for (let index = 0; index < commands.length; index++) {
    const { lengths, size, layout } = measured[index]
    write(commands[index], lengths, bytes, offset, undefined, layout)
    frames[index] = bytes.subarray(offset, offset + size)
    offset += size
  }
  return frames
}

export const encodeFrames = (commands: ReadonlyArray<ReadonlyArray<Argument>>): Array<Frame> => {
  let vector = false
  for (const args of commands) {
    const prepared = preparedFrames.get(args)
    if ((prepared !== undefined && isVector(prepared.bytes)) || hasLargeBinary(args)) {
      vector = true
      break
    }
  }
  if (vector) {
    const frames = new Array<Frame>(commands.length)
    const snapshots: Array<Array<Argument>> = []
    const indexes: Array<number> = []
    for (let index = 0; index < commands.length; index++) {
      const args = commands[index]
      const prepared = preparedFrames.get(args)
      if (prepared !== undefined) frames[index] = prepared
      else {
        snapshots.push(args.slice())
        indexes.push(index)
      }
    }
    if (snapshots.length > 0) {
      prepareSnapshots(snapshots)
      for (let index = 0; index < snapshots.length; index++) {
        frames[indexes[index]] = preparedFrames.get(snapshots[index])!
      }
    }
    return frames
  }
  for (const args of commands) {
    for (const arg of args) {
      if (typeof arg !== "string") {
        // Binary batches keep their contiguous owned allocation, including
        // cached snapshots and any text commands surrounding them.
        return encodeCommands(commands).map((bytes) => ({ bytes, size: bytes.length }))
      }
    }
  }
  const frames: Array<Frame> = []
  for (let index = 0; index < commands.length; index++) {
    const previous = frames[index - 1]
    frames.push(
      previous !== undefined && typeof previous.bytes === "string" &&
        sameShape(commands[index], commands[index - 1])
        ? previous
        : encodeFrame(commands[index])
    )
  }
  return frames
}
