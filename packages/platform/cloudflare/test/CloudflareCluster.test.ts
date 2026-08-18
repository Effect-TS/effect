import * as CloudflareCluster from "@effect/platform-cloudflare/CloudflareCluster"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schema } from "effect"
import { Entity } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"

const User = Entity.make("User", [
  Rpc.make("Ping", { success: Schema.String })
])

const Counter = Entity.make("Counter", [
  Rpc.make("Increment")
])

class FakeNamespace {
  readonly names: Array<string> = []

  getByName(name: string) {
    this.names.push(name)
    return { name }
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

    it.effect("fails on duplicate handler registration", () =>
      Effect.gen(function*() {
        const { options } = makeOptions()
        const handlers = User.toLayer({ Ping: () => Effect.succeed("pong") })
        const exit = yield* Layer.build(
          Layer.merge(handlers, User.toLayer({ Ping: () => Effect.succeed("pong2") })).pipe(
            Layer.provide(CloudflareCluster.layer(options))
          )
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(exit))
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
