/**
 * @since 3.8.0
 */
import type { Cause } from "./Cause.js"
import type { Channel } from "./Channel.js"
import type { Chunk } from "./Chunk.js"
import type { Effect } from "./Effect.js"
import type { Exit } from "./Exit.js"
import * as internal from "./internal/mailbox.js"
import { hasProperty } from "./Predicate.js"
import type { Stream } from "./Stream.js"

/**
 * @since 3.8.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 3.8.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.8.0
 * @category type ids
 */
export const ReadonlyTypeId: unique symbol = internal.ReadonlyTypeId

/**
 * @since 3.8.0
 * @category type ids
 */
export type ReadonlyTypeId = typeof ReadonlyTypeId

/**
 * @since 3.8.0
 * @category guards
 */
export const isMailbox = (u: unknown): u is Mailbox<unknown, unknown> => hasProperty(u, TypeId)

/**
 * @since 3.8.0
 * @category guards
 */
export const isReadonlyMailbox = (u: unknown): u is Mailbox<unknown, unknown> => hasProperty(u, ReadonlyTypeId)

/**
 * A `Mailbox` is a queue that can be signaled to be done or failed.
 *
 * @since 3.8.0
 * @category models
 */
export interface Mailbox<in out A, in out E = never> extends ReadonlyMailbox<A, E> {
  readonly [TypeId]: TypeId
  /**
   * Add a message to the mailbox. Returns `false` if the mailbox is done.
   */
  readonly offer: (message: A) => Effect<boolean>
  /**
   * Add multiple messages to the mailbox. Returns the number of messages that
   * were added.
   */
  readonly offerAll: (messages: Iterable<A>) => Effect<number>
  /**
   * Fail the mailbox with an error. If the mailbox is already done, `false` is
   * returned.
   */
  readonly fail: (error: E) => Effect<boolean>
  /**
   * Fail the mailbox with a cause. If the mailbox is already done, `false` is
   * returned.
   */
  readonly failCause: (cause: Cause<E>) => Effect<boolean>
  /**
   * Signal that the mailbox is complete. If the mailbox is already done, `false` is
   * returned.
   */
  readonly end: Effect<boolean>
  /**
   * Signal that the mailbox is done. If the mailbox is already done, `false` is
   * returned.
   */
  readonly done: (exit: Exit<void, E>) => Effect<boolean>
}

/**
 * A `ReadonlyMailbox` represents a mailbox that can only be read from.
 *
 * @since 3.8.0
 * @category models
 */
export interface ReadonlyMailbox<out A, out E = never> {
  readonly [ReadonlyTypeId]: ReadonlyTypeId
  /** Take all messages from the mailbox, or wait for messages to be available. */
  readonly take: Effect<readonly [messages: ReadonlyArray<A>, done: boolean], E>
  /** Wait for the mailbox to be done or failed. */
  readonly await: Effect<void, E>
}

/**
 * A `Mailbox` is a queue that can be signaled to be done or failed.
 *
 * @since 3.8.0
 * @category constructors
 */
export const unsafeMake: <A, E = never>(capacity?: number | undefined) => Mailbox<A, E> = internal.unsafeMake

/**
 * A `Mailbox` is a queue that can be signaled to be done or failed.
 *
 * @since 3.8.0
 * @category constructors
 * @example
 * import { Effect, Mailbox } from "effect"
 *
 * Effect.gen(function*() {
 *   const mailbox = yield* Mailbox.make<number, string>()
 *
 *   // add messages to the mailbox
 *   yield* mailbox.offer(1)
 *   yield* mailbox.offer(2)
 *   yield* mailbox.offerAll([3, 4, 5])
 *
 *   // take messages from the mailbox
 *   const [messages, done] = yield* mailbox.take
 *   assert.deepStrictEqual(messages, [1, 2, 3, 4, 5])
 *   assert.strictEqual(done, false)
 *
 *   // signal that the mailbox is done
 *   yield* mailbox.done
 *   const [messages2, done2] = yield* mailbox.take
 *   assert.deepStrictEqual(messages2, [])
 *   assert.strictEqual(done2, true)
 *
 *   // signal that the mailbox is failed
 *   yield* mailbox.fail("boom")
 * })
 */
export const make: <A, E = never>(capacity?: number | undefined) => Effect<Mailbox<A, E>> = internal.make

/**
 * Run an `Effect` into a `Mailbox`, where success ends the mailbox and failure
 * fails the mailbox.
 *
 * @since 3.8.0
 * @category combinators
 */
export const into: {
  <A, E>(self: Mailbox<A, E>): <AX, EX extends E, RX>(effect: Effect<AX, EX, RX>) => Effect<boolean, never, RX>
  <AX, E, EX extends E, RX, A>(effect: Effect<AX, EX, RX>, self: Mailbox<A, E>): Effect<boolean, never, RX>
} = internal.into

/**
 * Create a `Channel` from a `Mailbox`.
 *
 * @since 3.8.0
 * @category conversions
 */
export const toChannel: <A, E>(self: ReadonlyMailbox<A, E>) => Channel<Chunk<A>, unknown, E> = internal.toChannel

/**
 * Create a `Stream` from a `Mailbox`.
 *
 * @since 3.8.0
 * @category conversions
 */
export const toStream: <A, E>(self: ReadonlyMailbox<A, E>) => Stream<A, E> = internal.toStream
