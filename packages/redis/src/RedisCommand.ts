/**
 * Typed Redis commands, reply decoders, and Cluster key metadata.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Result from "effect/Result"
import * as Replies from "./internal/replies.ts"
import type { Endpoint } from "./RedisConnection.ts"
import { RedisError } from "./RedisError.ts"
import type * as Protocol from "./RedisProtocol.ts"

const decoder = new TextDecoder()

/**
 * Cluster key positions or an explicit destination for node-local commands.
 *
 * **Details**
 *
 * Indexes refer to the complete command vector, including the command at
 * index zero. An empty key list explicitly identifies a keyless command.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Routing {
  readonly keyIndexes?: ReadonlyArray<number> | undefined
  readonly node?: Endpoint | undefined
}

/**
 * Command arguments, routing metadata, and a checked reply decoder.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RedisCommand<A> {
  readonly arguments: ReadonlyArray<Protocol.Argument>
  readonly routing?: Routing | undefined
  readonly decode: (reply: Protocol.Reply) => Result.Result<A, RedisError>
}

/**
 * Creates a typed command using a checked decoder and optional routing.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = <A>(
  args: ReadonlyArray<Protocol.Argument>,
  decode: RedisCommand<A>["decode"],
  routing?: Routing
): RedisCommand<A> => ({ arguments: args, decode, routing })

/**
 * Decodes a textual or null Redis reply.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const text = (reply: Protocol.Reply): Result.Result<string | null, RedisError> => {
  if (reply._tag === "Attribute") return text(reply.value)
  if (reply._tag === "Null") return Result.succeed(null)
  if (reply._tag === "SimpleString") return Replies.text(reply.value)
  if (reply._tag === "BlobString" || reply._tag === "VerbatimString") {
    return Replies.text(decoder.decode(reply.value))
  }
  return Result.fail(new RedisError({ reason: "Decode", message: "Expected a Redis string or null" }))
}

/**
 * Decodes a binary or null Redis reply without text conversion.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const bytes = (reply: Protocol.Reply): Result.Result<Uint8Array | null, RedisError> => {
  if (reply._tag === "Attribute") return bytes(reply.value)
  if (reply._tag === "Null") return Result.succeed(null)
  if (reply._tag === "BlobString" || reply._tag === "VerbatimString") return Result.succeed(reply.value)
  return Result.fail(new RedisError({ reason: "Decode", message: "Expected Redis binary data or null" }))
}

/**
 * Decodes an integer without losing precision.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const integer = (reply: Protocol.Reply): Result.Result<bigint, RedisError> => {
  if (reply._tag === "Attribute") return integer(reply.value)
  return reply._tag === "Integer" || reply._tag === "BigNumber" ?
    Result.succeed(reply.value)
    : Result.fail(new RedisError({ reason: "Decode", message: "Expected a Redis integer" }))
}

/**
 * Creates a text GET command with its Cluster key position.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const get = (key: Protocol.Argument): RedisCommand<string | null> =>
  make(["GET", key], text, { keyIndexes: [1] })

/**
 * Creates a binary GET command with its Cluster key position.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const getBytes = (key: Protocol.Argument): RedisCommand<Uint8Array | null> =>
  make(["GET", key], bytes, { keyIndexes: [1] })

/**
 * Creates a SET command, accepting additional Redis SET options.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const set = (
  key: Protocol.Argument,
  value: Protocol.Argument,
  ...options: ReadonlyArray<Protocol.Argument>
): RedisCommand<string | null> => make(["SET", key, value, ...options], text, { keyIndexes: [1] })

/** @internal */
export const argumentText = (arg: Protocol.Argument | undefined): string =>
  typeof arg === "string" ? arg : arg === undefined ? "" : decoder.decode(arg)

