/**
 * @since 1.0.0
 */
import type * as Message from "@effect/cluster/Message"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type * as Queue from "effect/Queue"
import type * as Ref from "effect/Ref"
import type * as Scope from "effect/Scope"
import * as internal from "./internal/recipientBehaviour.js"
import type * as MessageState from "./MessageState.js"
import type * as PoisonPill from "./PoisonPill.js"
import type * as RecipientBehaviourContext from "./RecipientBehaviourContext.js"
import type * as ShardingException from "./ShardingException.js"

/**
 * A RecipientBehaviour describes how a specific RecipientType should behave.
 * This is the actual implementation of what an entity should do upon receiving a Msg,
 * this could require additional context.
 *
 * The scope provided in the context is controlled by the cluster EntityManager,
 * and is used to request the shoutdown of the entity,
 * so you can safely scope whatever resource you want to use for your behaviour
 *  and the EntityManager will close the scope for you when the entity is shoutdown.
 *
 * The function returned by the RecipientBehaviour effect is what we call "offer" effect.
 * The offer effect is used by the EntityManager to give messages to the RecipientBehaviour.
 *
 * @since 1.0.0
 * @category models
 */
export interface RecipientBehaviour<Msg, R> extends
  Effect.Effect<
    <A extends Msg>(
      message: A
    ) => Effect.Effect<
      MessageState.MessageState<Message.Message.Exit<A>>,
      ShardingException.ExceptionWhileOfferingMessageException
    >,
    never,
    R | RecipientBehaviourContext.RecipientBehaviourContext | Scope.Scope
  >
{}

/**
 * This are the options for an EntityBehaviour. This controls the entityMaxIdleTime,
 * check out more on that over the ShardingConfig.
 * This allows to override the setting for a specific entity.
 *
 * @since 1.0.0
 * @category utils
 */
export type EntityBehaviourOptions = {
  entityMaxIdleTime?: Option.Option<Duration.Duration>
}

/**
 * This is the simplest behaviour you can have.
 * You provide a function that given the entityId and the message, it will immediatly process it.
 * You are then required to return a MessageState to tell the caller
 * if the message has just arrived and will be later processed or it has been processed.
 *
 * @since 1.0.0
 * @category utils
 */
export const fromFunctionEffect: <Msg extends Message.Message.Any, R>(
  handler: (
    entityId: string,
    message: Msg
  ) => Effect.Effect<MessageState.MessageState<Message.Message.Exit<Msg>>, never, R>
) => RecipientBehaviour<Msg, R> = internal.fromFunctionEffect

/**
 * This is a stateful version of fromFunctionEffect.
 * You can provide a function to get the initialState, and then it will be passed as Ref.
 * Everything here is just stored in memory, so eventual persistence of the state is up to you!
 *
 * @since 1.0.0
 * @category utils
 */
export const fromFunctionEffectStateful: <S, R, Msg extends Message.Message.Any, R2>(
  initialState: (entityId: string) => Effect.Effect<S, never, R>,
  handler: (
    entityId: string,
    message: Msg,
    stateRef: Ref.Ref<S>
  ) => Effect.Effect<MessageState.MessageState<Message.Message.Exit<Msg>>, never, R2>
) => RecipientBehaviour<Msg, R | R2> = internal.fromFunctionEffectStateful

/**
 * This behaviour uses a Queue where the entity will accumulate messages to be processed,
 * and then you can use the Dequeue to take messages and process them.
 * A PoisonPill is provided to request interruption of the entity behaviour.
 *
 * @since 1.0.0
 * @category utils
 */
export const fromInMemoryQueue: <Msg extends Message.Message.Any, R>(
  handler: (
    entityId: string,
    dequeue: Queue.Dequeue<Msg | PoisonPill.PoisonPill>,
    processed: <A extends Msg>(
      message: A,
      value: Option.Option<Message.Message.Exit<A>>
    ) => Effect.Effect<void, never, never>
  ) => Effect.Effect<void, never, R>
) => RecipientBehaviour<Msg, R> = internal.fromInMemoryQueue
