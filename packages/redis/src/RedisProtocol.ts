/**
 * Binary-safe encoding and incremental decoding of RESP2 and RESP3 Redis messages.
 *
 * @stability unstable
 * @since 4.0.0
 */
import { RedisError } from "./RedisError.ts"

/**
 * A text or binary Redis command argument.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Argument = string | Uint8Array

/**
 * A lossless RESP2 or RESP3 reply, including nested errors and pushed messages.
 *
 * **Details**
 *
 * Integer replies preserve precision as `bigint`. Binary fields own their bytes
 * and remain valid after subsequent parser calls. Attributes retain their
 * metadata and the value that follows them.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Reply =
  | { readonly _tag: "SimpleString"; readonly value: string }
  | { readonly _tag: "BlobString"; readonly value: Uint8Array }
  | { readonly _tag: "Integer"; readonly value: bigint }
  | { readonly _tag: "Double"; readonly value: number }
  | { readonly _tag: "Boolean"; readonly value: boolean }
  | { readonly _tag: "BigNumber"; readonly value: bigint }
  | { readonly _tag: "Null" }
  | { readonly _tag: "Array"; readonly values: ReadonlyArray<Reply> }
  | { readonly _tag: "Map"; readonly entries: ReadonlyArray<readonly [Reply, Reply]> }
  | { readonly _tag: "Set"; readonly values: ReadonlyArray<Reply> }
  | { readonly _tag: "Error"; readonly message: string; readonly code: string }
  | { readonly _tag: "VerbatimString"; readonly format: string; readonly value: Uint8Array }
  | { readonly _tag: "Push"; readonly values: ReadonlyArray<Reply> }
  | {
    readonly _tag: "Attribute"
    readonly entries: ReadonlyArray<readonly [Reply, Reply]>
    readonly value: Reply
  }

/**
 * Limits on the encoded bytes, nesting, and members of a single reply.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ParserOptions {
  readonly maxFrameSize?: number | undefined
  readonly maxDepth?: number | undefined
  readonly maxAggregateLength?: number | undefined
}

/**
 * An incremental RESP decoder with terminal failures and explicit EOF validation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Parser {
  /** Returns complete replies and retains any incomplete reply for the next call. */
  readonly push: (chunk: Uint8Array) => Array<Reply>
  /** Validates that the byte stream ends between replies and closes the parser. */
  readonly end: () => void
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const minInteger = BigInt("-9223372036854775808")
const maxInteger = BigInt("9223372036854775807")

