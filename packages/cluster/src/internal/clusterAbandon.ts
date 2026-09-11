import * as Cause from "effect/Cause"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import { NodeInspectSymbol } from "effect/Inspectable"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"

// v3 carries interruption provenance through FiberId rather than cause annotations.
const interruptor = globalValue("@effect/cluster/internal/clusterAbandon/interruptor", () => FiberId.unsafeMake())

export const interrupt: Effect.Effect<void> = Effect.withFiberRuntime((fiber) => {
  // Signal the fiber so recovery cannot swallow abandonment. The runtime defers
  // the signal while masked and retains its provenance when interruption resumes.
  fiber.unsafeInterruptAsFork(interruptor)
  return Effect.void
})

export const isInterruptor = (id: FiberId.FiberId): boolean =>
  id._tag === "Runtime"
    ? id.id === interruptor.id
    : id._tag === "Composite" && (isInterruptor(id.left) || isInterruptor(id.right))

export const isCause = (cause: Cause.Cause<unknown>): boolean =>
  Option.isSome(
    Cause.find(cause, (c) => c._tag === "Interrupt" && isInterruptor(c.fiberId) ? Option.some(c) : Option.none())
  )

/** @internal */
export const onError = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.onError(effect, (cause) =>
    isCause(cause)
      ? Effect.withFiberRuntime((fiber) => {
        const owner = Context.getOption(fiber.currentContext, Owner)
        if (Option.isSome(owner) && owner.value.active) {
          owner.value.fiber.unsafeInterruptAsFork(interruptor)
        }
        return interrupt
      })
      : Effect.void)

const Owner = Context.GenericTag<{ readonly fiber: Fiber.RuntimeFiber<unknown, unknown>; active: boolean }>(
  "@effect/cluster/internal/clusterAbandon/Owner"
)

/** @internal */
export const withOwner = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.withFiberRuntime((fiber) => {
    const owner = { fiber, active: true }
    return Effect.provideService(effect, Owner, owner).pipe(
      Effect.ensuring(Effect.sync(() => {
        owner.active = false
      }))
    )
  })

/** @internal */
export const mailbox = <A, E>(self: Mailbox.ReadonlyMailbox<A, E>): Mailbox.ReadonlyMailbox<A, E> =>
  new AbandonmentMailbox(self)

class AbandonmentMailbox<A, E> extends Effectable.Class<readonly [Chunk.Chunk<A>, boolean], E>
  implements Mailbox.ReadonlyMailbox<A, E>
{
  readonly [Mailbox.ReadonlyTypeId]: Mailbox.ReadonlyTypeId = Mailbox.ReadonlyTypeId
  readonly clear: Effect.Effect<Chunk.Chunk<A>, E>
  readonly takeAll: Effect.Effect<readonly [Chunk.Chunk<A>, boolean], E>
  readonly take: Effect.Effect<A, E | Cause.NoSuchElementException>
  readonly await: Effect.Effect<void, E>
  constructor(readonly self: Mailbox.ReadonlyMailbox<A, E>) {
    super()
    this.clear = onError(self.clear)
    this.takeAll = onError(self.takeAll)
    this.take = onError(self.take)
    this.await = onError(self.await)
  }
  commit() {
    return this.takeAll
  }
  takeN(n: number) {
    return onError(this.self.takeN(n))
  }
  get size() {
    return this.self.size
  }
  unsafeSize() {
    return this.self.unsafeSize()
  }
  toJSON() {
    return this.self.toJSON()
  }
  toString() {
    return this.self.toString()
  }
  [NodeInspectSymbol]() {
    return this.self[NodeInspectSymbol]()
  }
}
