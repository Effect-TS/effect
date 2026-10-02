import * as Duration from "../../Duration.ts"
import type * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import type * as Scope from "../../Scope.ts"
import type * as SocketConnector from "../../socket/SocketConnector.ts"
import { RedisError } from "../RedisError.ts"
import type { Argument } from "../RedisProtocol.ts"

export type Endpoint = SocketConnector.Endpoint

export interface Transport {
  readonly write: (bytes: string | Uint8Array) => Effect.Effect<void, RedisError>
  readonly run: (onBytes: (bytes: Uint8Array) => void) => Effect.Effect<void, RedisError>
  readonly close: Effect.Effect<void>
}

export type Connector = (endpoint: Endpoint) => Effect.Effect<Transport, RedisError, Scope.Scope>

export const endpointKey = (endpoint: Endpoint): string =>
  endpoint.path === undefined
    ? `${endpoint.tls ? "tls" : "tcp"}://${endpoint.host}:${endpoint.port}`
    : `unix:${endpoint.path}`

export const notSent = (reason: RedisError["reason"], message: string, cause?: unknown): RedisError =>
  new RedisError({ reason, message, cause, outcome: "NotSent" })

export const withOutcome = (error: RedisError, outcome: "NotSent" | "Unknown"): RedisError =>
  new RedisError({ reason: error.reason, message: error.message, cause: error.cause, code: error.code, outcome })

/**
 * Converts a duration input to milliseconds, or `undefined` when it is invalid.
 */
export const durationMillis = (input: Duration.Input): number | undefined => {
  const duration = Duration.fromInput(input)
  return Option.isNone(duration) || hasNaN(input) ? undefined : Duration.toMillis(duration.value)
}

// Duration inputs coerce NaN to zero, so reject it explicitly.
const hasNaN = (input: unknown): boolean =>
  typeof input === "number"
    ? Number.isNaN(input)
    : typeof input === "object" && input !== null && !Duration.isDuration(input) && Object.values(input).some(hasNaN)

const decoder = new TextDecoder()

export const argumentText = (arg: Argument | undefined): string =>
  typeof arg === "string" ? arg : arg === undefined ? "" : decoder.decode(arg)
