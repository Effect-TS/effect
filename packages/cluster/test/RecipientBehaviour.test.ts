import * as Message from "@effect/cluster/Message"
import * as PoisonPill from "@effect/cluster/PoisonPill"
import * as RecipientAddress from "@effect/cluster/RecipientAddress"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as RecipientBehaviourContext from "@effect/cluster/RecipientBehaviourContext"
import * as RecipientType from "@effect/cluster/RecipientType"
import * as ShardId from "@effect/cluster/ShardId"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import { pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { describe, expect, it } from "vitest"

class Sample extends Message.TaggedMessage<Sample>()("Sample", Schema.Never, Schema.Number, {
  id: Schema.String
}, (_) => _.id) {
}

describe.concurrent("RecipientBehaviour", () => {
  const withTestEnv = <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(fa, Effect.scoped, Logger.withMinimumLogLevel(LogLevel.Info))

  const makeTestActor = <Msg, R>(
    fa: RecipientBehaviour.RecipientBehaviour<Msg, R>,
    scope: Scope.Scope
  ) =>
    pipe(
      fa,
      Effect.provideService(
        RecipientBehaviourContext.RecipientBehaviourContext,
        RecipientBehaviourContext.make({
          recipientAddress: RecipientAddress.makeRecipientAddress("Entity", "entity1"),
          forkShutdown: Effect.void,
          shardId: ShardId.make(1),
          recipientType: RecipientType.makeEntityType("Sample", Sample) as any
        })
      ),
      Scope.extend(scope)
    )

  it("Handles a whole queue of messages", () => {
    return Effect.gen(function*(_) {
      const received = yield* _(Deferred.make<boolean>())

      const behaviour = RecipientBehaviour.fromInMemoryQueue<Sample, never>(
        (entityId, dequeue) =>
          pipe(
            Queue.take(dequeue),
            Effect.flatMap(() => Deferred.succeed(received, true))
          )
      )

      const scope = yield* _(Scope.make())
      const offer = yield* _(makeTestActor(behaviour, scope))
      const msg = new Sample({ id: "1" })
      yield* _(offer(msg))
      yield* _(Scope.close(scope, Exit.interrupt(FiberId.none)))

      expect(yield* _(Deferred.await(received))).toBe(true)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Ensure cleanup is run upon closing the scope", () => {
    let interrupted = false
    return Effect.gen(function*(_) {
      const started = yield* _(Deferred.make<boolean>())

      const behaviour = RecipientBehaviour.fromInMemoryQueue<Sample, never>(
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
      const msg = new Sample({ id: "1" })
      yield* _(offer(msg))
      yield* _(Deferred.await(started))
      yield* _(Scope.close(scope, Exit.interrupt(FiberId.none)))
    }).pipe(withTestEnv, Effect.runPromise).then(() => expect(interrupted).toBe(true))
  })
})
