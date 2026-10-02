import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Semaphore from "effect/Semaphore"
import * as Command from "../RedisCommand.ts"
import * as Connection from "../RedisConnection.ts"
import { RedisError } from "../RedisError.ts"
import * as Protocol from "../RedisProtocol.ts"
import { type ClusterConfig, type Resolved, type Topology, validEndpoint } from "./topology.ts"
import { type Endpoint, endpointKey, notSent } from "./transport.ts"

const slotCount = 16384
const encoder = new TextEncoder()

const crc16Table = Uint16Array.from({ length: 256 }, (_, value) => {
  let crc = value << 8
  for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
  return crc
})

/** CRC16/XMODEM, as used by Redis Cluster key hashing. */
export const crc16 = (bytes: Uint8Array): number => {
  let crc = 0
  for (const byte of bytes) crc = ((crc << 8) ^ crc16Table[((crc >> 8) ^ byte) & 0xff]) & 0xffff
  return crc
}

/** Computes a key's hash slot, honouring the first non-empty `{hash tag}`. */
export const keySlot = (key: Protocol.Argument): number => {
  const bytes = typeof key === "string" ? encoder.encode(key) : key
  const open = bytes.indexOf(123)
  if (open !== -1) {
    const close = bytes.indexOf(125, open + 1)
    if (close > open + 1) return crc16(bytes.subarray(open + 1, close)) % slotCount
  }
  return crc16(bytes) % slotCount
}

const invalid = (message: string, cause?: unknown) => notSent("Routing", message, cause)

interface Discovery {
  readonly owners: ReadonlyArray<Endpoint>
  readonly primaries: ReadonlyArray<Endpoint>
}

const list = (value: unknown, label: string): ReadonlyArray<unknown> => {
  if (!Array.isArray(value)) throw invalid(`Invalid Cluster ${label}`)
  return value
}

// RESP3 returns maps; RESP2 returns flat field/value arrays.
const record = (value: unknown): ReadonlyMap<unknown, unknown> => {
  if (value instanceof Map) return value
  const fields = list(value, "record")
  const result = new Map<unknown, unknown>()
  for (let i = 0; i + 1 < fields.length; i += 2) result.set(fields[i], fields[i + 1])
  return result
}

const slotNumber = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value >= slotCount) {
    throw invalid("Invalid Cluster slot")
  }
  return value
}

const address = (host: unknown, port: unknown, seed: Endpoint, config: ClusterConfig): Endpoint => {
  // An empty or unknown advertised host means "the host you reached me on".
  const advertised = host === "" || host === "?" || host === null || host === undefined ? seed.host : host
  if (typeof advertised !== "string" || typeof port !== "number") throw invalid("Invalid Cluster node address")
  const endpoint = { host: advertised.replace(/^\[(.*)\]$/, "$1"), port, tls: seed.tls }
  const mapped = config.mapAddress === undefined ? endpoint : config.mapAddress(endpoint)
  if (!validEndpoint(mapped)) throw invalid("Invalid Cluster node address")
  return mapped
}

const discovery = (ranges: ReadonlyArray<readonly [start: unknown, end: unknown, owner: Endpoint]>): Discovery => {
  const owners = new Array<Endpoint | undefined>(slotCount)
  const primaries = new Map<string, Endpoint>()
  for (const [start, end, owner] of ranges) {
    const first = slotNumber(start)
    const last = slotNumber(end)
    primaries.set(endpointKey(owner), owner)
    for (let slot = first; slot <= last; slot++) {
      if (owners[slot] !== undefined) throw invalid("Cluster topology contains overlapping slot ranges")
      owners[slot] = owner
    }
  }
  for (let slot = 0; slot < slotCount; slot++) {
    if (owners[slot] === undefined) throw invalid("Cluster topology does not cover every hash slot")
  }
  return { owners: owners as Array<Endpoint>, primaries: Array.from(primaries.values()) }
}

/** Parses a `CLUSTER SLOTS` reply. */
export const parseSlots = (reply: Protocol.Reply, seed: Endpoint, config: ClusterConfig): Discovery =>
  discovery(
    list(Protocol.toValue(reply), "SLOTS reply").map((value) => {
      const [start, end, primary] = list(value, "SLOTS range")
      const [host, port] = list(primary, "SLOTS primary")
      return [start, end, address(host, port, seed, config)] as const
    })
  )

/** Parses a `CLUSTER SHARDS` reply, using each shard's online primary. */
export const parseShards = (reply: Protocol.Reply, seed: Endpoint, config: ClusterConfig): Discovery =>
  discovery(
    list(Protocol.toValue(reply), "SHARDS reply").flatMap((value) => {
      const shard = record(value)
      const primary = list(shard.get("nodes"), "SHARDS nodes").map(record)
        .find((node) => node.get("role") === "master" && node.get("health") === "online")
      if (primary === undefined) throw invalid("Cluster shard has no online primary")
      const host = ["endpoint", "hostname", "ip"].map((field) => primary.get(field))
        .find((value) => typeof value === "string" && value !== "" && value !== "?")
      const port = seed.tls ? primary.get("tls-port") ?? primary.get("port") : primary.get("port")
      const owner = address(host, port, seed, config)
      const slots = list(shard.get("slots"), "SHARDS slots")
      const ranges: Array<readonly [unknown, unknown, Endpoint]> = []
      for (let i = 0; i + 1 < slots.length; i += 2) ranges.push([slots[i], slots[i + 1], owner])
      return ranges
    })
  )