/**
 * Encodes command arguments as a RESP array of binary-safe bulk strings.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encode = (args: ReadonlyArray<Argument>): Uint8Array => {
  const lengths: Array<number> = []
  let length = String(args.length).length + 3
  for (const arg of args) {
    let size = typeof arg === "string" ? 0 : arg.length
    if (typeof arg === "string") {
      for (let index = 0; index < arg.length; index++) {
        const code = arg.charCodeAt(index)
        if (code < 0x80) size++
        else if (code < 0x800) size += 2
        else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < arg.length) {
          const next = arg.charCodeAt(index + 1)
          if (next >= 0xDC00 && next <= 0xDFFF) {
            size += 4
            index++
          } else size += 3
        } else size += 3
      }
    }
    lengths.push(size)
    length += String(size).length + size + 5
  }
  const result = new Uint8Array(length)
  let offset = 0
  const header = (marker: number, size: number) => {
    result[offset++] = marker
    const digits = String(size)
    for (let index = 0; index < digits.length; index++) result[offset++] = digits.charCodeAt(index)
    result[offset++] = 13
    result[offset++] = 10
  }
  header(42, args.length)
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const size = lengths[index]
    header(36, size)
    if (typeof arg !== "string") result.set(arg, offset)
    else if (size === arg.length) {
      for (let character = 0; character < arg.length; character++) {
        result[offset + character] = arg.charCodeAt(character)
      }
    } else encoder.encodeInto(arg, result.subarray(offset, offset + size))
    offset += size
    result[offset++] = 13
    result[offset++] = 10
  }
  return result
}

interface Aggregate {
  readonly marker: string
  readonly expected: number | undefined
  readonly values: Array<Reply>
}

const errorReply = (message: string): Reply => ({
  _tag: "Error",
  message,
  code: message.split(" ", 1)[0]
})

const pairs = (values: ReadonlyArray<Reply>): Array<readonly [Reply, Reply]> => {
  const result: Array<readonly [Reply, Reply]> = []
  for (let i = 0; i < values.length; i += 2) result.push([values[i], values[i + 1]])
  return result
}

/**
 * Creates a bounded incremental RESP2/RESP3 parser, including streamed strings
 * and streamed arrays, maps, and sets.
 *
 * **Details**
 *
 * Defaults allow 64 MiB per complete reply, 128 aggregate nesting levels, and
 * one million members per aggregate. Frame limits include metadata and nested
 * replies. Input is consumed once, without repeatedly copying incomplete bodies.
 *
 * **Gotchas**
 *
 * A protocol failure permanently closes the parser and discards replies decoded
 * earlier in that call. Call `end` when the transport reaches EOF to detect
 * truncated replies.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeParser = (options: ParserOptions = {}): Parser => {
  const maxFrameSize = options.maxFrameSize ?? 64 * 1024 * 1024
  const maxDepth = options.maxDepth ?? 128
  const maxAggregateLength = options.maxAggregateLength ?? 1_000_000
  const fail = (message: string): never => {
    closed = true
    throw new RedisError({ reason: "Protocol", message })
  }
  let closed = false
  for (
    const [name, limit, minimum] of [
      ["maxFrameSize", maxFrameSize, 1],
      ["maxDepth", maxDepth, 1],
      ["maxAggregateLength", maxAggregateLength, 0]
    ] as const
  ) {
    if (!Number.isSafeInteger(limit) || limit < minimum) fail(`Invalid ${name}`)
  }
  let state: "marker" | "line" | "lineLf" | "body" | "bodyCr" | "bodyLf" = "marker"
  let marker = ""
  let line: Array<number> = []
  let body = new Uint8Array(0)
  let bodyOffset = 0
  let frameSize = 0
  let streamed: Array<Uint8Array> | undefined
  let streamedSize = 0
  const stack: Array<Aggregate> = []

  const aggregateReply = (aggregate: Aggregate): Reply => {
    switch (aggregate.marker) {
      case "*":
        return { _tag: "Array", values: aggregate.values }
      case "~":
        return { _tag: "Set", values: aggregate.values }
      case ">":
        return { _tag: "Push", values: aggregate.values }
      case "%":
        return { _tag: "Map", entries: pairs(aggregate.values) }
      default:
        return {
          _tag: "Attribute",
          entries: pairs(aggregate.values.slice(0, -1)),
          value: aggregate.values[aggregate.values.length - 1]
        }
    }
  }
  const accept = (reply: Reply, output: Array<Reply>): void => {
    while (stack.length > 0) {
      const parent = stack[stack.length - 1]
      parent.values.push(reply)
      const memberLimit = parent.marker === "%" || parent.marker === "|"
        ? maxAggregateLength * 2 + (parent.marker === "|" ? 1 : 0)
        : maxAggregateLength
      if (parent.values.length > memberLimit) fail("Aggregate member limit exceeded")
      if (parent.expected === undefined || parent.values.length < parent.expected) return
      stack.pop()
      reply = aggregateReply(parent)
    }
    output.push(reply)
    frameSize = 0
  }
  const integer = (value: string): bigint => {
    if (!/^[+-]?\d+$/.test(value)) fail("Invalid RESP integer")
    return BigInt(value)
  }
  const length = (value: string): number => {
    if (!/^\d+$/.test(value)) fail("Invalid RESP length")
    const result = Number(value)
    if (!Number.isSafeInteger(result)) fail("RESP length exceeds safe integer range")
    return result
  }
  const startBody = (size: number): void => {
    if (size + frameSize + 2 > maxFrameSize) fail("Frame size limit exceeded")
    body = new Uint8Array(size)
    bodyOffset = 0
    state = size === 0 ? "bodyCr" : "body"
  }
  const completeLine = (output: Array<Reply>): void => {
    let value = ""
    if (marker === "+" || marker === "-") value = decoder.decode(new Uint8Array(line))
    else {
      // Numeric headers and control tokens are ASCII. Avoid allocating a byte
      // buffer and UTF-8 decoder result for every integer or aggregate member.
      for (let index = 0; index < line.length; index++) {
        const byte = line[index]
        if (byte > 127) fail("Non-ASCII RESP header")
        value += String.fromCharCode(byte)
      }
    }
    line = []
    state = "marker"
    switch (marker) {
      case "+":
        accept({ _tag: "SimpleString", value }, output)
        return
      case "-":
        accept(errorReply(value), output)
        return
      case ":": {
        const parsed = integer(value)
        if (parsed < minInteger || parsed > maxInteger) fail("RESP integer exceeds signed 64-bit range")
        accept({ _tag: "Integer", value: parsed }, output)
        return
      }
      case "(":
        accept({ _tag: "BigNumber", value: integer(value) }, output)
        return
      case "_":
        if (value !== "") fail("Invalid RESP null")
        accept({ _tag: "Null" }, output)
        return
      case "#":
        if (value !== "t" && value !== "f") fail("Invalid RESP boolean")
        accept({ _tag: "Boolean", value: value === "t" }, output)
        return
      case ",": {
        if (!/^(?:-?inf|nan|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(value)) {
          fail("Invalid RESP double")
        }
        const parsed = value === "inf" ? Infinity : value === "-inf" ? -Infinity : Number(value)
        accept({ _tag: "Double", value: parsed }, output)
        return
      }
      case "$":
        if (value === "-1") {
          accept({ _tag: "Null" }, output)
          return
        }
        if (value === "?") {
          streamed = []
          streamedSize = 0
          return
        }
        startBody(length(value))
        return
      case "!":
      case "=":
        startBody(length(value))
        return
      case ";": {
        const size = length(value)
        if (size > 0) {
          startBody(size)
          return
        }
        const result = new Uint8Array(streamedSize)
        let offset = 0
        for (const part of streamed!) {
          result.set(part, offset)
          offset += part.length
        }
        streamed = undefined
        accept({ _tag: "BlobString", value: result }, output)
        return
      }
      case ".": {
        const aggregate = stack[stack.length - 1]
        if (value !== "" || aggregate?.expected !== undefined || !aggregate) fail("Unexpected streamed terminator")
        if (aggregate.marker === "%" && aggregate.values.length % 2 !== 0) fail("Streamed map has unmatched key")
        stack.pop()
        accept(aggregateReply(aggregate), output)
        return
      }
      default: {
        if (marker === "*" && value === "-1") {
          accept({ _tag: "Null" }, output)
          return
        }
        const isStreamed = value === "?" && (marker === "*" || marker === "%" || marker === "~")
        const members = isStreamed ? undefined : length(value)
        if (members !== undefined && members > maxAggregateLength) fail("Aggregate member limit exceeded")
        if (stack.length >= maxDepth) fail("Aggregate depth limit exceeded")
        const expected = members === undefined
          ? undefined
          : marker === "%"
          ? members * 2
          : marker === "|"
          ? members * 2 + 1
          : members
        const aggregate: Aggregate = { marker, expected, values: [] }
        if (expected === 0) accept(aggregateReply(aggregate), output)
        else stack.push(aggregate)
      }
    }
  }
  const completeBody = (output: Array<Reply>): void => {
    state = "marker"
    switch (marker) {
      case ";":
        streamed!.push(body)
        streamedSize += body.length
        return
      case "!":
        accept(errorReply(decoder.decode(body)), output)
        return
      case "=":
        if (body.length < 4 || body[3] !== 58 || body.subarray(0, 3).some((byte) => byte < 33 || byte > 126)) {
          fail("Invalid verbatim string format")
        }
        accept({ _tag: "VerbatimString", format: decoder.decode(body.subarray(0, 3)), value: body.slice(4) }, output)
        return
      default:
        accept({ _tag: "BlobString", value: body }, output)
    }
  }
  return {
    push(chunk) {
      if (closed) fail("Parser is closed")
      const output: Array<Reply> = []
      for (let offset = 0; offset < chunk.length;) {
        if (state === "body") {
          const count = Math.min(body.length - bodyOffset, chunk.length - offset)
          if (frameSize + count > maxFrameSize) fail("Frame size limit exceeded")
          body.set(chunk.subarray(offset, offset + count), bodyOffset)
          frameSize += count
          bodyOffset += count
          offset += count
          if (bodyOffset === body.length) state = "bodyCr"
          continue
        }
        const byte = chunk[offset++]
        if (++frameSize > maxFrameSize) fail("Frame size limit exceeded")
        switch (state) {
          case "marker":
            marker = String.fromCharCode(byte)
            if (streamed ? marker !== ";" : !"+-:,$!_=#(*%~>|.".includes(marker) || marker === ";") {
              fail("Unexpected RESP marker")
            }
            state = "line"
            break
          case "line":
            if (byte === 13) state = "lineLf"
            else if (byte === 10) fail("RESP line requires CRLF")
            else line.push(byte)
            break
          case "lineLf":
            if (byte !== 10) fail("RESP line requires CRLF")
            completeLine(output)
            break
          case "bodyCr":
            if (byte !== 13) fail("RESP body requires CRLF")
            state = "bodyLf"
            break
          case "bodyLf":
            if (byte !== 10) fail("RESP body requires CRLF")
            completeBody(output)
            break
        }
      }
      return output
    },
    end() {
      if (closed) fail("Parser is closed")
      if (state !== "marker" || stack.length !== 0 || streamed !== undefined) fail("Incomplete RESP reply at EOF")
      closed = true
    }
  }
}

/**
 * Converts replies to JavaScript values with UTF-8 strings and safe integer numbers.
 *
 * **Details**
 *
 * Maps and sets become native collections, big numbers remain `bigint`, nested
 * errors become `RedisError` values, and attributes unwrap to their value.
 *
 * **Gotchas**
 *
 * Throws a decode error for integer replies outside JavaScript's safe integer
 * range. Use the original reply to preserve binary strings, attributes, or
 * arbitrary integer precision.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const toValue = (reply: Reply): unknown => {
  switch (reply._tag) {
    case "SimpleString":
      return reply.value
    case "BlobString":
    case "VerbatimString":
      return decoder.decode(reply.value)
    case "Integer": {
      const value = Number(reply.value)
      if (!Number.isSafeInteger(value)) {
        throw new RedisError({ reason: "Decode", message: "Redis integer exceeds JavaScript safe integer range" })
      }
      return value
    }
    case "BigNumber":
    case "Double":
    case "Boolean":
      return reply.value
    case "Null":
      return null
    case "Array":
    case "Push":
      return reply.values.map(toValue)
    case "Set":
      return new Set(reply.values.map(toValue))
    case "Map":
      return new Map(reply.entries.map(([key, value]) => [toValue(key), toValue(value)]))
    case "Attribute":
      return toValue(reply.value)
    case "Error":
      return new RedisError({ reason: "Server", message: reply.message, code: reply.code })
  }
}
