/**
 * @since 1.0.0
 */
import type * as Socket from "@effect/platform/Socket"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketServerTypeId: unique symbol = Symbol.for("@effect/experimental/SocketServer")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketServerTypeId = typeof SocketServerTypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const SocketServer: Context.Tag<SocketServer, SocketServer> = Context.GenericTag<SocketServer>(
  "@effect/experimental/SocketServer"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface SocketServer {
  readonly [SocketServerTypeId]: SocketServerTypeId
  readonly address: Address
  readonly run: <R, E, _>(
    handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>
  ) => Effect.Effect<never, SocketServerError, R>
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketServerError extends Data.TaggedError("SocketServerError")<{
  readonly reason: "Open" | "Unknown"
  readonly cause: unknown
}> {
  /**
   * @since 1.0.0
   */
  get message(): string {
    return this.reason
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