const asRedisError = (cause: unknown) =>
  cause instanceof RedisError ? cause : invalid("Cluster topology decoding failed", cause)

const redirectPattern = /^(MOVED|ASK) (\d+) (\S*):(\d+)$/

export interface Redirect extends Resolved {
  readonly slot: number
  readonly asking: boolean
}

/** Interprets a MOVED or ASK error returned by `from`. */
export const parseRedirect = (error: RedisError, from: Endpoint, config: ClusterConfig): Redirect | undefined => {
  const match = error.reason === "Server" ? redirectPattern.exec(error.message) : null
  if (match === null) return undefined
  const slot = Number(match[2])
  if (slot >= slotCount) return undefined
  try {
    return { endpoint: address(match[3], Number(match[4]), from, config), slot, asking: match[1] === "ASK" }
  } catch {
    return undefined
  }
}

export const redirectLimit = (error: RedisError): RedisError =>
  new RedisError({
    reason: "Routing",
    message: "Redis Cluster redirect limit exceeded",
    cause: error,
    code: error.code
  })

/**
 * Discovers slot ownership from the seeds and routes commands by key slot.
 */
export const make = Effect.fnUntraced(function*(
  connector: Connection.Connector,
  config: ClusterConfig,
  connectionConfig: Connection.Config = {}
) {
  if (config.seeds.length === 0) return yield* Effect.fail(invalid("Cluster requires at least one seed"))
  if (config.maxRedirects !== undefined && (!Number.isSafeInteger(config.maxRedirects) || config.maxRedirects < 0)) {
    return yield* Effect.fail(invalid("Cluster redirect limit must be a non-negative integer"))
  }
  if ((connectionConfig.database ?? 0) !== 0) {
    return yield* Effect.fail(invalid("Redis Cluster supports only database zero"))
  }

  let owners: ReadonlyArray<Endpoint> = []
  let primaries: ReadonlyArray<Endpoint> = []

  const discover = (seed: Endpoint) =>
    Effect.scoped(Effect.gen(function*() {
      const connection = yield* Connection.make(connector, seed, {
        ...connectionConfig,
        commandTimeout: connectionConfig.commandTimeout ?? "10 seconds"
      })
      const parse = (parser: typeof parseSlots) => (reply: Protocol.Reply) =>
        Effect.try({ try: () => parser(reply, seed, config), catch: asRedisError })
      return yield* connection.execute(["CLUSTER", "SHARDS"]).pipe(
        Effect.flatMap(parse(parseShards)),
        // Redis before 7.0 has no CLUSTER SHARDS.
        Effect.catchIf(
          (error) => error.reason === "Server" && /unknown (sub)?command/i.test(error.message),
          () => connection.execute(["CLUSTER", "SLOTS"]).pipe(Effect.flatMap(parse(parseSlots)))
        )
      )
    }))

  const refresh = Semaphore.makeUnsafe(1).withPermit(Effect.gen(function*() {
    const candidates = new Map<string, Endpoint>()
    for (const endpoint of [...primaries, ...config.seeds]) candidates.set(endpointKey(endpoint), endpoint)
    const failures: Array<RedisError> = []
    for (const seed of candidates.values()) {
      const result = yield* Effect.result(discover(seed))
      if (result._tag === "Success") {
        owners = result.success.owners
        primaries = result.success.primaries
        return
      }
      failures.push(result.failure)
    }
    return yield* Effect.fail(invalid("No Cluster seed returned a valid topology", failures))
  }))
  yield* refresh

  const route: Topology["route"] = (args, routing) => {
    const keyIndexes = routing?.keyIndexes ?? Command.inferRouting(args)?.keyIndexes
    if (keyIndexes === undefined && routing?.node === undefined) {
      return Result.fail(invalid("Cluster commands with unknown key positions require explicit routing"))
    }
    let slot: number | undefined
    for (const index of keyIndexes ?? []) {
      if (!Number.isSafeInteger(index) || index < 1 || index >= args.length) {
        return Result.fail(invalid("Cluster key index is outside the command arguments"))
      }
      const current = keySlot(args[index])
      if (slot !== undefined && current !== slot) {
        return Result.fail(
          new RedisError({
            reason: "Routing",
            code: "CROSSSLOT",
            message: "CROSSSLOT Keys in request do not hash to the same slot",
            outcome: "NotSent"
          })
        )
      }
      slot = current
    }
    const owner = slot === undefined ? primaries[0] : owners[slot]
    if (routing?.node !== undefined && slot !== undefined && endpointKey(routing.node) !== endpointKey(owner)) {
      return Result.fail(invalid("Explicit Cluster node does not own the key slot"))
    }
    return Result.succeed({ endpoint: routing?.node ?? owner, slot })
  }

  const redirect = (error: RedisError, from: Endpoint): Redirect | undefined => {
    const redirect = parseRedirect(error, from, config)
    if (
      redirect !== undefined && !redirect.asking &&
      endpointKey(owners[redirect.slot]) !== endpointKey(redirect.endpoint)
    ) {
      const next = owners.slice()
      next[redirect.slot] = redirect.endpoint
      owners = next
      primaries = Array.from(new Map(owners.map((owner) => [endpointKey(owner), owner])).values())
    }
    return redirect
  }

  return {
    _tag: "Cluster",
    route,
    resolve: (args, routing) => Effect.suspend(() => Effect.fromResult(route(args, routing))),
    refresh,
    endpoints: () => primaries,
    redirect,
    onChange: () => () => {}
  } satisfies Topology as Topology
})
