import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import {
  CurrentEntityName,
  CurrentReplyRegistry,
  makeReplyRegistry
} from "@effect/platform-cloudflare/internal/entityReply"
import { assert, describe, it } from "@effect/vitest"
import { DateTime, Effect, Exit, Fiber, Layer, PrimaryKey, Schema, Stream } from "effect"
import { ClusterSchema, DeliverAt, Entity, EntityProxy, EntityProxyServer, Sharding } from "effect/cluster"
import { Rpc, RpcSchema, RpcTest } from "effect/rpc"

const User = Entity.make("User", [
  Rpc.make("Ping", { success: Schema.String })
])

const PersistedUser = Entity.make("PersistedUser", [
  Rpc.make("Ping", { success: Schema.String }).annotate(ClusterSchema.Persisted, true)
])

const Counter = Entity.make("Counter", [
  Rpc.make("Increment")
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
    it.effect("routes generated entity proxy handlers through the encoded Durable Object name", () => {
      const stub = {
        invoke(envelopeText: string) {
          const envelope = JSON.parse(envelopeText)
          return Promise.resolve({
            _tag: "Success",
            requestId: envelope.requestId,
            replies: [JSON.stringify({
              _tag: "WithExit",
              requestId: envelope.requestId,
              id: "proxy-reply",
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
      const proxy = EntityProxy.toRpcGroup(User)

      return Effect.gen(function*() {
        const client = yield* RpcTest.makeClient(proxy)
        const result = yield* client["User.Ping"]({ entityId: "proxy:id", payload: undefined })

        assert.strictEqual(result, "pong")
        assert.deepStrictEqual(entityNamespace.names, ["4:Userproxy:id"])
      }).pipe(
        Effect.provide(EntityProxyServer.layerRpcHandlers(User)),
        Effect.provide(CloudflareCluster.layer(options))
      )
    })

    it.effect("uses uuidv7 request ids and decodes replies from the entity Durable Object", () => {
      const envelopes: Array<any> = []
      const stub = {
        invoke(envelopeText: string) {
          const envelope = JSON.parse(envelopeText)
          envelopes.push(envelope)
          return Promise.resolve({
            _tag: "Success",
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

    it.effect("delivers a deduplicated delayed reply to every pinned caller", () => {
      const registry = makeReplyRegistry()
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
        const pinned = (effect: Effect.Effect<string, any>) =>
          effect.pipe(
            Effect.provideService(CurrentEntityName, "6:Callerone"),
            Effect.provideService(CurrentReplyRegistry, registry)
          )
        const first = yield* Effect.forkChild(pinned(client.Ask(request)))
        const second = yield* Effect.forkChild(pinned(client.Ask(request)))
        yield* Effect.promise(() => invoked)
        for (const resolve of pending) resolve({ _tag: "Success", requestId: storageRequestId, replies: [] })
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 0)))
        const delivered = registry.deliver(
          storageRequestId,
          JSON.stringify({
            _tag: "WithExit",
            requestId: storageRequestId,
            id: "terminal",
            exit: { _tag: "Success", value: "callback" }
          })
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
          return Promise.resolve({ _tag: "Success", requestId: "unused", replies: [] })
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
      const registry = makeReplyRegistry()
      const stub = {
        invoke() {
          return Promise.resolve({ _tag: "AskDeduplicatedToTell" as const })
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
          Effect.provideService(CurrentReplyRegistry, registry),
          Effect.exit
        )
        assert.isTrue(Exit.isFailure(exit))
        assert.isFalse(registry.deliver("original-tell", "unused"))
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
            _tag: "Success",
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
})
