import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Connection from "../RedisConnection.ts"
import type { RedisError } from "../RedisError.ts"
import * as Protocol from "../RedisProtocol.ts"
import { type SentinelConfig, type Topology, validEndpoint } from "./topology.ts"
import { durationMillis, type Endpoint, endpointKey, notSent } from "./transport.ts"

const invalid = (message: string, cause?: unknown) => notSent("Routing", message, cause)

const primaryAddress = (reply: Protocol.Reply, config: SentinelConfig): Endpoint => {
  const value = Protocol.toValue(reply)
  const [host, port] = Array.isArray(value) && value.length === 2 ? value : []
  if (typeof host !== "string" || typeof port !== "string" || !/^\d+$/.test(port)) {
    throw invalid("Sentinel returned no valid primary address")
  }
  const endpoint = { host, port: Number(port), tls: config.dataTls }
  const mapped = config.mapAddress === undefined ? endpoint : config.mapAddress(endpoint)
  if (!validEndpoint(mapped)) throw invalid("Sentinel returned an invalid primary address")
  return mapped
}

/**
 * Discovers the primary through Sentinel, verifies its role, and polls for
 * promotions while its scope is open.
 */
export const make = Effect.fnUntraced(function*(
  connector: Connection.Connector,
  config: SentinelConfig,
  connectionConfig: Connection.Config = {}
) {
  if (config.sentinels.length === 0 || config.masterName.length === 0) {
    return yield* Effect.fail(invalid("Sentinel requires discovery endpoints and a primary name"))
  }
  const interval = durationMillis(config.refreshInterval ?? "5 seconds")
  if (interval === undefined || !Number.isFinite(interval) || interval <= 0) {
    return yield* Effect.fail(invalid("Sentinel refresh interval must be finite and positive"))
  }
  const timeout = connectionConfig.commandTimeout ?? "5 seconds"
  // Sentinels have their own credentials; only the limits are shared.
  const sentinelConfig: Connection.Config = {
    username: config.username,
    password: config.password,
    protocol: connectionConfig.protocol,
    commandTimeout: timeout,
    maxFrameSize: connectionConfig.maxFrameSize,
    maxDepth: connectionConfig.maxDepth,
    maxAggregateLength: connectionConfig.maxAggregateLength
  }

  const listeners = new Set<() => void>()
  let current: Endpoint | undefined
  let preferred = 0

  const discover = (sentinel: Endpoint) =>
    Effect.scoped(Effect.gen(function*() {
      const discovery = yield* Connection.make(connector, sentinel, sentinelConfig)
      const reply = yield* discovery.execute(["SENTINEL", "GET-MASTER-ADDR-BY-NAME", config.masterName])
      const candidate = yield* Effect.try({
        try: () => primaryAddress(reply, config),
        catch: (cause) => cause as RedisError
      })
      // Sentinels can briefly report a demoted primary; trust only ROLE.
      const primary = yield* Connection.make(connector, candidate, { ...connectionConfig, commandTimeout: timeout })
      const role = Protocol.toValue(yield* primary.execute(["ROLE"]))
      if (!Array.isArray(role) || role[0] !== "master") {
        return yield* Effect.fail(invalid("Sentinel candidate is not a primary"))
      }
      return candidate
    })).pipe(
      Effect.timeoutOrElse({
        duration: timeout,
        orElse: () => Effect.fail(notSent("Timeout", "Sentinel discovery timed out"))
      })
    )

  const refresh = Semaphore.makeUnsafe(1).withPermit(Effect.gen(function*() {
    const failures: Array<RedisError> = []
    for (let attempt = 0; attempt < config.sentinels.length; attempt++) {
      const index = (preferred + attempt) % config.sentinels.length
      const result = yield* Effect.result(discover(config.sentinels[index]))
      if (result._tag === "Failure") {
        failures.push(result.failure)
        continue
      }
      const changed = current !== undefined && endpointKey(current) !== endpointKey(result.success)
      current = result.success
      preferred = index
      if (changed) { for (const listener of listeners) listener() }
      return
    }
    return yield* Effect.fail(invalid("No Sentinel reported a verified primary", failures))
  }))

  yield* refresh
  yield* Scope.addFinalizer(yield* Effect.scope, Effect.sync(() => listeners.clear()))
  yield* Effect.sleep(interval).pipe(
    Effect.andThen(Effect.ignore(refresh)),
    Effect.forever,
    Effect.forkScoped
  )

  const route: Topology["route"] = (_args, routing) => Result.succeed({ endpoint: routing?.node ?? current! })
  return {
    _tag: "Sentinel",
    route,
    resolve: (args, routing) => Effect.sync(() => Result.getOrThrow(route(args, routing))),
    refresh,
    endpoints: () => [current!],
    redirect: () => undefined,
    onChange: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  } satisfies Topology as Topology
})
