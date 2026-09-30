// Internal implementation.
import { RedisError } from "../RedisError.ts"
import type { Parser, ParserOptions, Reply } from "../RedisProtocol.ts"
import * as Replies from "./replies.ts"

const decoder = new TextDecoder()
const minInteger = BigInt("-9223372036854775808")
const maxInteger = BigInt("9223372036854775807")

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

export const makeParser = (options: ParserOptions, ownership: "copy" | "transfer"): Parser => {
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
  const emptyBody = new Uint8Array(0)
  let body: Uint8Array = emptyBody
  let bodySize = 0
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
  const integerLine = (): bigint => {
    let offset = line[0] === 43 || line[0] === 45 ? 1 : 0
    if (offset === line.length) fail("Invalid RESP integer")
    let value = 0
    for (; offset < line.length; offset++) {
      const byte = line[offset]
      if (byte > 127) fail("Non-ASCII RESP header")
      if (byte < 48 || byte > 57) fail("Invalid RESP integer")
      value = value * 10 + (byte - 48)
    }
    if (Number.isSafeInteger(value)) return BigInt(line[0] === 45 ? -value : value)
    let text = ""
    for (const byte of line) text += String.fromCharCode(byte)
    return BigInt(text)
  }
  const length = (value: string): number => {
    if (!/^\d+$/.test(value)) fail("Invalid RESP length")
    const result = Number(value)
    if (!Number.isSafeInteger(result)) fail("RESP length exceeds safe integer range")
    return result
  }
  const startBody = (size: number): void => {
    if (size + frameSize + 2 > maxFrameSize) fail("Frame size limit exceeded")
    bodySize = size
    if (size === 0) body = emptyBody
    bodyOffset = 0
    state = size === 0 ? "bodyCr" : "body"
  }
  const completeLine = (output: Array<Reply>): void => {
    if (marker === ":") {
      const parsed = integerLine()
      if (parsed < minInteger || parsed > maxInteger) fail("RESP integer exceeds signed 64-bit range")
      line = []
      state = "marker"
      accept({ _tag: "Integer", value: parsed }, output)
      return
    }
    if (marker === "+") {
      const reply = Replies.simpleString(line)
      if (reply !== undefined) {
        line = []
        state = "marker"
        accept(reply, output)
        return
      }
    }
    let value = ""
    const text = marker === "+" || marker === "-"
    if (text && line.length > 64) value = decoder.decode(new Uint8Array(line))
    else {
      // Short ASCII acknowledgements and numeric headers need neither a byte
      // allocation nor UTF-8 decoding. Text still permits arbitrary UTF-8.
      for (let index = 0; index < line.length; index++) {
        const byte = line[index]
        if (byte > 127) {
          if (!text) fail("Non-ASCII RESP header")
          value = decoder.decode(new Uint8Array(line))
          break
        }
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
        accept({ _tag: "VerbatimString", format: decoder.decode(body.subarray(0, 3)), value: body.subarray(4) }, output)
        return
      default:
        accept({ _tag: "BlobString", value: body }, output)
    }
  }
  return {
    push(chunk) {
      if (closed) fail("Parser is closed")
      const output: Array<Reply> = []
      let ownedChunk: Uint8Array<ArrayBuffer> | undefined
      let ownedStart = 0
      let ownedEnd = 0
      for (let offset = 0; offset < chunk.length;) {
        if (state === "body") {
          if (bodyOffset === 0) {
            if (bodySize <= chunk.length - offset) {
              if (frameSize + bodySize > maxFrameSize) fail("Frame size limit exceeded")
              if (ownership === "transfer") {
                // Transport producers surrender this byte range permanently.
                // Disjoint complete bodies can retain it without another copy.
                body = chunk.subarray(offset, offset + bodySize)
              } else {
                // Share bounded owned snapshots through disjoint body views.
                // A tiny frame never forces a copy of an arbitrary input tail.
                if (ownedChunk === undefined || offset + bodySize > ownedEnd) {
                  ownedStart = offset
                  ownedEnd = Math.min(chunk.length, offset + Math.max(bodySize, Math.min(64 * 1024, maxFrameSize)))
                  ownedChunk = new Uint8Array(chunk.subarray(ownedStart, ownedEnd))
                }
                body = ownedChunk.subarray(offset - ownedStart, offset - ownedStart + bodySize)
              }
              bodyOffset = bodySize
              frameSize += bodySize
              offset += bodySize
              state = "bodyCr"
              continue
            }
            body = new Uint8Array(bodySize)
          }
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
            body = emptyBody
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
