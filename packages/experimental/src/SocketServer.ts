/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Socket from "./Socket.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketServerTypeId = Symbol.for("@effect/experimental/SocketServer")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketServerTypeId = typeof SocketServerTypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const SocketServer: Context.Tag<SocketServer, SocketServer> = Context.Tag<SocketServer>(
  "@effect/experimental/SocketServer"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface SocketServer {
  readonly [SocketServerTypeId]: SocketServerTypeId
  readonly address: Effect.Effect<never, never, Address>
  readonly run: <R, E, _>(
    handler: (socket: Socket.Socket) => Effect.Effect<R, E, _>
  ) => Effect.Effect<R, SocketServerError, never>
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketServerError extends Data.TaggedError("SocketServerError")<{
  readonly reason: "Open" | "Unknown"
  readonly error: unknown
}> {
  /**
   * @since 1.0.0
   */
  toString(): string {
    return `SocketServerError: ${this.reason} - ${this.error}`
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type Address = UnixAddress | TcpAddress

/**
 * @since 1.0.0
 * @category models
 */
export interface TcpAddress {
  readonly _tag: "TcpAddress"
  readonly hostname: string
  readonly port: number
}

/**
 * @since 1.0.0
 * @category models
 */
export interface UnixAddress {
  readonly _tag: "UnixAddress"
  readonly path: string
}
