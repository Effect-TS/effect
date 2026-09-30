// Internal implementation.
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Semaphore from "effect/Semaphore"
import * as Command from "../RedisCommand.ts"
import * as Connection from "../RedisConnection.ts"
import { RedisError } from "../RedisError.ts"
import * as Protocol from "../RedisProtocol.ts"
import type { ClusterConfig, ClusterTopology, Redirect } from "./topology.ts"
import { endpointKey } from "./transport.ts"

const encoder = new TextEncoder()
const slotCount = 16384
const crc16Table = Uint16Array.from({ length: 256 }, (_, value) => {
  let crc = value << 8
  for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff
  return crc
})

const routingError = (message: string, cause?: unknown): RedisError =>
  new RedisError({ reason: "Routing", message, cause, outcome: "NotSent" })

export const crc16 = (bytes: Uint8Array): number => {
  let crc = 0
  for (const byte of bytes) {
    crc = ((crc << 8) ^ crc16Table[((crc >> 8) ^ byte) & 0xff]) & 0xffff
  }
  return crc
}

export const keySlot = (key: Protocol.Argument): number => {
  const bytes = typeof key === "string" ? encoder.encode(key) : key
  const start = bytes.indexOf(123)
  if (start !== -1) {
    const end = bytes.indexOf(125, start + 1)
    if (end > start + 1) return crc16(bytes.subarray(start + 1, end)) % slotCount
  }
  return crc16(bytes) % slotCount
}

interface Discovery {
  readonly owners: ReadonlyArray<Connection.Endpoint>
  readonly primaries: ReadonlyArray<Connection.Endpoint>
}

const array = (value: unknown, label: string): ReadonlyArray<unknown> => {
  if (!Array.isArray(value)) throw routingError(`Invalid Cluster ${label}`)
  return value
}

const record = (value: unknown): ReadonlyMap<unknown, unknown> => {
  if (value instanceof Map) return value
  const fields = array(value, "record")
  if (fields.length % 2 !== 0) throw routingError("Invalid Cluster field pairs")
  const result = new Map<unknown, unknown>()
  for (let i = 0; i < fields.length; i += 2) result.set(fields[i], fields[i + 1])
  return result
}

const validNumber = (value: unknown, minimum: number, maximum: number, label: string): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw routingError(`Invalid Cluster ${label}`)
  }
  return value
}

const validAddress = (endpoint: Connection.Endpoint): Connection.Endpoint => {
  if (typeof endpoint.host !== "string" || endpoint.host.length === 0 || /\s/.test(endpoint.host)) {
    throw routingError("Invalid Cluster host")
  }
  validNumber(endpoint.port, 1, 65535, "port")
  return endpoint
}

const address = (
  host: unknown,
  port: unknown,
  seed: Connection.Endpoint,
  config: ClusterConfig
): Connection.Endpoint => {
  // Empty/null advertised endpoints explicitly mean the discovery connection's host.
  if (host === "" || host === null || host === undefined || host === "?") host = seed.host
  if (typeof host !== "string") throw routingError("Invalid Cluster advertised endpoint")
  const normalizedHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host
  const endpoint = validAddress({ host: normalizedHost, port: validNumber(port, 1, 65535, "port"), tls: seed.tls })
  return config.mapAddress === undefined ? endpoint : validAddress(config.mapAddress(endpoint))
}

const discoveryBuilder = () => {
  const owners: Array<Connection.Endpoint | undefined> = Array.from({ length: slotCount })
  const primaries = new Map<string, Connection.Endpoint>()
  return {
    range(start: unknown, end: unknown, endpoint: Connection.Endpoint): void {
      const first = validNumber(start, 0, slotCount - 1, "slot start")
      const last = validNumber(end, first, slotCount - 1, "slot end")
      primaries.set(endpointKey(endpoint), endpoint)
      for (let slot = first; slot <= last; slot++) {
        if (owners[slot] !== undefined) throw routingError("Cluster topology contains overlapping slot ranges")
        owners[slot] = endpoint
      }
    },
    finish(): Discovery {
      if (owners.some((owner) => owner === undefined)) {
        throw routingError("Cluster topology does not cover every hash slot")
      }
      return { owners: owners as Array<Connection.Endpoint>, primaries: Array.from(primaries.values()) }
    }
  }
}

export const parseSlots = (reply: Protocol.Reply, seed: Connection.Endpoint, config: ClusterConfig): Discovery => {
  const builder = discoveryBuilder()
  for (const value of array(Protocol.toValue(reply), "SLOTS reply")) {
    const row = array(value, "SLOTS range")
    if (row.length < 3) throw routingError("Invalid Cluster SLOTS range")
    const primary = array(row[2], "SLOTS primary")
    if (primary.length < 2) throw routingError("Invalid Cluster SLOTS primary")
    builder.range(row[0], row[1], address(primary[0], primary[1], seed, config))
  }
  return builder.finish()
}

export const parseShards = (reply: Protocol.Reply, seed: Connection.Endpoint, config: ClusterConfig): Discovery => {
  const builder = discoveryBuilder()
  for (const value of array(Protocol.toValue(reply), "SHARDS reply")) {
    const shard = record(value)
    const nodes = array(shard.get("nodes"), "SHARDS nodes").map(record)
    const primary = nodes.find((node) => node.get("role") === "master" && node.get("health") === "online")
    if (primary === undefined) throw routingError("Cluster shard has no online primary")
    const host = [primary.get("endpoint"), primary.get("hostname"), primary.get("ip")]
      .find((value) => typeof value === "string" && value !== "" && value !== "?")
    const port = seed.tls ? primary.get("tls-port") ?? primary.get("port") : primary.get("port")
    const endpoint = address(host, port, seed, config)
    const slots = array(shard.get("slots"), "SHARDS slots")
    if (slots.length % 2 !== 0) throw routingError("Invalid Cluster SHARDS slot pairs")
    for (let i = 0; i < slots.length; i += 2) builder.range(slots[i], slots[i + 1], endpoint)
  }
  return builder.finish()
}

