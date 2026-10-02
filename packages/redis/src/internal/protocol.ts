import { RedisError } from "../RedisError.ts"
import type { Argument, Parser, ParserOptions, Reply } from "../RedisProtocol.ts"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const CR = 13
const LF = 10

export const encode = (args: ReadonlyArray<Argument>): Uint8Array => {
  const values = args.map((arg) => typeof arg === "string" ? encoder.encode(arg) : arg)
  let size = String(values.length).length + 3
  for (const value of values) size += String(value.length).length + value.length + 5
  const bytes = new Uint8Array(size)
  let offset = writeHeader(bytes, 0, "*", values.length)
  for (const value of values) {
    offset = writeHeader(bytes, offset, "$", value.length)
    bytes.set(value, offset)
    offset += value.length
    bytes[offset++] = CR
    bytes[offset++] = LF
  }
  return bytes
}

const writeHeader = (bytes: Uint8Array, offset: number, marker: string, length: number): number => {
  const header = `${marker}${length}\r\n`
  for (let i = 0; i < header.length; i++) bytes[offset++] = header.charCodeAt(i)
  return offset
}

const minInteger = -(BigInt("2") ** BigInt("63"))
const maxInteger = BigInt("2") ** BigInt("63") - BigInt("1")
const integerPattern = /^[+-]?\d+$/
const lengthPattern = /^\d+$/
const doublePattern = /^(?:[+-]?inf|nan|[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/

type AggregateMarker = "*" | "%" | "~" | ">" | "|"

interface Aggregate {
  readonly marker: AggregateMarker
  /** Expected member count, or undefined for a streamed aggregate. */
  readonly size: number | undefined
  readonly limit: number
  readonly values: Array<Reply>
}

interface Body {
  readonly marker: "$" | "!" | "=" | ";"
  readonly bytes: Uint8Array
  filled: number
}

const errorReply = (message: string): Reply => ({ _tag: "Error", message, code: message.split(" ", 1)[0] })

const pairs = (values: ReadonlyArray<Reply>): Array<readonly [Reply, Reply]> => {
  const entries: Array<readonly [Reply, Reply]> = []
  for (let i = 0; i + 1 < values.length; i += 2) entries.push([values[i], values[i + 1]])
  return entries
}

const aggregateReply = ({ marker, values }: Aggregate): Reply => {
  switch (marker) {
    case "*":
      return { _tag: "Array", values }
    case "~":
      return { _tag: "Set", values }
    case ">":
      return { _tag: "Push", values }
    case "%":
      return { _tag: "Map", entries: pairs(values) }
    case "|":
      return { _tag: "Attribute", entries: pairs(values.slice(0, -1)), value: values[values.length - 1] }
  }
}

export const makeParser = (options: ParserOptions = {}): Parser => {
  const maxFrameSize = options.maxFrameSize ?? 64 * 1024 * 1024
  const maxDepth = options.maxDepth ?? 128
  const maxAggregateLength = options.maxAggregateLength ?? 1_000_000

  let closed = false
  const fail = (message: string): never => {
    closed = true
    throw new RedisError({ reason: "Protocol", message })
  }

  if (!Number.isSafeInteger(maxFrameSize) || maxFrameSize < 1) fail("Invalid maxFrameSize")
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 1) fail("Invalid maxDepth")
  if (!Number.isSafeInteger(maxAggregateLength) || maxAggregateLength < 0) fail("Invalid maxAggregateLength")

  let buffer: Uint8Array = new Uint8Array(0)
  // Bytes consumed by the top-level reply currently being decoded.
  let frameSize = 0
  let body: Body | undefined
  let streamed: Array<Uint8Array> | undefined
  const stack: Array<Aggregate> = []
  let output: Array<Reply> = []

  const consume = (size: number) => {
    frameSize += size
    if (frameSize > maxFrameSize) fail("Frame size limit exceeded")
  }

  const emit = (reply: Reply): void => {
    while (stack.length > 0) {
      const parent = stack[stack.length - 1]
      parent.values.push(reply)
      if (parent.values.length > parent.limit) fail("Aggregate member limit exceeded")
      if (parent.size === undefined || parent.values.length < parent.size) return
      stack.pop()
      reply = aggregateReply(parent)
    }
    output.push(reply)
    frameSize = 0
  }

  const ascii = (bytes: Uint8Array): string => {
    let text = ""
    for (const byte of bytes) {
      if (byte > 127) fail("Non-ASCII RESP header")
      text += String.fromCharCode(byte)
    }
    return text
  }

  const length = (text: string): number => {
    const value = lengthPattern.test(text) ? Number(text) : NaN
    if (!Number.isSafeInteger(value)) fail("Invalid RESP length")
    return value
  }

  const integer = (text: string): bigint => {
    if (!integerPattern.test(text)) fail("Invalid RESP integer")
    return BigInt(text)
  }

  const startBody = (marker: Body["marker"], size: number) => {
    consume(size + 2)
    body = { marker, bytes: new Uint8Array(size), filled: 0 }
  }

  const startAggregate = (marker: AggregateMarker, header: string) => {
    if (marker === "*" && header === "-1") return emit({ _tag: "Null" })
    const isStreamed = header === "?" && (marker === "*" || marker === "%" || marker === "~")
    const count = isStreamed ? undefined : length(header)
    if (count !== undefined && count > maxAggregateLength) fail("Aggregate member limit exceeded")
    if (stack.length >= maxDepth) fail("Aggregate depth limit exceeded")
    const members = (value: number) => marker === "%" ? value * 2 : marker === "|" ? value * 2 + 1 : value
    const aggregate: Aggregate = {
      marker,
      size: count === undefined ? undefined : members(count),
      limit: members(maxAggregateLength),
      values: []
    }
    if (aggregate.size === 0) emit(aggregateReply(aggregate))
    else stack.push(aggregate)
  }

  const endStreamedAggregate = (header: string) => {
    const aggregate = stack[stack.length - 1]
    if (header !== "" || aggregate === undefined || aggregate.size !== undefined) fail("Unexpected streamed terminator")
    if (aggregate.marker === "%" && aggregate.values.length % 2 !== 0) fail("Streamed map has an unmatched key")
    stack.pop()
    emit(aggregateReply(aggregate))
  }

  const line = (marker: string, content: Uint8Array) => {
    if (streamed !== undefined) {
      if (marker !== ";") fail("Unexpected RESP marker")
      const size = length(ascii(content))
      if (size > 0) return startBody(";", size)
      const parts = streamed
      streamed = undefined
      const value = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
      let offset = 0
      for (const part of parts) {
        value.set(part, offset)
        offset += part.length
      }
      return emit({ _tag: "BlobString", value })
    }
    switch (marker) {
      case "+":
        return emit({ _tag: "SimpleString", value: decoder.decode(content) })
      case "-":
        return emit(errorReply(decoder.decode(content)))
      case ":": {
        const value = integer(ascii(content))
        if (value < minInteger || value > maxInteger) fail("RESP integer exceeds the signed 64-bit range")
        return emit({ _tag: "Integer", value })
      }
      case "(":
        return emit({ _tag: "BigNumber", value: integer(ascii(content)) })
      case ",": {
        const text = ascii(content)
        if (!doublePattern.test(text)) fail("Invalid RESP double")
        const value = text.endsWith("inf") ? (text.startsWith("-") ? -Infinity : Infinity) : Number(text)
        return emit({ _tag: "Double", value })
      }
      case "#": {
        const text = ascii(content)
        if (text !== "t" && text !== "f") fail("Invalid RESP boolean")
        return emit({ _tag: "Boolean", value: text === "t" })
      }
      case "_":
        if (content.length !== 0) fail("Invalid RESP null")
        return emit({ _tag: "Null" })
      case "$": {
        const header = ascii(content)
        if (header === "-1") return emit({ _tag: "Null" })
        if (header === "?") {
          streamed = []
          return
        }
        return startBody("$", length(header))
      }
      case "!":
      case "=":
        return startBody(marker, length(ascii(content)))
      case "*":
      case "%":
      case "~":
      case ">":
      case "|":
        return startAggregate(marker, ascii(content))
      case ".":
        return endStreamedAggregate(ascii(content))
      default:
        return fail("Unexpected RESP marker")
    }
  }

  const completeBody = ({ bytes, marker }: Body) => {
    switch (marker) {
      case ";":
        streamed!.push(bytes)
        return
      case "$":
        return emit({ _tag: "BlobString", value: bytes })
      case "!":
        return emit(errorReply(decoder.decode(bytes)))
      case "=": {
        const format = bytes.subarray(0, 3)
        if (bytes.length < 4 || bytes[3] !== 58 || format.some((byte) => byte < 33 || byte > 126)) {
          fail("Invalid verbatim string format")
        }
        return emit({ _tag: "VerbatimString", format: decoder.decode(format), value: bytes.subarray(4) })
      }
    }
  }

  const decode = (): number => {
    let offset = 0
    while (true) {
      if (body !== undefined) {
        const count = Math.min(body.bytes.length - body.filled, buffer.length - offset)
        body.bytes.set(buffer.subarray(offset, offset + count), body.filled)
        body.filled += count
        offset += count
        if (body.filled < body.bytes.length || buffer.length - offset < 2) return offset
        if (buffer[offset] !== CR || buffer[offset + 1] !== LF) fail("RESP body requires CRLF")
        offset += 2
        const complete = body
        body = undefined
        completeBody(complete)
        continue
      }
      let end = offset
      while (end < buffer.length && buffer[end] !== CR) {
        if (buffer[end] === LF) fail("RESP line requires CRLF")
        end++
      }
      if (end + 1 >= buffer.length) {
        if (frameSize + buffer.length - offset > maxFrameSize) fail("Frame size limit exceeded")
        return offset
      }
      if (buffer[end + 1] !== LF) fail("RESP line requires CRLF")
      consume(end + 2 - offset)
      const marker = String.fromCharCode(buffer[offset])
      const content = buffer.subarray(offset + 1, end)
      offset = end + 2
      line(marker, content)
    }
  }

  return {
    push(chunk) {
      if (closed) fail("Parser is closed")
      if (buffer.length === 0) {
        buffer = chunk
      } else {
        const joined = new Uint8Array(buffer.length + chunk.length)
        joined.set(buffer)
        joined.set(chunk, buffer.length)
        buffer = joined
      }
      output = []
      const consumed = decode()
      // Retain a private copy of any incomplete header; callers may reuse chunks.
      buffer = buffer.slice(consumed)
      const replies = output
      output = []
      return replies
    },
    end() {
      if (closed) fail("Parser is closed")
      if (buffer.length > 0 || body !== undefined || streamed !== undefined || stack.length > 0) {
        fail("Incomplete RESP reply at EOF")
      }
      closed = true
    }
  }
}
