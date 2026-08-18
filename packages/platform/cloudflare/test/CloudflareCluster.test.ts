import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schema, Stream } from "effect"
import { Entity } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"

const User = Entity.make("User", [
  Rpc.make("Ping", { success: Schema.String })
])

const Counter = Entity.make("Counter", [
  Rpc.make("Increment")
])

const Events = Entity.make("Events", [
  Rpc.make("Numbers", { success: RpcSchema.Stream(Schema.Number, Schema.Never) })
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
