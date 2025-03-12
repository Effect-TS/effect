/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Socket from "./Socket.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class SocketServer extends Context.Tag("@effect/platform/SocketServer")<
  SocketServer,
  {
    readonly address: Address
    readonly run: <R, E, _>(
      handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>
    ) => Effect.Effect<never, SocketServerError, R>
  }
>() {}

/**
 * @since 1.0.0
 * @category errors
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform/SocketServer/SocketServerError")

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorTypeId = typeof ErrorTypeId

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
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

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
