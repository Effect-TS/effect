import * as Message from "@effect/cluster/Message"
import * as MessageState from "@effect/cluster/MessageState"
import * as Pods from "@effect/cluster/Pods"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import * as PoisonPill from "@effect/cluster/PoisonPill"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as RecipientType from "@effect/cluster/RecipientType"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardingException from "@effect/cluster/ShardingException"
import * as ShardManagerClient from "@effect/cluster/ShardManagerClient"
import * as Storage from "@effect/cluster/Storage"
import { describe, expect, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"

interface SampleService {
  value: number
}

const SampleService = Context.GenericTag<SampleService>("@services/SampleService")

class SampleMessage extends Message.TaggedMessage<SampleMessage>()("SampleMessage", Schema.Never, Schema.Void, {
  id: Schema.String,
  value: Schema.Number
}, (_) => _.id) {
}

class SampleMessageWithResult extends Message.TaggedMessage<SampleMessageWithResult>()(
  "SampleMessageWithResult",
  Schema.Never,
  Schema.Number,
  {
    id: Schema.String,
    value: Schema.Number
  },
  (_) => _.id
) {
}

class FailableMessageWithResult extends Message.TaggedMessage<FailableMessageWithResult>()(
  "FailableMessageWithResult",
  Schema.String,
  Schema.Number,
  {
    id: Schema.String,
    value: Schema.Number
  },
  (_) => _.id
) {
}

type SampleEntity = SampleMessage | SampleMessageWithResult | FailableMessageWithResult

const SampleEntity = RecipientType.makeEntityType(
  "Sample",
  Schema.Union(SampleMessage, SampleMessageWithResult, FailableMessageWithResult)
)

describe.concurrent("SampleTests", () => {
  const inMemorySharding = pipe(
    Sharding.live,
    Layer.provide(PodsHealth.local),
    Layer.provide(Pods.noop),
    Layer.provide(Storage.memory),
    Layer.provide(Serialization.json),
    Layer.provide(ShardManagerClient.local),
    Layer.provide(
      ShardingConfig.withDefaults({
        entityTerminationTimeout: Duration.millis(4000)
      })
    )
  )

  const withTestEnv = <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(fa, Effect.provide(inMemorySharding), Effect.scoped, Logger.withMinimumLogLevel(LogLevel.Info))

  it("Succefully delivers a message", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const received = yield* _(Ref.make(false))

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromFunctionEffect(() =>
            pipe(Ref.set(received, true), Effect.as(MessageState.Acknowledged))
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new SampleMessage({ id: "a", value: 42 })
      yield* _(messenger.sendDiscard("entity1")(msg))

      expect(yield* _(Ref.get(received))).toBe(true)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Fails with if entity not registered", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new SampleMessage({ id: "a", value: 42 })
      const exit = yield* _(messenger.sendDiscard("entity1")(msg).pipe(Effect.exit))

      expect(Exit.isFailure(exit)).toBe(true)

      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause)
        expect(Option.isSome(error)).toBe(true)
        if (Option.isSome(error)) {
          expect(ShardingException.isEntityTypeNotRegisteredException(error.value)).toBe(true)
        }
      }
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Succefully delivers a message to the correct entity", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const result1 = yield* _(Ref.make(0))
      const result2 = yield* _(Ref.make(0))

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromFunctionEffect((entityId, msg) =>
            pipe(
              Ref.set(entityId === "entity1" ? result1 : result2, msg.value),
              Effect.as(MessageState.Acknowledged)
            )
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))

      const msg1 = new SampleMessage({ id: "a", value: 1 })
      yield* _(messenger.sendDiscard("entity1")(msg1))

      const msg2 = new SampleMessage({ id: "b", value: 2 })
      yield* _(messenger.sendDiscard("entity2")(msg2))

      expect(yield* _(Ref.get(result1))).toBe(1)
      expect(yield* _(Ref.get(result2))).toBe(2)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Succefully delivers a message with a reply to an entity", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Processed(Exit.succeed(42))))
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new SampleMessageWithResult({ id: "a", value: 42 })
      const result = yield* _(messenger.send("entity1")(msg))

      expect(result).toEqual(42)
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Succefully delivers a message with a failure reply to an entity", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromFunctionEffect((_, msg) =>
            msg._tag === "FailableMessageWithResult"
              ? Effect.succeed(MessageState.Processed(Exit.fail("custom-error")))
              : Effect.succeed(MessageState.Processed(Exit.void))
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new FailableMessageWithResult({ id: "a", value: 42 })
      const result = yield* _(messenger.send("entity1")(msg), Effect.exit)

      expect(result).toEqual(Exit.fail("custom-error"))
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Succefully broadcasts a message", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      class GetIncrement extends Schema.TaggedRequest<GetIncrement>()("GetIncrement", {
        failure: Schema.Never,
        success: Schema.Number,
        payload: {
          id: Schema.String
        }
      }) {
        [PrimaryKey.symbol]() {
          return this.id
        }
      }

      class BroadcastIncrement extends Schema.TaggedRequest<BroadcastIncrement>()("BroadcastIncrement", {
        failure: Schema.Never,
        success: Schema.Void,
        payload: {
          id: Schema.String
        }
      }) {
        [PrimaryKey.symbol]() {
          return this.id
        }
      }

      const SampleProtocol = Schema.Union(
        BroadcastIncrement,
        GetIncrement
      )

      const SampleTopic = RecipientType.makeTopicType("Sample", SampleProtocol)

      const ref = yield* _(Ref.make(0))

      yield* _(
        Sharding.registerTopic(
          SampleTopic
        )(
          RecipientBehaviour.fromFunctionEffect((entityId, msg) => {
            switch (msg._tag) {
              case "BroadcastIncrement":
                return pipe(Ref.update(ref, (_) => _ + 1), Effect.as(MessageState.Acknowledged))
              case "GetIncrement":
                return pipe(Ref.get(ref), Effect.map((_) => MessageState.Processed(Exit.succeed(_))))
            }
          })
        )
      )

      const broadcaster = yield* _(Sharding.broadcaster(SampleTopic))

      const msg1 = new BroadcastIncrement({ id: "a" })
      yield* _(broadcaster.broadcastDiscard("c1")(msg1))

      yield* _(Effect.sleep(Duration.seconds(2)))

      const msg2 = new GetIncrement({ id: "b" })
      const c1 = yield* _(broadcaster.broadcast("c1")(msg2))

      expect(HashMap.size(c1)).toBe(1) // Here we have just one pod, so there will be just one incrementer
    }).pipe(withTestEnv, Effect.runPromise)
  })

  it("Behaviour is interrupted if shard is terminated", () => {
    let entityInterrupted = false

    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const entityStarted = yield* _(Deferred.make<boolean>())

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromInMemoryQueue((entityId, dequeue) =>
            pipe(
              Queue.take(dequeue),
              Effect.flatMap((msg) => {
                if (PoisonPill.isPoisonPill(msg)) {
                  return pipe(
                    Effect.sync(() => {
                      entityInterrupted = true
                    }),
                    Effect.zipRight(Effect.interrupt)
                  )
                }
                return Deferred.succeed(entityStarted, true)
              }),
              Effect.forever
            )
          ),
          { entityMaxIdleTime: Option.some(Duration.minutes(10)) }
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))

      const msg1 = new SampleMessage({ id: "a", value: 1 })
      yield* _(messenger.sendDiscard("entity1")(msg1))
      yield* _(Deferred.await(entityStarted))
    }).pipe(withTestEnv, Effect.runPromise).then(() => expect(entityInterrupted).toBe(true))
  })

  it("Ensure graceful shutdown is completed if shard is terminated", () => {
    let shutdownCompleted = false

    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const entityStarted = yield* _(Deferred.make<boolean>())

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromInMemoryQueue((entityId, dequeue) =>
            pipe(
              Queue.take(dequeue),
              Effect.flatMap((msg) => {
                if (PoisonPill.isPoisonPill(msg)) {
                  return pipe(
                    Effect.sleep(Duration.seconds(3)),
                    Effect.zipRight(Effect.logDebug("Shutting down...")),
                    Effect.zipRight(
                      Effect.sync(() => {
                        shutdownCompleted = true
                      })
                    ),
                    Effect.flatMap(() => Effect.interrupt)
                  )
                }
                return Deferred.succeed(entityStarted, true)
              }),
              Effect.forever
            )
          ),
          { entityMaxIdleTime: Option.some(Duration.minutes(10)) }
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))

      const msg1 = new SampleMessage({ id: "a", value: 1 })
      yield* _(messenger.sendDiscard("entity1")(msg1))

      yield* _(Deferred.await(entityStarted))
    }).pipe(withTestEnv, Effect.runPromise).then(() => expect(shutdownCompleted).toBe(true))
  })

  it("Ensure graceful shutdown is completed if entity terminates, and then shard is terminated too", () => {
    let shutdownCompleted = false

    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const shutdownReceived = yield* _(Deferred.make<boolean>())
      const entityStarted = yield* _(Deferred.make<boolean>())

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromInMemoryQueue((entityId, dequeue) =>
            pipe(
              Queue.take(dequeue),
              Effect.flatMap((msg) => {
                if (PoisonPill.isPoisonPill(msg)) {
                  return pipe(
                    Deferred.succeed(shutdownReceived, true),
                    Effect.zipRight(Effect.logDebug("PoisonPill received")),
                    Effect.zipRight(Effect.sleep(Duration.seconds(3))),
                    Effect.zipRight(Effect.sync(() => {
                      shutdownCompleted = true
                    })),
                    Effect.flatMap(() => Effect.interrupt)
                  )
                }

                return pipe(
                  Deferred.succeed(entityStarted, true),
                  Effect.zipRight(Effect.logDebug("Entity Started"))
                )
              }),
              Effect.forever
            )
          ),
          { entityMaxIdleTime: Option.some(Duration.millis(100)) }
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))

      const msg1 = new SampleMessage({ id: "a", value: 1 })
      yield* _(messenger.sendDiscard("entity1")(msg1))

      yield* _(Deferred.await(entityStarted))
      yield* _(Deferred.await(shutdownReceived))
    }).pipe(withTestEnv, Effect.runPromise).then(() => expect(shutdownCompleted).toBe(true))
  })

  it("Singletons should start", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const received = yield* _(Deferred.make<boolean>())

      yield* _(
        Sharding.registerSingleton(
          "sample",
          Deferred.succeed(received, true)
        )
      )

      expect(yield* _(Deferred.await(received))).toBe(true)
    }).pipe(
      Effect.provide(inMemorySharding),
      Effect.scoped,
      Effect.runPromise
    )
  })

  it("Singletons should be interrupted upon sharding stop", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)
      const received = yield* _(Deferred.make<boolean>())

      yield* _(
        Sharding.registerSingleton(
          "sample",
          pipe(
            Deferred.succeed(received, true),
            Effect.zipRight(Effect.never)
          )
        )
      )

      expect(yield* _(Deferred.await(received))).toBe(true)
    }).pipe(
      Effect.provide(inMemorySharding),
      Effect.scoped,
      Effect.runPromise
    )
  })

  it("Upon entity termination, pending replies should get errored", () => {
    return Effect.gen(function*(_) {
      const requestReceived = yield* _(Deferred.make<boolean>())
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          RecipientBehaviour.fromInMemoryQueue((entityId, dequeue) =>
            pipe(
              PoisonPill.takeOrInterrupt(dequeue),
              Effect.flatMap(() => {
                // ignored reply as part of test case
                return pipe(
                  Deferred.succeed(requestReceived, true),
                  Effect.zipRight(Effect.logDebug("Request received, ignoring reply as part of test case..."))
                )
              }),
              Effect.forever
            )
          ),
          { entityMaxIdleTime: Option.some(Duration.millis(100)) }
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))

      const msg = new SampleMessageWithResult({ id: "a", value: 42 })
      const replyFiber = yield* _(
        messenger.send("entity1")(msg),
        Effect.timeoutFail({
          onTimeout: () => "timeout",
          duration: Duration.millis(1000)
        }),
        Effect.fork
      )

      yield* _(Deferred.await(requestReceived))
      yield* _(Sharding.unregister)

      const exit = yield* _(Fiber.await(replyFiber))
      const expectedExit = Exit.fail("timeout")

      expect(Exit.isFailure(exit)).toBe(true)
      expect(exit.toString() === expectedExit.toString()).toBe(true)
    }).pipe(withTestEnv, Effect.runPromise)
  })
})
