import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"

// Identify abandonment by its interruptor ID.
const interruptor = globalValue("@effect/cluster/internal/clusterAbandon/interruptor", () => FiberId.unsafeMake())

export const interrupt: Effect.Effect<void> = Effect.withFiberRuntime((fiber) => {
  // Signal the fiber so recovery cannot swallow abandonment; masking still applies.
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

const signalOwner = Effect.withFiberRuntime<void>((fiber) => {
  const owner = Context.getOption(fiber.currentContext, Owner)
  if (Option.isSome(owner) && owner.value.active) {
    owner.value.fiber.unsafeInterruptAsFork(interruptor)
  }
  return Effect.void
})

/** Interrupt only the owner, leaving the current fiber to forward the cause. @internal */
export const interruptOwner = (cause: Cause.Cause<unknown>): Effect.Effect<void> =>
  isCause(cause) ? signalOwner : Effect.void

/** Signal only an active owner when relaying abandonment. @internal */
export const reSignal = interruptOwner

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
