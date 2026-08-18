import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { CurrentEntityName, deliverReply } from "@effect/platform-cloudflare/internal/entityReply"
import { assert, describe, it } from "@effect/vitest"
import { DateTime, Effect, Exit, Fiber, Layer, PrimaryKey, Schema, Stream } from "effect"
import { ClusterSchema, DeliverAt, Entity, Sharding, Singleton } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"

const User = Entity.make("User", [
  Rpc.make("Ping", { success: Schema.String })
])

const PersistedUser = Entity.make("PersistedUser", [
  Rpc.make("Ping", { success: Schema.String }).annotate(ClusterSchema.Persisted, true)
])

const Counter = Entity.make("Counter", [
  Rpc.make("Increment")
])

const Events = Entity.make("Events", [
  Rpc.make("Numbers", { success: RpcSchema.Stream(Schema.Number, Schema.Never) })
])

class ScheduledPayload extends Schema.Class<ScheduledPayload>("CloudflareScheduledPayload")({
  deliverAt: Schema.Number,
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }

  [DeliverAt.symbol]() {
    return DateTime.makeUnsafe(this.deliverAt)
  }
}

class UnkeyedScheduledPayload extends Schema.Class<UnkeyedScheduledPayload>("CloudflareUnkeyedScheduledPayload")({
  deliverAt: Schema.Number
}) {
  [DeliverAt.symbol]() {
    return DateTime.makeUnsafe(this.deliverAt)
  }
}

const Scheduled = Entity.make("Scheduled", [
  Rpc.make("Ask", { payload: ScheduledPayload, success: Schema.String }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Tell", { payload: ScheduledPayload }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Unkeyed", { payload: UnkeyedScheduledPayload, success: Schema.String }).annotate(
    ClusterSchema.Persisted,
    true
  ),
  Rpc.make("Stream", {
    payload: ScheduledPayload,
    success: RpcSchema.Stream(Schema.Number, Schema.Never)
  }).annotate(ClusterSchema.Persisted, true)
])

class FakeNamespace {
  readonly names: Array<string> = []
  constructor(readonly stub: object = {}) {}

  getByName(name: string) {
    this.names.push(name)
    return this.stub
  }
}

const makeOptions = () => {
  const entityNamespace = new FakeNamespace()
  const options: CloudflareCluster.LayerOptions = {
    entities: [User],
    entityNamespace: entityNamespace as any,
    workflowNamespace: new FakeNamespace() as any,
    queueNamespace: new FakeNamespace() as any,
    singletonNamespace: new FakeNamespace() as any
  }
  return { entityNamespace, options }
}

