import type { Cause } from "../Cause.js"
import type { Channel } from "../Channel.js"
import * as Chunk from "../Chunk.js"
import type { Effect, Latch } from "../Effect.js"
import type { Exit } from "../Exit.js"
import { dual } from "../Function.js"
import type * as Api from "../Mailbox.js"
import { hasProperty } from "../Predicate.js"
import type { Stream } from "../Stream.js"
import * as channel from "./channel.js"
import * as coreChannel from "./core-stream.js"
import * as core from "./core.js"
import * as circular from "./effect/circular.js"
import * as stream from "./stream.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for("effect/Mailbox") as Api.TypeId

/** @internal */
export const ReadonlyTypeId: Api.ReadonlyTypeId = Symbol.for("effect/Mailbox/ReadonlyMailbox") as Api.ReadonlyTypeId

/** @internal */
export const isMailbox = (u: unknown): u is Api.Mailbox<unknown, unknown> => hasProperty(u, TypeId)

/** @internal */
export const isReadonlyMailbox = (u: unknown): u is Api.Mailbox<unknown, unknown> => hasProperty(u, ReadonlyTypeId)

type MailboxState<E> = {
  readonly _tag: "Open"
  readonly takeLatch: Latch
  readonly waiters: Set<readonly [capacity: number, resume: (_: Effect<void>) => void]>
} | {
  readonly _tag: "Done"
  readonly exit: Exit<void, E>
}

const asDone = core.exitAs([[], true] as const)

class MailboxImpl<A, E> implements Api.Mailbox<A, E> {
  readonly [TypeId]: Api.TypeId = TypeId
  readonly [ReadonlyTypeId]: Api.ReadonlyTypeId = ReadonlyTypeId
  private state: MailboxState<E> = {
    _tag: "Open",
    takeLatch: circular.unsafeMakeLatch(false),
    waiters: new Set()
  }
  private messages: Array<A> = []
  constructor(readonly capacity: number) {}

  private awaitCapacity(capacity: number) {
    return core.unsafeAsync<void>((resume) => {
      if (this.state._tag !== "Open") {
        return resume(core.exitVoid)
      }
      const entry = [capacity, resume] as const
      this.state.waiters.add(entry)
      return core.sync(() => {
        if (this.state._tag === "Open") {
          this.state.waiters.delete(entry)
        }
      })
    })
  }
  private releaseCapacity = core.sync(() => {
    if (this.state._tag !== "Open") {
      return
    } else if (this.state.waiters.size === 0) {
      return
    }
    let released = 0
    for (const entry of this.state.waiters) {
      released += entry[0]
      this.state.waiters.delete(entry)
      entry[1](core.exitVoid)
      if (released >= this.capacity) {
        break
      }
    }
  })

