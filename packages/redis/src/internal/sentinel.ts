// Internal implementation.
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Connection from "../RedisConnection.ts"
import { RedisError } from "../RedisError.ts"
import type * as Protocol from "../RedisProtocol.ts"
import type { SentinelConfig, Topology } from "./topology.ts"
import { endpointKey } from "./transport.ts"

const text = (reply: Protocol.Reply): string | undefined =>
  reply._tag === "SimpleString"
    ? reply.value
    : reply._tag === "BlobString"
    ? new TextDecoder().decode(reply.value)
    : undefined

const address = (reply: Protocol.Reply, config: SentinelConfig): Connection.Endpoint => {
  if (reply._tag !== "Array" || reply.values.length !== 2) {
    throw new RedisError({
      reason: "Routing",
      message: "Sentinel returned no valid primary address",
      outcome: "NotSent"
    })
  }
  const host = text(reply.values[0])
  const portText = text(reply.values[1])
  const port = portText === undefined ? NaN : Number(portText)
  if (
    host === undefined || host.length === 0 || /\s/.test(host) || portText === undefined || !/^\d+$/.test(portText) ||
    !Number.isSafeInteger(port) || port < 1 || port > 65535
  ) {
    throw new RedisError({
      reason: "Routing",
      message: "Sentinel returned an invalid primary host or port",
      outcome: "NotSent"
    })
  }
  const endpoint = { host, port, tls: config.dataTls }
  const mapped = config.mapAddress === undefined ? endpoint : config.mapAddress(endpoint)
  if (
    typeof mapped.host !== "string" || mapped.host.length === 0 || /\s/.test(mapped.host) ||
    !Number.isSafeInteger(mapped.port) || mapped.port < 1 || mapped.port > 65535
  ) {
    throw new RedisError({
      reason: "Routing",
      message: "Sentinel address mapping returned an invalid primary host or port",
      outcome: "NotSent"
    })
  }
  return mapped
}

export const make = Effect.fnUntraced(
  function*(connector: Connection.Connector, config: SentinelConfig, dataConfig: Connection.Config = {}) {
    if (config.sentinels.length === 0 || config.masterName.length === 0) {
      return yield* Effect.fail(
        new RedisError({
          reason: "Routing",
          message: "Sentinel requires discovery endpoints and a primary service name",
          outcome: "NotSent"
        })
      )
    }
    const lock = Semaphore.makeUnsafe(1)
    const interval = yield* Effect.try({
      try: () => Duration.toMillis(Duration.fromInputUnsafe(config.refreshInterval ?? "5 seconds")),
      catch: (cause) =>
        new RedisError({ reason: "Routing", message: "Invalid Sentinel refresh interval", cause, outcome: "NotSent" })
    })
    if (!Number.isFinite(interval) || interval <= 0) {
      return yield* Effect.fail(
        new RedisError({
          reason: "Routing",
          message: "Sentinel refresh interval must be finite and positive",
          outcome: "NotSent"
        })
      )
    }
    const listeners = new Set<() => void>()
    yield* Scope.addFinalizer(yield* Effect.scope, Effect.sync(() => listeners.clear()))
    let current: Connection.Endpoint | undefined
    let preferred = 0
    const refresh = lock.withPermit(Effect.gen(function*() {
      const failures: Array<RedisError> = []
      for (let attempt = 0; attempt < config.sentinels.length; attempt++) {
        const index = (preferred + attempt) % config.sentinels.length
        const seed = config.sentinels[index]
        const result = yield* Effect.result(
          Effect.scoped(Effect.gen(function*() {
            const discovery = yield* Connection.make(connector, seed, {
              username: config.username,
              password: config.password,
              protocol: dataConfig.protocol,
              commandTimeout: dataConfig.commandTimeout,
              maxPendingCommands: dataConfig.maxPendingCommands,
              maxQueuedBytes: dataConfig.maxQueuedBytes,
              maxFrameSize: dataConfig.maxFrameSize,
              maxDepth: dataConfig.maxDepth,
              maxAggregateLength: dataConfig.maxAggregateLength
            })
            const reply = yield* discovery.execute(["SENTINEL", "get-master-addr-by-name", config.masterName])
            const candidate = yield* Effect.try({
              try: () => address(reply, config),
              catch: (cause) =>
                cause instanceof RedisError
                  ? cause
                  : new RedisError({
                    reason: "Routing",
                    message: "Sentinel address mapping failed",
                    cause,
                    outcome: "NotSent"
                  })
            })
            const primary = yield* Connection.make(connector, candidate, {
              ...dataConfig,
              commandTimeout: dataConfig.commandTimeout ?? "5 seconds"
            })
            const role = yield* primary.execute(["ROLE"])
            if (role._tag !== "Array" || role.values.length < 1 || text(role.values[0]) !== "master") {
              return yield* Effect.fail(
                new RedisError({
                  reason: "Routing",
                  message: "Sentinel candidate is not a primary",
                  outcome: "NotSent"
                })
              )
            }
            return candidate
          })).pipe(Effect.timeoutOrElse({
            duration: dataConfig.commandTimeout ?? "5 seconds",
            orElse: () =>
              Effect.fail(
                new RedisError({ reason: "Timeout", message: "Sentinel discovery timed out", outcome: "NotSent" })
              )
          }))
        )
        if (result._tag === "Success") {
          const changed = current !== undefined && endpointKey(current) !== endpointKey(result.success)
          current = result.success
          preferred = index
          if (changed) { for (const listener of listeners) listener() }
          return
        }
        failures.push(result.failure)
      }
      return yield* Effect.fail(
        new RedisError({
          reason: "Routing",
          message: "No Sentinel discovered a verified primary",
          cause: failures,
          outcome: "NotSent"
        })
      )
    }))
    yield* refresh
    yield* Effect.forkScoped(Effect.forever(Effect.sleep(interval).pipe(Effect.andThen(Effect.ignoreCause(refresh)))))
    const topology: Topology = {
      resolve: () => Effect.sync(() => ({ endpoint: current! })),
      refresh,
      endpoints: () => current === undefined ? [] : [current],
      onChange: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }
    }
    return topology
  }
)