describe("CloudflareCluster", () => {
  describe("layer", () => {
    it.effect("registers singleton effects under named Durable Objects without running them forever", () => {
      const singletonNamespace = new FakeNamespace()
      const options: CloudflareCluster.LayerOptions = {
        entities: [User],
        entityNamespace: new FakeNamespace() as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: singletonNamespace as any
      }

      return Effect.gen(function*() {
        yield* Layer.build(
          Singleton.make("hourly", Effect.void).pipe(
            Layer.provide(CloudflareCluster.layer(options))
          )
        )
        assert.deepStrictEqual(singletonNamespace.names, ["Singleton/hourly"])
      })
    })

    it.effect("resolves entity clients through the namespace binding", () =>
      Effect.gen(function*() {
        const { entityNamespace, options } = makeOptions()
        const makeClient = yield* User.client.pipe(
          Effect.provide(CloudflareCluster.layer(options))
        )
        makeClient("42")
        assert.deepStrictEqual(entityNamespace.names, ["4:User42"])
      }))

    it.effect("uses uuidv7 request ids and decodes replies from the entity Durable Object", () => {
      const envelopes: Array<any> = []
      const stub = {
        invoke(envelopeText: string) {
          const envelope = JSON.parse(envelopeText)
          envelopes.push(envelope)
          return Promise.resolve({
            requestId: envelope.requestId,
            replies: [JSON.stringify({
              _tag: "WithExit",
              requestId: envelope.requestId,
              id: "reply-1",
              exit: { _tag: "Success", value: "pong" }
            })]
          })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const entityNamespace = new FakeNamespace(stub)
      const options: CloudflareCluster.LayerOptions = {
        entities: [User],
        entityNamespace: entityNamespace as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* User.client
        const result = yield* makeClient("42").Ping(void 0)
        assert.strictEqual(result, "pong")
        assert.match(envelopes[0].requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        assert.strictEqual(envelopes[0].address.entityType, "User")
        assert.strictEqual(envelopes[0].address.entityId, "42")
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("acknowledges each persisted stream chunk before requesting the next reply", () => {
      const acknowledgements: Array<string> = []
      let requestId = ""
      const reply = (value: object) => JSON.stringify({ requestId, ...value })
      const stub = {
        invoke(envelopeText: string) {
          requestId = JSON.parse(envelopeText).requestId
          return Promise.resolve({
            requestId,
            replies: [reply({ _tag: "Chunk", id: "chunk-0", sequence: 0, values: [1] })]
          })
        },
        acknowledge(_requestId: string, replyId: string) {
          acknowledgements.push(replyId)
          return Promise.resolve(
            acknowledgements.length === 1
              ? [reply({ _tag: "Chunk", id: "chunk-1", sequence: 1, values: [2] })]
              : [reply({ _tag: "WithExit", id: "terminal", exit: { _tag: "Success", value: null } })]
          )
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Events],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Events.client
        const values = yield* makeClient("one").Numbers(void 0).pipe(Stream.runCollect)

        assert.deepStrictEqual(Array.from(values), [1, 2])
        assert.deepStrictEqual(acknowledgements, ["chunk-0", "chunk-1"])
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("interrupts the Durable Object handler when the client request is interrupted", () => {
      let requestId = ""
      let resumeInvoked!: () => void
      const invoked = new Promise<void>((resolve) => {
        resumeInvoked = resolve
      })
      const interruptions: Array<ReadonlyArray<string | undefined>> = []
      const stub = {
        invoke(envelopeText: string) {
          requestId = JSON.parse(envelopeText).requestId
          resumeInvoked()
          return new Promise<never>(() => {})
        },
        acknowledge() {
          return Promise.resolve([])
        },
        interrupt(storageRequestId: string, clientRequestId?: string) {
          interruptions.push([storageRequestId, clientRequestId])
          return Promise.resolve()
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [User],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* User.client
        const fiber = yield* Effect.forkChild(makeClient("42").Ping(void 0))
        yield* Effect.promise(() => invoked)
        yield* Fiber.interrupt(fiber)

        assert.deepStrictEqual(interruptions, [[requestId, requestId]])
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("passes future DeliverAt metadata with a destination-scoped primary key", () => {
      const deliveries: Array<any> = []
      const stub = {
        invoke(envelopeText: string, discard: boolean, delivery: unknown) {
          const envelope = JSON.parse(envelopeText)
          deliveries.push({ discard, delivery })
          return Promise.resolve({
            requestId: envelope.requestId,
            replies: discard ? [] : [JSON.stringify({
              _tag: "WithExit",
              requestId: envelope.requestId,
              id: "terminal",
              exit: { _tag: "Success", value: "done" }
            })]
          })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const client = makeClient("one")
        const deliverAt = Date.now() + 60_000
        assert.strictEqual(yield* client.Ask({ deliverAt, id: "operation" }), "done")
        yield* client.Tell({ deliverAt, id: "tell" }, { discard: true })

        assert.deepStrictEqual(deliveries, [
          {
            discard: false,
            delivery: {
              deliverAt,
              primaryKey: "Scheduled/one/Ask/operation"
            }
          },
          {
            discard: true,
            delivery: {
              deliverAt,
              primaryKey: "Scheduled/one/Tell/tell"
            }
          }
        ])
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("keeps a Worker delayed ask open until the destination RPC returns", () => {
      let resolve!: (result: any) => void
      const response = new Promise<any>((resume) => {
        resolve = resume
      })
      let requestId = ""
      const stub = {
        invoke(envelopeText: string) {
          requestId = JSON.parse(envelopeText).requestId
          return response
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const fiber = yield* Effect.forkChild(makeClient("one").Ask({ deliverAt: Date.now() + 60_000, id: "worker" }))
        yield* Effect.yieldNow
        assert.isUndefined(fiber.pollUnsafe())
        resolve({
          requestId,
          replies: [JSON.stringify({
            _tag: "WithExit",
            requestId,
            id: "terminal",
            exit: { _tag: "Success", value: "done" }
          })]
        })
        assert.strictEqual(yield* Fiber.join(fiber), "done")
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("delivers a delayed reply back to a pinned caller entity", () => {
      const stub = {
        invoke(envelopeText: string, _discard: boolean, delivery: { readonly replyTo?: string }) {
          const envelope = JSON.parse(envelopeText)
          assert.strictEqual(delivery.replyTo, "6:Callerone")
          queueMicrotask(() => {
            void deliverReply(
              envelope.requestId,
              JSON.stringify({
                _tag: "WithExit",
                requestId: envelope.requestId,
                id: "terminal",
                exit: { _tag: "Success", value: "callback" }
              })
            )
          })
          return Promise.resolve({ requestId: envelope.requestId, replies: [] })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const result = yield* makeClient("one").Ask({ deliverAt: Date.now() + 60_000, id: "caller" }).pipe(
          Effect.provideService(CurrentEntityName, "6:Callerone")
        )
        assert.strictEqual(result, "callback")
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("delivers a deduplicated delayed reply to every pinned caller", () => {
      const pending: Array<(value: any) => void> = []
      let storageRequestId = ""
      let bothInvoked!: () => void
      const invoked = new Promise<void>((resolve) => {
        bothInvoked = resolve
      })
      const stub = {
        invoke(envelopeText: string, _discard: boolean, delivery: { readonly replyTo?: string }) {
          assert.strictEqual(delivery.replyTo, "6:Callerone")
          const envelope = JSON.parse(envelopeText)
          if (storageRequestId === "") storageRequestId = envelope.requestId
          return new Promise<any>((resolve) => {
            pending.push(resolve)
            if (pending.length === 2) bothInvoked()
          })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const client = makeClient("one")
        const request = { deliverAt: Date.now() + 60_000, id: "shared" }
        const first = yield* Effect.forkChild(
          client.Ask(request).pipe(Effect.provideService(CurrentEntityName, "6:Callerone"))
        )
        const second = yield* Effect.forkChild(
          client.Ask(request).pipe(Effect.provideService(CurrentEntityName, "6:Callerone"))
        )
        yield* Effect.promise(() => invoked)
        for (const resolve of pending) resolve({ requestId: storageRequestId, replies: [] })
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 0)))
        const delivered = yield* Effect.promise(() =>
          deliverReply(
            storageRequestId,
            JSON.stringify({
              _tag: "WithExit",
              requestId: storageRequestId,
              id: "terminal",
              exit: { _tag: "Success", value: "callback" }
            })
          )
        )

        assert.isTrue(delivered)
        assert.deepStrictEqual(yield* Fiber.join(first), "callback")
        assert.deepStrictEqual(yield* Fiber.join(second), "callback")
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("rejects unkeyed and streaming asks with a future DeliverAt", () => {
      let invoked = 0
      const stub = {
        invoke() {
          invoked++
          return Promise.resolve({ requestId: "unused", replies: [] })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const client = makeClient("one")
        const deliverAt = Date.now() + 60_000
        assert.isTrue(Exit.isFailure(yield* client.Unkeyed({ deliverAt }).pipe(Effect.exit)))
        assert.isTrue(
          Exit.isFailure(yield* client.Stream({ deliverAt, id: "stream" }).pipe(Stream.runDrain, Effect.exit))
        )
        assert.strictEqual(invoked, 0)
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("surfaces ask-to-tell deduplication as a persistence failure", () => {
      const stub = {
        invoke() {
          return Promise.resolve({
            requestId: "original-tell",
            replies: [],
            error: "AskDeduplicatedToTell" as const
          })
        },
        acknowledge() {
          return Promise.resolve([])
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [Scheduled],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* Scheduled.client
        const exit = yield* makeClient("one").Ask({ deliverAt: Date.now() + 60_000, id: "tell" }).pipe(
          Effect.provideService(CurrentEntityName, "6:Callerone"),
          Effect.exit
        )
        assert.isTrue(Exit.isFailure(exit))
        assert.isFalse(yield* Effect.promise(() => deliverReply("original-tell", "unused")))
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("does not retain reset targets for volatile requests", () => {
      let requestId = ""
      let resets = 0
      const stub = {
        invoke(envelopeText: string) {
          const envelope = JSON.parse(envelopeText)
          requestId = envelope.requestId
          return Promise.resolve({
            requestId,
            replies: [JSON.stringify({
              _tag: "WithExit",
              requestId,
              id: "terminal",
              exit: { _tag: "Success", value: "pong" }
            })]
          })
        },
        acknowledge() {
          return Promise.resolve([])
        },
        reset() {
          resets++
          return Promise.resolve()
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [User],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* User.client
        const sharding = yield* Sharding.Sharding
        yield* makeClient("42").Ping(void 0)
        const reset = yield* sharding.reset(requestId as any)

        assert.isFalse(reset)
        assert.strictEqual(resets, 0)
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("bounds retained reset targets for persisted requests", () => {
      const requestIds: Array<string> = []
      const resets: Array<string> = []
      const stub = {
        invoke(envelopeText: string) {
          const requestId = JSON.parse(envelopeText).requestId
          requestIds.push(requestId)
          return Promise.resolve({
            requestId,
            replies: [JSON.stringify({
              _tag: "WithExit",
              requestId,
              id: `terminal-${requestIds.length}`,
              exit: { _tag: "Success", value: "pong" }
            })]
          })
        },
        acknowledge() {
          return Promise.resolve([])
        },
        reset(requestId: string) {
          resets.push(requestId)
          return Promise.resolve()
        }
      }
      const options: CloudflareCluster.LayerOptions = {
        entities: [PersistedUser],
        entityNamespace: new FakeNamespace(stub) as any,
        workflowNamespace: new FakeNamespace() as any,
        queueNamespace: new FakeNamespace() as any,
        singletonNamespace: new FakeNamespace() as any
      }

      return Effect.gen(function*() {
        const makeClient = yield* PersistedUser.client
        const client = makeClient("42")
        const sharding = yield* Sharding.Sharding
        for (let index = 0; index < 4097; index++) {
          yield* client.Ping(void 0)
        }

        assert.isFalse(yield* sharding.reset(requestIds[0] as any))
        assert.isTrue(yield* sharding.reset(requestIds.at(-1)! as any))
        assert.deepStrictEqual(resets, [requestIds.at(-1)])
      }).pipe(Effect.provide(CloudflareCluster.layer(options)))
    })

    it.effect("fails for an entity type not bound at Worker init", () =>
      Effect.gen(function*() {
        const { entityNamespace, options } = makeOptions()
        const exit = yield* Counter.client.pipe(
          Effect.provide(CloudflareCluster.layer(options)),
          Effect.exit
        )
        assert.isTrue(Exit.isFailure(exit))
        assert.deepStrictEqual(entityNamespace.names, [])
      }))

    it.effect("registers entity handlers", () =>
      Effect.gen(function*() {
        const { options } = makeOptions()
        yield* Layer.build(
          User.toLayer({ Ping: () => Effect.succeed("pong") }).pipe(
            Layer.provide(CloudflareCluster.layer(options))
          )
        )
      }))

    it.effect("ignores duplicate handler registration", () =>
      Effect.gen(function*() {
        const { options } = makeOptions()
        const handlers = User.toLayer({ Ping: () => Effect.succeed("pong") })
        yield* Layer.build(
          Layer.merge(handlers, User.toLayer({ Ping: () => Effect.succeed("pong2") })).pipe(
            Layer.provide(CloudflareCluster.layer(options))
          )
        )
      }))

    it.effect("fails when registering an entity type not bound at Worker init", () =>
      Effect.gen(function*() {
        const { options } = makeOptions()
        const exit = yield* Layer.build(
          Counter.toLayer({ Increment: () => Effect.void }).pipe(
            Layer.provide(CloudflareCluster.layer(options))
          )
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(exit))
      }))
  })

  describe("makeRunnerAddress", () => {
    it("derives a synthetic runner address from the object name", () => {
      const address = CloudflareCluster.makeRunnerAddress("4:User42")
      assert.strictEqual(address.host, "4:User42")
      assert.strictEqual(address.port, 0)
    })
  })
})
