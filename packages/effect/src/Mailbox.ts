/**
 * @since 3.8.0
 */
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { dual, identity } from "effect/Function"
import * as Stream from "effect/Stream"
import { hasProperty } from "./Predicate.js"
import type { Invariant } from "./Types.js"

/**
 * @since 3.8.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/Mailbox")

/**
 * @since 3.8.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.8.0
 * @category guards
 */
export const isMailbox = (u: unknown): u is Mailbox<unknown, unknown> => hasProperty(u, TypeId)

/**
 * A `Mailbox` is a queue that can be signaled to be done or failed.
 *
 * @since 3.8.0
 * @category models
 */
export interface Mailbox<in out A, in out E = never> {
  readonly [TypeId]: {
    readonly _A: Invariant<A>
    readonly _E: Invariant<E>
  }
  /**
   * Add a message to the mailbox. Returns `false` if the mailbox is done.
   */
  readonly offer: (message: A) => Effect.Effect<boolean>
  /**
   * Add multiple messages to the mailbox. Returns the number of messages that
   * were added.
   */
  readonly offerAll: (messages: Iterable<A>) => Effect.Effect<number>
  /**
   * Fail the mailbox with an error. If the mailbox is already done, `false` is
   * returned.
   */
  readonly fail: (error: E) => Effect.Effect<boolean>
  /**
   * Fail the mailbox with a cause. If the mailbox is already done, `false` is
   * returned.
   */
  readonly failCause: (cause: Cause.Cause<E>) => Effect.Effect<boolean>
  /**
   * Signal that the mailbox is done. If the mailbox is already done, `false` is
   * returned.
   */
  readonly done: Effect.Effect<boolean>
  /** Take all messages from the mailbox, or wait for messages to be available. */
  readonly take: Effect.Effect<readonly [messages: ReadonlyArray<A>, done: boolean], E>
  /** Wait for the mailbox to be done or failed. */
  readonly await: Effect.Effect<void, E>
}

type MailboxState<E> = {
  readonly _tag: "Open"
  readonly takeLatch: Effect.Latch
  readonly capacityLatch: Effect.Latch
} | {
  readonly _tag: "Done"
  readonly exit: Exit.Exit<void, E>
}

const doneResult = [[], true] as const

const variance = {
  _A: identity,
  _E: identity
}

class MailboxImpl<A, E> implements Mailbox<A, E> {
  readonly [TypeId] = variance as Mailbox<A, E>[TypeId]
  private state: MailboxState<E> = {
    _tag: "Open",
    takeLatch: Effect.unsafeMakeLatch(false),
    capacityLatch: Effect.unsafeMakeLatch(true)
  }
  private messages: Array<A> = []
  constructor(readonly capacity: number) {}

