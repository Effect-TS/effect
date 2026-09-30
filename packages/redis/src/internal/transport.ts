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
    bytes: string | Uint8Array,
    options?: { readonly ownership?: "copy" | "transfer" | undefined } | undefined
  ) => Effect.Effect<void, RedisError>
  /** Runs one consumer until interrupted or failed, delivering stable byte ranges synchronously. */
  readonly run: (onBytes: (bytes: Uint8Array) => void) => Effect.Effect<void, RedisError>
  readonly close: Effect.Effect<void>
}

export type Connector = (endpoint: Endpoint) => Effect.Effect<Transport, RedisError, Scope.Scope>

export const endpointKey = (endpoint: Endpoint): string =>
  endpoint.path === undefined
    ? `${endpoint.tls ? "tls" : "tcp"}://${endpoint.host}:${endpoint.port}`
    : `unix:${endpoint.path}`
