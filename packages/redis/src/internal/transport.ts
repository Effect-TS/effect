// Internal transport contracts referenced by the public connection types.
import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { RedisError } from "../RedisError.ts"

export interface Endpoint {
  readonly host: string
  readonly port: number
  readonly path?: string | undefined
  readonly tls?: boolean | Readonly<Record<string, unknown>> | undefined
}

export interface Transport {
  readonly write: (
    bytes: Uint8Array,
    options?: { readonly ownership?: "copy" | "transfer" | undefined } | undefined
  ) => Effect.Effect<void, RedisError>
  /** Returned byte ranges remain stable forever; producers must not reuse or mutate them. */
  readonly read: Effect.Effect<Uint8Array, RedisError>
  readonly close: Effect.Effect<void>
}

export type Connector = (endpoint: Endpoint) => Effect.Effect<Transport, RedisError, Scope.Scope>

export const endpointKey = (endpoint: Endpoint): string =>
  endpoint.path === undefined
    ? `${endpoint.tls ? "tls" : "tcp"}://${endpoint.host}:${endpoint.port}`
    : `unix:${endpoint.path}`