  offer(message: A): Effect.Effect<boolean> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        if (this.state._tag !== "Open") {
          return Effect.succeed(false)
        }
        const len = this.messages.length
        if (len >= this.capacity) {
          return Effect.zipRight(restore(this.state.capacityLatch.await), this.offer(message))
        }
        this.messages.push(message)
        return Effect.as(
          (len + 1) >= this.capacity
            ? Effect.zipRight(this.state.capacityLatch.close, this.state.takeLatch.open)
            : this.state.takeLatch.open,
          true
        )
      })
    )
  }
  offerAll(messages: Iterable<A>): Effect.Effect<number> {
    return this.offerAllLoop(Array.from(messages), 0)
  }
  private offerAllLoop(messages: Array<A>, count: number): Effect.Effect<number> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        if (this.state._tag !== "Open") {
          return Effect.succeed(count)
        }
        const len = messages.length
        const free = this.capacity - this.messages.length
        if (free === 0) {
          return Effect.zipRight(restore(this.state.capacityLatch.await), this.offerAllLoop(messages, count))
        } else if (len <= free) {
          if (this.messages.length === 0) {
            this.messages = messages
          } else {
            // eslint-disable-next-line no-restricted-syntax
            this.messages.push(...messages)
          }
          return Effect.as(
            len >= free
              ? Effect.zipRight(this.state.capacityLatch.close, this.state.takeLatch.open)
              : this.state.takeLatch.open,
            count + len
          )
        }
        const remaining = new Array<A>(len - free)
        for (let i = 0; i < len; i++) {
          if (i < free) {
            this.messages.push(messages[i])
          } else {
            remaining[i - free] = messages[i]
          }
        }
        return this.state.capacityLatch.close.pipe(
          Effect.zipRight(this.state.takeLatch.open),
          Effect.zipRight(restore(this.state.capacityLatch.await)),
          Effect.zipRight(this.offerAllLoop(remaining, count + free))
        )
      })
    )
  }
  fail(error: E) {
    return this.failCause(Cause.fail(error))
  }
  failCause(cause: Cause.Cause<E>) {
    return Effect.suspend(() => {
      if (this.state._tag !== "Open") {
        return Effect.succeed(false)
      }
      const openState = this.state
      this.state = { _tag: "Done", exit: Exit.failCause(cause) }
      return Effect.as(openState.takeLatch.open, true)
    })
  }
  done = Effect.suspend(() => {
    if (this.state._tag !== "Open") {
      return Effect.succeed(false)
    }
    const openState = this.state
    this.state = { _tag: "Done", exit: Exit.void }
    return Effect.as(openState.takeLatch.open, true)
  })
  take: Effect.Effect<readonly [messages: ReadonlyArray<A>, done: boolean], E> = Effect.uninterruptibleMask((restore) =>
    restore(Effect.suspend(() =>
      this.state._tag === "Open"
        ? this.state.takeLatch.await
        : Effect.void
    )).pipe(
      Effect.flatMap((_) => {
        if (this.messages.length === 0) {
          if (this.state._tag === "Done") {
            return Exit.as(this.state.exit, doneResult)
          }
          return this.take
        }
        const messages = this.messages
        this.messages = []
        return Effect.succeed([messages, this.state._tag === "Done"] as const)
      }),
      Effect.tap(() =>
        this.state._tag === "Open"
          ? Effect.zipRight(this.state.takeLatch.close, this.state.capacityLatch.open)
          : Effect.void
      )
    )
  )
  await: Effect.Effect<void, E> = Effect.suspend(() => {
    if (this.state._tag === "Done") {
      return this.state.exit
    }
    return Effect.zipRight(this.state.takeLatch.await, this.await)
  })
}

/**
 * A `Mailbox` is a queue that can be signaled to be done or failed.
 *
 * @since 3.8.0
 * @category constructors
 */
export const unsafeMake = <A, E = never>(capacity?: number | undefined): Mailbox<A, E> =>
  new MailboxImpl(capacity ?? Number.POSITIVE_INFINITY)

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
export const make = <A, E = never>(capacity?: number | undefined): Effect.Effect<Mailbox<A, E>> =>
  Effect.sync(() => unsafeMake(capacity))

/**
 * Run an `Effect` into a `Mailbox`, where success ends the mailbox and failure
 * fails the mailbox.
 *
 * @since 3.8.0
 * @category combinators
 */
export const into: {
  <A, E>(
    self: Mailbox<A, E>
  ): <AX, EX extends E, RX>(effect: Effect.Effect<AX, EX, RX>) => Effect.Effect<void, never, RX>
  <AX, E, EX extends E, RX, A>(effect: Effect.Effect<AX, EX, RX>, self: Mailbox<A, E>): Effect.Effect<void, never, RX>
} = dual(
  2,
  <AX, E, EX extends E, RX, A>(
    effect: Effect.Effect<AX, EX, RX>,
    self: Mailbox<A, E>
  ): Effect.Effect<void, never, RX> =>
    Effect.uninterruptibleMask((restore) =>
      Effect.matchCauseEffect(restore(effect), {
        onFailure: (cause) => self.failCause(cause),
        onSuccess: (_) => self.done
      })
    )
)

/**
 * Create a `Channel` from a `Mailbox`.
 *
 * @since 3.8.0
 * @category conversions
 */
export const toChannel = <A, E>(self: Mailbox<A, E>): Channel.Channel<Chunk.Chunk<A>, unknown, E> => {
  const loop: Channel.Channel<Chunk.Chunk<A>, unknown, E> = Channel.flatMap(self.take, ([messages, done]) =>
    done
      ? messages.length === 0 ? Channel.void : Channel.write(Chunk.unsafeFromArray(messages))
      : Channel.zipRight(Channel.write(Chunk.unsafeFromArray(messages)), loop))
  return loop
}

/**
 * Create a `Stream` from a `Mailbox`.
 *
 * @since 3.8.0
 * @category conversions
 */
export const toStream = <A, E>(self: Mailbox<A, E>): Stream.Stream<A, E> => Stream.fromChannel(toChannel(self))
