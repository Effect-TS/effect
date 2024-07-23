import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import type { Envelope } from "../Envelope.js"
import * as MessageState from "../MessageState.js"
import * as PoisonPill from "../PoisonPill.js"
import type * as RecipientBehaviour from "../RecipientBehaviour.js"
import * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"

/** @internal  */
export function fromFunctionEffect<Msg extends Schema.TaggedRequest.Any, R>(
  handler: <A extends Msg>(
    entityId: string,
    envelope: Envelope<A>
  ) => Effect.Effect<
    MessageState.MessageState<
      Exit.Exit<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Error<Msg>
      >
    >,
    never,
    R
  >
): RecipientBehaviour.RecipientBehaviour<Msg, R> {
  return Effect.flatMap(RecipientBehaviourContext.entityId, (entityId) =>
    pipe(
      Effect.context<R>(),
      Effect.map((context) => (message) =>
        pipe(
          handler(entityId, message),
          Effect.provide(context)
        )
      )
    ))
}

/** @internal  */
export function fromFunctionEffectStateful<S, R, Msg extends Schema.TaggedRequest.Any, R2>(
  initialState: (entityId: string) => Effect.Effect<S, never, R>,
  handler: <A extends Msg>(
    entityId: string,
    envelope: Envelope<A>,
    stateRef: Ref.Ref<S>
  ) => Effect.Effect<
    MessageState.MessageState<
      Exit.Exit<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Error<Msg>
      >
    >,
    never,
    R2
  >
): RecipientBehaviour.RecipientBehaviour<Msg, R | R2> {
  return Effect.flatMap(RecipientBehaviourContext.entityId, (entityId) =>
    pipe(
      initialState(entityId),
      Effect.flatMap(Ref.make),
      Effect.flatMap((stateRef) =>
        pipe(
          Effect.context<R2>(),
          Effect.map((context) => <A extends Msg>(message: Envelope<A>) =>
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
export function fromInMemoryQueue<Msg extends Schema.TaggedRequest.Any, R>(
  handler: (
    entityId: string,
    dequeue: Queue.Dequeue<Envelope<Msg> | PoisonPill.PoisonPill>,
    processed: <A extends Msg>(
      envelope: Envelope<A>,
      value: Option.Option<
        Exit.Exit<
          Serializable.WithResult.Success<Msg>,
          Serializable.WithResult.Error<Msg>
        >
      >
    ) => Effect.Effect<void>
  ) => Effect.Effect<void, never, R>
): RecipientBehaviour.RecipientBehaviour<Msg, R> {
  return Effect.gen(function*(_) {
    const entityId = yield* _(RecipientBehaviourContext.entityId)
    const envelopeStates = yield* _(Ref.make(HashMap.empty<string, MessageState.MessageState<any>>()))

    function updateEnvelopeState<A extends Msg>(envelope: Envelope<A>, state: MessageState.MessageState<any>) {
      return pipe(Ref.update(envelopeStates, HashMap.set(envelope.messageId, state)), Effect.as(state))
    }

    function getMessageState<A extends Msg>(envelope: Envelope<A>) {
      return pipe(
        Ref.get(envelopeStates),
        Effect.map(HashMap.get(envelope.messageId))
      )
    }

    function reply<A extends Msg>(
      message: Envelope<A>,
      reply: Option.Option<
        Exit.Exit<
          Serializable.WithResult.Success<Msg>,
          Serializable.WithResult.Error<Msg>
        >
      >
    ) {
      return updateEnvelopeState(message, MessageState.Processed(reply))
    }

    return yield* _(pipe(
      Deferred.make<boolean>(),
      Effect.flatMap((shutdownCompleted) =>
        pipe(
          Effect.acquireRelease(
            Queue.unbounded<Envelope<Msg> | PoisonPill.PoisonPill>(),
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
          Effect.map((queue) => <A extends Msg>(envelope: Envelope<A>) => {
            return pipe(
              getMessageState(envelope),
              Effect.flatMap(Option.match({
                onNone: () =>
                  pipe(
                    Queue.offer(queue, envelope as any),
                    Effect.zipRight(updateEnvelopeState(envelope, MessageState.Acknowledged))
                  ),
                onSome: (state) => Effect.succeed(state)
              }))
            )
          }),
          Effect.annotateLogs("entityId", entityId)
        )
      )
    ))
  })
}
