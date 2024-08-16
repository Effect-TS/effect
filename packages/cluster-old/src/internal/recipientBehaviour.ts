import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import type * as Message from "../Message.js"
import * as MessageState from "../MessageState.js"
import * as PoisonPill from "../PoisonPill.js"
import type * as RecipientBehaviour from "../RecipientBehaviour.js"
import * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"

/** @internal  */
export function fromFunctionEffect<Msg extends Message.Message.Any, R>(
  handler: (
    entityId: string,
    message: Msg
  ) => Effect.Effect<MessageState.MessageState<Message.Message.Exit<Msg>>, never, R>
): RecipientBehaviour.RecipientBehaviour<Msg, R> {
  return Effect.flatMap(RecipientBehaviourContext.entityId, (entityId) =>
    pipe(
      Effect.context<R>(),
      Effect.map((context) => (message: Msg) =>
        pipe(
          handler(entityId, message),
          Effect.provide(context)
        )
      )
    ))
}

/** @internal  */
export function fromFunctionEffectStateful<S, R, Msg extends Message.Message.Any, R2>(
  initialState: (entityId: string) => Effect.Effect<S, never, R>,
  handler: (
    entityId: string,
    message: Msg,
    stateRef: Ref.Ref<S>
  ) => Effect.Effect<MessageState.MessageState<Message.Message.Exit<Msg>>, never, R2>
): RecipientBehaviour.RecipientBehaviour<Msg, R | R2> {
  return Effect.flatMap(RecipientBehaviourContext.entityId, (entityId) =>
    pipe(
      initialState(entityId),
      Effect.flatMap(Ref.make),
      Effect.flatMap((stateRef) =>
        pipe(
          Effect.context<R2>(),
          Effect.map((context) => (message: Msg) =>
            pipe(
              handler(entityId, message, stateRef),
              Effect.provide(context)
            )
          )
        )
      )
    ))
}

/** @internal */
export function fromInMemoryQueue<Msg extends Message.Message.Any, R>(
  handler: (
    entityId: string,
    dequeue: Queue.Dequeue<Msg | PoisonPill.PoisonPill>,
    processed: <A extends Msg>(
      message: A,
      value: Option.Option<Message.Message.Exit<A>>
    ) => Effect.Effect<void>
  ) => Effect.Effect<void, never, R>
): RecipientBehaviour.RecipientBehaviour<Msg, R> {
  return Effect.gen(function*() {
    const entityId = yield* RecipientBehaviourContext.entityId
    const messageStates = yield* Ref.make(HashMap.empty<string, MessageState.MessageState<any>>())

    function updateMessageState(message: Msg, state: MessageState.MessageState<any>) {
      return pipe(Ref.update(messageStates, HashMap.set(PrimaryKey.value(message), state)), Effect.as(state))
    }

    function getMessageState(message: Msg) {
      return pipe(
        Ref.get(messageStates),
        Effect.map(HashMap.get(PrimaryKey.value(message)))
      )
    }

    function reply<A extends Msg>(message: A, reply: Option.Option<Message.Message.Exit<A>>) {
      return updateMessageState(message, MessageState.Processed(reply))
    }

    return yield* pipe(
      Deferred.make<boolean>(),
      Effect.flatMap((shutdownCompleted) =>
        pipe(
          Effect.acquireRelease(
            Queue.unbounded<Msg | PoisonPill.PoisonPill>(),
            (queue) =>
              pipe(
                PoisonPill.make,
                Effect.flatMap((msg) => Queue.offer(queue, msg)),
                Effect.zipLeft(Deferred.await(shutdownCompleted)),
                Effect.uninterruptible
              )
          ),
          Effect.tap((queue) =>
            pipe(
              Effect.logDebug("Behaviour started."),
              Effect.zipRight(handler(entityId, queue, reply)),
              Effect.ensuring(Deferred.succeed(shutdownCompleted, true)),
              Effect.zipRight(Effect.logDebug("Behaviour exited.")),
              Effect.annotateLogs("entityId", entityId),
              Effect.forkDaemon
            )
          ),
          Effect.map((queue) => (message: Msg) => {
            return pipe(
              getMessageState(message),
              Effect.flatMap(Option.match({
                onNone: () =>
                  pipe(
                    Queue.offer(queue, message),
                    Effect.zipRight(updateMessageState(message, MessageState.Acknowledged))
                  ),
                onSome: (state) => Effect.succeed(state)
              }))
            )
          }),
          Effect.annotateLogs("entityId", entityId)
        )
      )
    )
  })
}
