// Internal implementation.
import * as Result from "effect/Result"
import type { Reply } from "../RedisProtocol.ts"

const ok = Object.freeze({ _tag: "SimpleString" as const, value: "OK" })
const queued = Object.freeze({ _tag: "SimpleString" as const, value: "QUEUED" })
const pong = Object.freeze({ _tag: "SimpleString" as const, value: "PONG" })
const okReply = Object.freeze(Result.succeed(ok))
const queuedReply = Object.freeze(Result.succeed(queued))
const pongReply = Object.freeze(Result.succeed(pong))
const okText = Object.freeze(Result.succeed("OK"))
const queuedText = Object.freeze(Result.succeed("QUEUED"))
const pongText = Object.freeze(Result.succeed("PONG"))

// Avoid allocating a string and reply object for the common exact ASCII
// acknowledgements. Frozen constants cannot contaminate later responses.
export const simpleString = (line: ReadonlyArray<number>): Reply | undefined => {
  switch (line.length) {
    case 2:
      return line[0] === 79 && line[1] === 75 ? ok : undefined
    case 4:
      return line[0] === 80 && line[1] === 79 && line[2] === 78 && line[3] === 71 ? pong : undefined
    case 6:
      return line[0] === 81 && line[1] === 85 && line[2] === 69 && line[3] === 85 && line[4] === 69 && line[5] === 68
        ? queued
        : undefined
  }
}

// Match only complete exact acknowledgements, including their CRLF. Partial
// or longer strings stay on the ordinary line parser without retaining a view.
export const simpleStringFrame = (
  bytes: Uint8Array,
  offset: number
): Extract<Reply, { readonly _tag: "SimpleString" }> | undefined => {
  switch (bytes[offset + 1]) {
    case 79:
      return bytes[offset + 2] === 75 && bytes[offset + 3] === 13 && bytes[offset + 4] === 10 ? ok : undefined
    case 80:
      return bytes[offset + 2] === 79 && bytes[offset + 3] === 78 && bytes[offset + 4] === 71 &&
          bytes[offset + 5] === 13 && bytes[offset + 6] === 10
        ? pong
        : undefined
    case 81:
      return bytes[offset + 2] === 85 && bytes[offset + 3] === 69 && bytes[offset + 4] === 85 &&
          bytes[offset + 5] === 69 && bytes[offset + 6] === 68 && bytes[offset + 7] === 13 && bytes[offset + 8] === 10
        ? queued
        : undefined
  }
}

export const succeed = (reply: Reply): Result.Result<Reply> =>
  reply === ok ? okReply : reply === queued ? queuedReply : reply === pong ? pongReply : Result.succeed(reply)

export const text = (value: string): Result.Result<string> => {
  switch (value) {
    case "OK":
      return okText
    case "QUEUED":
      return queuedText
    case "PONG":
      return pongText
    default:
      return Result.succeed(value)
  }
}