const decodeFailure = (cause: unknown): RedisError =>
  cause instanceof RedisError
    ? cause
    : routingError("Cluster topology decoding or address mapping failed", cause)

export const make = Effect.fnUntraced(function*(
  connector: Connection.Connector,
  config: ClusterConfig,
  dataConfig: Connection.Config = {}
) {
  if (config.seeds.length === 0) return yield* Effect.fail(routingError("Cluster requires at least one seed"))
  if (config.maxRedirects !== undefined && (!Number.isSafeInteger(config.maxRedirects) || config.maxRedirects < 0)) {
    return yield* Effect.fail(routingError("Cluster redirect limit must be a nonnegative safe integer"))
  }
  if (dataConfig.database !== undefined && dataConfig.database !== 0) {
    return yield* Effect.fail(routingError("Redis Cluster supports only database zero"))
  }
  const lock = Semaphore.makeUnsafe(1)
  let owners: ReadonlyArray<Connection.Endpoint> = []
  let primaries: ReadonlyArray<Connection.Endpoint> = []
  const refresh = lock.withPermit(Effect.gen(function*() {
    const candidates = new Map<string, Connection.Endpoint>()
    for (const endpoint of [...primaries, ...config.seeds]) candidates.set(endpointKey(endpoint), endpoint)
    const failures: Array<RedisError> = []
    for (const seed of candidates.values()) {
      const result = yield* Effect.result(Effect.scoped(Effect.gen(function*() {
        const connection = yield* Connection.make(connector, seed, {
          ...dataConfig,
          commandTimeout: dataConfig.commandTimeout ?? "10 seconds"
        })
        const discovery = yield* connection.execute(["CLUSTER", "SHARDS"]).pipe(
          Effect.flatMap((reply) => Effect.try({ try: () => parseShards(reply, seed, config), catch: decodeFailure })),
          Effect.catch((error) => {
            if (error.reason !== "Server" || !/unknown (?:sub)?command|unsupported/i.test(error.message)) {
              return Effect.fail(error)
            }
            return connection.execute(["CLUSTER", "SLOTS"]).pipe(
              Effect.flatMap((reply) =>
                Effect.try({ try: () => parseSlots(reply, seed, config), catch: decodeFailure })
              )
            )
          })
        )
        return discovery
      })))
      if (result._tag === "Success") {
        owners = result.success.owners
        primaries = result.success.primaries
        return
      }
      failures.push(result.failure)
    }
    return yield* Effect.fail(routingError("No Cluster seed returned a valid topology", failures))
  }))
  yield* refresh
  const resolveSync: ClusterTopology["resolveSync"] = (args, routing) => {
    try {
      if (args.length === 0) throw routingError("Redis commands cannot be empty")
      const indexes = routing?.keyIndexes ?? Command.inferRouting(args)?.keyIndexes
      if (indexes === undefined && routing?.node === undefined) {
        throw routingError("Cluster commands with unknown key positions require explicit routing metadata")
      }
      let slot: number | undefined
      for (const index of indexes ?? []) {
        if (!Number.isSafeInteger(index) || index < 1 || index >= args.length) {
          throw routingError("Cluster key index is outside the command arguments")
        }
        const current = keySlot(args[index])
        if (slot !== undefined && current !== slot) {
          throw new RedisError({
            reason: "Routing",
            code: "CROSSSLOT",
            message: "CROSSSLOT Keys in request do not hash to the same slot",
            outcome: "NotSent"
          })
        }
        slot = current
      }
      const owner = slot === undefined ? primaries[0] : owners[slot]
      if (owner === undefined) throw routingError("Cluster has no primary for this hash slot")
      if (slot !== undefined && routing?.node !== undefined && endpointKey(routing.node) !== endpointKey(owner)) {
        throw routingError("Explicit Cluster destination conflicts with key slot ownership")
      }
      return Result.succeed({ endpoint: routing?.node ?? owner, slot })
    } catch (cause) {
      return Result.fail(decodeFailure(cause))
    }
  }
  const topology: ClusterTopology = {
    _tag: "Cluster",
    resolveSync,
    resolve: (args, routing) => Effect.suspend(() => Effect.fromResult(resolveSync(args, routing))),
    refresh,
    endpoints: () => primaries,
    redirect: (error, from): Redirect | undefined => {
      if (error.reason !== "Server") return undefined
      const match = /^(MOVED|ASK) (\d+) (\S+)$/.exec(error.message)
      if (match === null) return undefined
      const slot = Number(match[2])
      const separator = match[3].lastIndexOf(":")
      if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount || separator === -1) return undefined
      const portText = match[3].slice(separator + 1)
      if (!/^\d+$/.test(portText)) return undefined
      try {
        const endpoint = address(match[3].slice(0, separator), Number(portText), from, config)
        const asking = match[1] === "ASK"
        if (!asking && (owners[slot] === undefined || endpointKey(owners[slot]) !== endpointKey(endpoint))) {
          const next = [...owners]
          next[slot] = endpoint
          owners = next
          const distinct = new Map<string, Connection.Endpoint>()
          for (const primary of owners) distinct.set(endpointKey(primary), primary)
          primaries = Array.from(distinct.values())
        }
        return { endpoint, slot, asking }
      } catch {
        return undefined
      }
    }
  }
  return topology
})
