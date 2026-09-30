// Internal implementation.
import * as Result from "effect/Result"
import type { Reply } from "../RedisProtocol.ts"

const ok: Reply = Object.freeze({ _tag: "SimpleString", value: "OK" })
const queued: Reply = Object.freeze({ _tag: "SimpleString", value: "QUEUED" })
const pong: Reply = Object.freeze({ _tag: "SimpleString", value: "PONG" })
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