  offer(message: A): Effect<boolean> {
    return core.uninterruptibleMask((restore) =>
      core.suspend(() => {
        if (this.state._tag !== "Open") {
          return core.succeed(false)
        }
        const len = this.messages.length
        if (len >= this.capacity) {
          return core.zipRight(
            restore(this.awaitCapacity(1)),
            this.offer(message)
          )
        }
        this.messages.push(message)
        return core.as(this.state.takeLatch.open, true)
      })
    )
  }
  offerAll(messages: Iterable<A>): Effect<number> {
    return this.offerAllLoop(Array.from(messages), 0)
  }
  private offerAllLoop(messages: Array<A>, count: number): Effect<number> {
    return core.uninterruptibleMask((restore) =>
      core.suspend(() => {
        if (this.state._tag !== "Open") {
          return core.succeed(count)
        }
        const len = messages.length
        const free = this.capacity - this.messages.length
        if (free === 0) {
          return core.zipRight(
            restore(this.awaitCapacity(len)),
            this.offerAllLoop(messages, count)
          )
        } else if (len <= free) {
          if (this.messages.length === 0) {
            this.messages = messages
          } else {
            // eslint-disable-next-line no-restricted-syntax
            this.messages.push(...messages)
          }
          return core.as(this.state.takeLatch.open, count + len)
        }
        const remaining = new Array<A>(len - free)
        for (let i = 0; i < len; i++) {
          if (i < free) {
            this.messages.push(messages[i])
          } else {
            remaining[i - free] = messages[i]
          }
        }
        return this.state.takeLatch.open.pipe(
          core.zipRight(restore(this.awaitCapacity(len - free))),
          core.zipRight(this.offerAllLoop(remaining, count + free))
        )
      })
    )
  }
  fail(error: E) {
    return this.done(core.exitFail(error))
  }
  failCause(cause: Cause<E>) {
    return this.done(core.exitFailCause(cause))
  }
  done(exit: Exit<void, E>) {
    return core.suspend(() => {
      if (this.state._tag !== "Open") {
        return core.succeed(false)
      }
      const openState = this.state
      this.state = { _tag: "Done", exit }
      for (const entry of openState.waiters) {
        entry[1](core.exitVoid)
      }
      return core.as(openState.takeLatch.open, true)
    })
  }
  end = this.done(core.exitVoid)
  take: Effect<readonly [messages: ReadonlyArray<A>, done: boolean], E> = core.uninterruptibleMask((restore) =>
    core.flatMap(
      restore(core.suspend(() =>
        this.state._tag === "Open"
          ? this.state.takeLatch.await
          : core.void
      )),
      (_) => {
        if (this.messages.length === 0) {
          if (this.state._tag === "Done") {
            return asDone(this.state.exit)
          }
          return core.zipRight(core.yieldNow(), this.take)
        }
        const messages = this.messages
        this.messages = []
        if (this.state._tag === "Done") {
          return core.succeed([messages, true] as const)
        }
        return core.as(
          core.zipRight(this.state.takeLatch.close, this.releaseCapacity),
          [messages, false] as const
        )
      }
    )
  )
  await: Effect<void, E> = core.suspend(() => {
    if (this.state._tag === "Done") {
      return this.state.exit
    }
    return core.zipRight(this.state.takeLatch.await, this.await)
  })
}

/** @internal */
export const unsafeMake = <A, E = never>(capacity?: number | undefined): Api.Mailbox<A, E> =>
  new MailboxImpl(capacity ?? Number.POSITIVE_INFINITY)

/** @internal */
export const make = <A, E = never>(capacity?: number | undefined): Effect<Api.Mailbox<A, E>> =>
  core.sync(() => unsafeMake(capacity))

/** @internal */
export const into: {
  <A, E>(
    self: Api.Mailbox<A, E>
  ): <AX, EX extends E, RX>(effect: Effect<AX, EX, RX>) => Effect<boolean, never, RX>
  <AX, E, EX extends E, RX, A>(
    effect: Effect<AX, EX, RX>,
    self: Api.Mailbox<A, E>
  ): Effect<boolean, never, RX>
} = dual(
  2,
  <AX, E, EX extends E, RX, A>(
    effect: Effect<AX, EX, RX>,
    self: Api.Mailbox<A, E>
  ): Effect<boolean, never, RX> =>
    core.uninterruptibleMask((restore) =>
      core.matchCauseEffect(restore(effect), {
        onFailure: (cause) => self.failCause(cause),
        onSuccess: (_) => self.end
      })
    )
)

/** @internal */
export const toChannel = <A, E>(self: Api.ReadonlyMailbox<A, E>): Channel<Chunk.Chunk<A>, unknown, E> => {
  const loop: Channel<Chunk.Chunk<A>, unknown, E> = coreChannel.flatMap(self.take, ([messages, done]) =>
    done
      ? messages.length === 0 ? coreChannel.void : coreChannel.write(Chunk.unsafeFromArray(messages))
      : channel.zipRight(coreChannel.write(Chunk.unsafeFromArray(messages)), loop))
  return loop
}

/** @internal */
export const toStream = <A, E>(self: Api.ReadonlyMailbox<A, E>): Stream<A, E> => stream.fromChannel(toChannel(self))
