import * as Entity from "@effect/cluster/Entity"
import * as Envelope from "@effect/cluster/Envelope"
import * as PoisonPill from "@effect/cluster/PoisonPill"
import { RecipientAddress } from "@effect/cluster/RecipientAddress"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as RecipientBehaviourContext from "@effect/cluster/RecipientBehaviourContext"
import * as ShardId from "@effect/cluster/ShardId"
import * as Schema from "@effect/schema/Schema"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import { pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import { describe, expect, it } from "vitest"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()(
  "SampleMessage",
  Schema.Never,
  Schema.Number,
  { id: Schema.String }
) {
}

describe.concurrent("RecipientBehaviour", () => {
  const withTestEnv = <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(fa, Effect.scoped, Logger.withMinimumLogLevel(LogLevel.Info))

  const makeTestActor = <Msg extends Envelope.Envelope.AnyMessage, R>(
    fa: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    scope: Scope.Scope
  ) =>
    pipe(
      fa,
      Effect.provideService(
        RecipientBehaviourContext.RecipientBehaviourContext,
        RecipientBehaviourContext.make({
          address: new RecipientAddress({
            recipientType: "Entity",
            entityId: "entity1"
          }),
          forkShutdown: Effect.void,
          shardId: ShardId.make(1),
          entity: new Entity.Standard({
            name: "Sample",
            schema: SampleMessage,
            messageId: _ => _.id
          }) as any
        })
      ),
      Scope.extend(scope)
    )

  it("Handles a whole queue of messages", () => {
    return Effect.gen(function*(_) {
      const received = yield* _(Deferred.make<boolean>())

      const behaviour = RecipientBehaviour.fromInMemoryQueue<SampleMessage, never>(
        (entityId, dequeue) =>
          pipe(
            Queue.take(dequeue),
            Effect.flatMap(() => Deferred.succeed(received, true))
          )
      )

      const scope = yield* _(Scope.make())
      const offer = yield* _(makeTestActor(behaviour, scope))
      const msg = new SampleMessage({ id: "1" })
      yield* _(offer(Envelope.make(RecipientAddress.make({ entityId: "a", recipientType: "a" }), msg.id, msg)))
      yield* _(Scope.close(scope, Exit.interrupt(FiberId.none)))

      expect(yield* _(Deferred.await(received))).toBe(true)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Ensure cleanup is run upon closing the scope", () => {
    let interrupted = false
    return Effect.gen(function*(_) {
      const started = yield* _(Deferred.make<boolean>())

      const behaviour = RecipientBehaviour.fromInMemoryQueue<SampleMessage, never>(
        (entityId, dequeue) =>
          pipe(
            Queue.take(dequeue),
            Effect.flatMap((msg) => {
              if (PoisonPill.isPoisonPill(msg)) {
                interrupted = true
                return Effect.interrupt
              }
              return Deferred.succeed(started, true)
            }),
            Effect.forever
          )
      )

      const scope = yield* _(Scope.make())
      const offer = yield* _(makeTestActor(behaviour, scope))
      const msg = new SampleMessage({ id: "1" })
      yield* _(offer(Envelope.make(RecipientAddress.make({ entityId: "a", recipientType: "a" }), msg.id, msg)))
      yield* _(Deferred.await(started))
      yield* _(Scope.close(scope, Exit.interrupt(FiberId.none)))
    }).pipe(withTestEnv, Effect.runPromise).then(() => expect(interrupted).toBe(true))
  })
})