const singleKey = new Set(
  ("GET SET SETNX SETEX PSETEX GETSET GETDEL GETEX APPEND STRLEN INCR INCRBY INCRBYFLOAT DECR DECRBY GETRANGE SETRANGE " +
    "HGET HSET HSETNX HMGET HMSET HGETALL HDEL HEXISTS HINCRBY HINCRBYFLOAT HKEYS HVALS HLEN HSCAN HRANDFIELD " +
    "LPUSH RPUSH LPUSHX RPUSHX LPOP RPOP LRANGE LLEN LINDEX LINSERT LREM LSET LTRIM LPOS " +
    "SADD SREM SMEMBERS SCARD SISMEMBER SMISMEMBER SPOP SRANDMEMBER SSCAN " +
    "ZADD ZREM ZREMRANGEBYRANK ZREMRANGEBYSCORE ZREMRANGEBYLEX ZCARD ZCOUNT ZLEXCOUNT ZINCRBY ZRANGE ZREVRANGE ZRANGEBYSCORE ZREVRANGEBYSCORE ZRANK ZREVRANK ZSCORE ZMSCORE ZSCAN ZPOPMIN ZPOPMAX " +
    "EXPIRE PEXPIRE EXPIREAT PEXPIREAT EXPIRETIME PEXPIRETIME TTL PTTL PERSIST TYPE DUMP RESTORE " +
    "XADD XLEN XRANGE XREVRANGE XDEL XTRIM XACK XPENDING XCLAIM XAUTOCLAIM SETBIT GETBIT BITCOUNT BITPOS GEOADD GEOPOS GEODIST GEOHASH GEOSEARCH")
    .split(" ")
)
const allKeys = new Set("MGET DEL UNLINK EXISTS TOUCH SDIFF SINTER SUNION WATCH".split(" "))
const keyless = new Set(
  "PING ECHO INFO TIME DBSIZE SCAN KEYS RANDOMKEY FLUSHDB FLUSHALL SCRIPT FUNCTION COMMAND CLIENT CONFIG CLUSTER PUBSUB PUBLISH ROLE SENTINEL SAVE BGSAVE LASTSAVE WAIT WAITAOF AUTH HELLO SELECT MULTI EXEC DISCARD UNWATCH READONLY READWRITE"
    .split(" ")
)

/** @internal */
export const parseStreams = (args: ReadonlyArray<Protocol.Argument>): {
  readonly keyIndexes: ReadonlyArray<number>
  readonly blocking: boolean
} | undefined => {
  const command = argumentText(args[0]).toUpperCase()
  if (command !== "XREAD" && command !== "XREADGROUP") return undefined
  const group = command === "XREADGROUP"
  let position = 1
  if (group) {
    if (argumentText(args[position]).toUpperCase() !== "GROUP" || args.length < 4) return undefined
    // Group and consumer names are opaque, even when named BLOCK or STREAMS.
    position += 3
  }
  let blocking = false
  while (position < args.length) {
    const option = argumentText(args[position]).toUpperCase()
    if (option === "STREAMS") {
      const start = position + 1
      const count = (args.length - start) / 2
      if (!Number.isInteger(count) || count < 1) return undefined
      return { keyIndexes: Array.from({ length: count }, (_, i) => start + i), blocking }
    }
    if (option === "COUNT" || option === "BLOCK" || (group && option === "CLAIM")) {
      if (position + 1 >= args.length) return undefined
      if (option === "BLOCK") blocking = true
      position += 2
    } else if (group && option === "NOACK") {
      position++
    } else {
      return undefined
    }
  }
  return undefined
}

/** @internal */
export const inferRouting = (args: ReadonlyArray<Protocol.Argument>): Routing | undefined => {
  const command = argumentText(args[0]).toUpperCase()
  if (singleKey.has(command)) return { keyIndexes: [1] }
  if (allKeys.has(command)) return { keyIndexes: args.slice(1).map((_, i) => i + 1) }
  if (command === "MSET" || command === "MSETNX") {
    return { keyIndexes: args.slice(1).flatMap((_, i) => i % 2 === 0 ? [i + 1] : []) }
  }
  if (
    command === "EVAL" || command === "EVALSHA" || command === "EVAL_RO" || command === "EVALSHA_RO" ||
    command === "FCALL" || command === "FCALL_RO"
  ) {
    const count = Number(argumentText(args[2]))
    if (!Number.isSafeInteger(count) || count < 0 || count > args.length - 3) return undefined
    return { keyIndexes: Array.from({ length: count }, (_, i) => i + 3) }
  }
  if (command === "XREAD" || command === "XREADGROUP") {
    const streams = parseStreams(args)
    return streams === undefined ? undefined : { keyIndexes: streams.keyIndexes }
  }
  if (command === "XGROUP" || command === "XINFO") return { keyIndexes: [2] }
  if (command === "BLPOP" || command === "BRPOP" || command === "BZPOPMIN" || command === "BZPOPMAX") {
    return { keyIndexes: args.slice(1, -1).map((_, i) => i + 1) }
  }
  if (
    command === "RENAME" || command === "RENAMENX" || command === "RPOPLPUSH" || command === "BRPOPLPUSH" ||
    command === "LMOVE" || command === "BLMOVE" || command === "SMOVE"
  ) return { keyIndexes: [1, 2] }
  if (command === "SPUBLISH" || command === "SSUBSCRIBE" || command === "SUNSUBSCRIBE") return { keyIndexes: [1] }
  if (keyless.has(command)) return { keyIndexes: [] }
  return undefined
}
