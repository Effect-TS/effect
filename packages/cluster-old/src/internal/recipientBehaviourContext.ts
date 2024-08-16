import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as Message from "../Message.js"
import type * as RecipientAddress from "../RecipientAddress.js"
import type * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"
import type * as RecipientType from "../RecipientType.js"
import type * as ShardId from "../ShardId.js"

/** @internal */
const RecipientBehaviourContextSymbolKey = "@effect/cluster/RecipientBehaviourContext"

/** @internal */
export const RecipientBehaviourContextTypeId: RecipientBehaviourContext.RecipientBehaviourContextTypeId = Symbol.for(
  RecipientBehaviourContextSymbolKey
) as RecipientBehaviourContext.RecipientBehaviourContextTypeId

/** @internal */
export const recipientBehaviourContextTag = Context.GenericTag<RecipientBehaviourContext.RecipientBehaviourContext>(
  RecipientBehaviourContextSymbolKey
)

/** @internal */
export function make(
  args: Omit<
    RecipientBehaviourContext.RecipientBehaviourContext,
    RecipientBehaviourContext.RecipientBehaviourContextTypeId
  >
): RecipientBehaviourContext.RecipientBehaviourContext {
  return ({ [RecipientBehaviourContextTypeId]: RecipientBehaviourContextTypeId, ...args })
}

/** @internal */
export const recipientAddress: Effect.Effect<
  RecipientAddress.RecipientAddress,
  never,
  RecipientBehaviourContext.RecipientBehaviourContext
> = Effect.map(
  recipientBehaviourContextTag,
  (_) => _.recipientAddress
)

/** @internal */
export const entityId: Effect.Effect<string, never, RecipientBehaviourContext.RecipientBehaviourContext> = Effect.map(
  recipientAddress,
  (_) => _.entityId
)

/** @internal */
export const shardId: Effect.Effect<ShardId.ShardId, never, RecipientBehaviourContext.RecipientBehaviourContext> =
  Effect.map(
    recipientBehaviourContextTag,
    (_) => _.shardId
  )

/** @internal */
export const recipientType: Effect.Effect<
  RecipientType.RecipientType<Message.Message.Any>,
  never,
  RecipientBehaviourContext.RecipientBehaviourContext
> = Effect.map(
  recipientBehaviourContextTag,
  (_) => _.recipientType
)

/** @internal */
export const forkShutdown: Effect.Effect<void, never, RecipientBehaviourContext.RecipientBehaviourContext> = Effect
  .flatMap(
    recipientBehaviourContextTag,
    (_) => _.forkShutdown
  )
