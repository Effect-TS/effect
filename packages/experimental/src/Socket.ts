/**
 * @since 1.0.0
 */
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"

/**
 * @since 1.0.0
 * @category models
 */
export interface Socket<IE = never> extends
  Channel<
    never,
    IE,
    Chunk<Uint8Array>,
    unknown,
    IE | SocketError,
    Chunk<Uint8Array>,
    void
  >
{}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketError extends Data.TaggedError("SocketError")<{
  readonly reason: "Write" | "Read" | "Open"
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketPlatformTypeId = Symbol.for("@effect/experimental/Socket/SocketPlatform")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketPlatformTypeId = typeof SocketPlatformTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface SocketPlatform {
  readonly [SocketPlatformTypeId]: SocketPlatformTypeId
  readonly open: (
    options: {
      readonly port: number
      readonly host: string
    } | {
      readonly path: string
    }
  ) => Socket
}

/**
 * @since 1.0.0
 * @category tags
 */
export const SocketPlatform: Context.Tag<SocketPlatform, SocketPlatform> = Context.Tag<SocketPlatform>(
  SocketPlatformTypeId
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const withInputError = <IE>(self: Socket): Socket<IE> => self as any
