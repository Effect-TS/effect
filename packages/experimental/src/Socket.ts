/**
 * @since 1.0.0
 */
import type { Channel } from "effect/Channel"
import type { Chunk } from "effect/Chunk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { Option } from "effect/Option"
import * as Queue from "effect/Queue"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"

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

/**
 * @since 1.0.0
 * @category models
 */
export interface SocketPull<E, I, O> {
  readonly write: (element: I) => Effect.Effect<never, never, void>
  readonly pull: Effect.Effect<never, Option<E>, Chunk<O>>
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toPull = <E, I, O>(
  self: Channel<never, never, Chunk<I>, unknown, E, Chunk<O>, unknown>
): Effect.Effect<Scope, never, SocketPull<E, I, O>> =>
  Effect.gen(function*(_) {
    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<I>(),
      Queue.shutdown
    ))
    const write = (element: I) => Queue.offer(queue, element)
    const pull = yield* _(
      Stream.fromQueue(queue),
      Stream.pipeThroughChannel(self),
      Stream.toPull
    )
    return { write, pull }
  })
