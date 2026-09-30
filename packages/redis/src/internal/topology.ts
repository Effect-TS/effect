// Internal topology contracts referenced by the public client types.
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"
import type { Routing } from "../RedisCommand.ts"
import type { Endpoint } from "../RedisConnection.ts"
import type { RedisError } from "../RedisError.ts"
import type { Argument } from "../RedisProtocol.ts"

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
  readonly slot?: number | undefined
}

export interface Redirect extends Resolved {
  readonly asking: boolean
}

export interface Topology {
  readonly resolve: (args: ReadonlyArray<Argument>, routing?: Routing) => Effect.Effect<Resolved, RedisError>
  readonly refresh: Effect.Effect<void, RedisError>
  readonly endpoints: () => ReadonlyArray<Endpoint>
  readonly redirect?: ((error: RedisError, from: Endpoint) => Redirect | undefined) | undefined
  readonly onChange?: ((listener: () => void) => () => void) | undefined
}
