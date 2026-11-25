import type * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import type * as Fiber from "../../Fiber.ts"
import { Abandon } from "../ClusterSchema.ts"
import type * as Message from "../Message.ts"
import type * as Snowflake from "../Snowflake.ts"

export interface ReplyWait {
  persistedId: Snowflake.Snowflake | undefined
  abandoned: boolean
  onPersisted: ((persistedId: Snowflake.Snowflake) => (() => void) | undefined) | undefined
  readonly fiber: Fiber.Fiber<any, any>
}

export const replyWaits = new WeakMap<Message.OutgoingRequest<any>, ReplyWait>()

// Annotate before opening the interruptible region. An interrupt already
// pending on an uninterruptible fiber fires as soon as the region opens, and
// the annotation is merged into that pending cause instead of being lost.
export const interrupt: Effect.Effect<never> = Effect.withFiber((fiber) => {
  fiber.interruptUnsafe(fiber.id, Abandon.annotation)
  return Effect.interruptible(Effect.never)
})

export const abandonWait = (wait: ReplyWait): void => {
  wait.abandoned = true
  wait.fiber.interruptUnsafe(wait.fiber.id, Abandon.annotation)
}

export const isCause = (cause: Cause.Cause<unknown>): boolean =>
  cause.reasons.some((reason) => reason._tag === "Interrupt" && reason.annotations.has(Abandon.key))
