import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"
import type * as Result from "effect/Result"
import type { Routing } from "../RedisCommand.ts"
import type { RedisError } from "../RedisError.ts"
import type { Argument } from "../RedisProtocol.ts"
import type { Endpoint } from "./transport.ts"

export interface ClusterConfig {
  readonly _tag: "Cluster"
  readonly seeds: ReadonlyArray<Endpoint>
  readonly maxRedirects?: number | undefined
  readonly mapAddress?: ((endpoint: Endpoint) => Endpoint) | undefined
}

export interface SentinelConfig {
  readonly _tag: "Sentinel"
  readonly sentinels: ReadonlyArray<Endpoint>
  readonly masterName: string
  readonly refreshInterval?: Duration.Input | undefined
  readonly username?: string | undefined
  readonly password?: string | Redacted.Redacted<string> | undefined
  readonly dataTls?: Endpoint["tls"]
  readonly mapAddress?: ((endpoint: Endpoint) => Endpoint) | undefined
}

export interface Resolved {
  readonly endpoint: Endpoint
  /** The Cluster hash slot of the command's keys, when it has any. */
  readonly slot?: number | undefined
}

export interface Redirect extends Resolved {
  readonly asking: boolean
}

export interface Topology {
  readonly _tag: "Standalone" | "Cluster" | "Sentinel"
  readonly route: (args: ReadonlyArray<Argument>, routing?: Routing) => Result.Result<Resolved, RedisError>
  readonly resolve: (args: ReadonlyArray<Argument>, routing?: Routing) => Effect.Effect<Resolved, RedisError>
  readonly refresh: Effect.Effect<void, RedisError>
  readonly endpoints: () => ReadonlyArray<Endpoint>
  /** Interprets a MOVED or ASK error, updating the slot map for MOVED. */
  readonly redirect: (error: RedisError, from: Endpoint) => Redirect | undefined
  /** Registers a listener for primary changes. */
  readonly onChange: (listener: () => void) => () => void
}

export const validEndpoint = (endpoint: Endpoint): boolean =>
  typeof endpoint.host === "string" && endpoint.host.length > 0 && !/\s/.test(endpoint.host) &&
  Number.isSafeInteger(endpoint.port) && endpoint.port >= 1 && endpoint.port <= 65535
