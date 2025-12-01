import { FetchHttpClient } from "@effect/platform"
import { Rpc, RpcClient, RpcGroup, RpcSchema, RpcSerialization } from "@effect/rpc"
import { FastifyRpcServer } from "@effect/rpc-fastify"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Chunk, Effect, Layer, Schema, Stream } from "effect"
import Fastify from "fastify"

// Define test schema
class TestUser extends Schema.Class<TestUser>("TestUser")({
  id: Schema.String,
  name: Schema.String
}) {}

class TestRpcs extends RpcGroup.make(
  Rpc.make("GetUser", {
    success: TestUser,
    payload: { id: Schema.String }
  }),
  Rpc.make("CreateUser", {
    success: TestUser,
    payload: { name: Schema.String }
  })
) {}

// Streaming RPC schema
class StreamingRpcs extends RpcGroup.make(
  Rpc.make("StreamUsers", {
    success: RpcSchema.Stream({
      success: TestUser,
      failure: Schema.Never
    }),
    payload: { count: Schema.Number }
  })
) {}

// Helper to create a test layer with server
const makeTestLayer = <Rpcs extends Rpc.Any>(
  group: RpcGroup.RpcGroup<Rpcs>,
  handlersLayer: Layer.Layer<Rpc.ToHandler<Rpcs>>
) =>
  Layer.unwrapScoped(
    Effect.gen(function*() {
      const fastify = Fastify()

      const { dispose } = FastifyRpcServer.register(fastify, group, {
        path: "/rpc",
        layer: Layer.mergeAll(handlersLayer, RpcSerialization.layerNdjson)
      })

      yield* Effect.acquireRelease(
        Effect.promise(() => fastify.listen({ port: 0 })),
        () =>
          Effect.promise(async () => {
            await dispose()
            await fastify.close()
          })
      )

      const address = fastify.server.address()
      const port = typeof address === "object" && address ? address.port : 0

      return RpcClient.layerProtocolHttp({
        url: `http://localhost:${port}/rpc`
      }).pipe(
        Layer.provide(FetchHttpClient.layer),
        Layer.provide(RpcSerialization.layerNdjson)
      )
    })
  )

describe("FastifyRpcServer", { sequential: true }, () => {
  it.scoped("should handle RPC requests", () => {
    const users = new Map<string, TestUser>()

    const layer = makeTestLayer(
      TestRpcs,
      TestRpcs.toLayer(
        Effect.sync(() => ({
          GetUser: ({ id }) =>
            Effect.sync(() => {
              const user = users.get(id)
              if (!user) throw new Error("User not found")
              return user
            }),
          CreateUser: ({ name }) =>
            Effect.sync(() => {
              const id = crypto.randomUUID()
              const user = new TestUser({ id, name })
              users.set(id, user)
              return user
            })
        }))
      )
    )

    return Effect.gen(function*() {
      const client = yield* RpcClient.make(TestRpcs)

      // Create a user
      const created = yield* client.CreateUser({ name: "Alice" })
      assert.strictEqual(created.name, "Alice")

      // Get the user
      const retrieved = yield* client.GetUser({ id: created.id })
      assert.strictEqual(retrieved.id, created.id)
      assert.strictEqual(retrieved.name, "Alice")
    }).pipe(Effect.provide(layer))
  })

  it.scoped("should handle defects gracefully", () => {
    const layer = makeTestLayer(
      TestRpcs,
      TestRpcs.toLayer(
        Effect.sync(() => ({
          GetUser: () => Effect.die(new Error("User service unavailable")),
          CreateUser: () => Effect.die(new Error("Create not allowed"))
        }))
      )
    )

    return Effect.gen(function*() {
      const client = yield* RpcClient.make(TestRpcs)

      // This should fail with a defect
      const cause = yield* client.GetUser({ id: "123" }).pipe(
        Effect.sandbox,
        Effect.flip
      )

      // The cause should be a Die with the error
      assert.isTrue(Cause.isDie(cause))
    }).pipe(Effect.provide(layer))
  })

  it.scoped("should handle streaming RPC", () => {
    const layer = makeTestLayer(
      StreamingRpcs,
      StreamingRpcs.toLayer(
        Effect.sync(() => ({
          StreamUsers: ({ count }) =>
            Stream.fromIterable(
              Array.from({ length: count }, (_, i) => new TestUser({ id: String(i + 1), name: `User ${i + 1}` }))
            )
        }))
      )
    )

    return Effect.gen(function*() {
      const client = yield* RpcClient.make(StreamingRpcs)

      // Stream 5 users
      const usersChunk = yield* client.StreamUsers({ count: 5 }).pipe(
        Stream.runCollect
      )
      const users = Chunk.toReadonlyArray(usersChunk)

      assert.strictEqual(users.length, 5)
      assert.strictEqual(users[0].name, "User 1")
      assert.strictEqual(users[4].name, "User 5")
    }).pipe(Effect.provide(layer))
  })

  it.scoped("should work with toFastifyHandlerEffect", () => {
    const users = new Map<string, TestUser>()

    const handlersLayer = TestRpcs.toLayer(
      Effect.sync(() => ({
        GetUser: ({ id }) =>
          Effect.sync(() => {
            const user = users.get(id)
            if (!user) throw new Error("User not found")
            return user
          }),
        CreateUser: ({ name }) =>
          Effect.sync(() => {
            const id = crypto.randomUUID()
            const user = new TestUser({ id, name })
            users.set(id, user)
            return user
          })
      }))
    )

    const serverLayer = Layer.unwrapScoped(
      Effect.gen(function*() {
        const handler = yield* FastifyRpcServer.toFastifyHandlerEffect(TestRpcs)

        const fastify = Fastify()
        fastify.removeAllContentTypeParsers()
        fastify.addContentTypeParser("*", (_req, _payload, done) => {
          done(null)
        })
        fastify.post("/rpc", handler)

        yield* Effect.acquireRelease(
          Effect.promise(() => fastify.listen({ port: 0 })),
          () => Effect.promise(() => fastify.close())
        )

        const address = fastify.server.address()
        const port = typeof address === "object" && address ? address.port : 0

        return RpcClient.layerProtocolHttp({
          url: `http://localhost:${port}/rpc`
        }).pipe(
          Layer.provide(FetchHttpClient.layer),
          Layer.provide(RpcSerialization.layerNdjson)
        )
      }).pipe(Effect.provide(Layer.mergeAll(handlersLayer, RpcSerialization.layerNdjson)))
    )

    return Effect.gen(function*() {
      const client = yield* RpcClient.make(TestRpcs)

      // Create a user
      const created = yield* client.CreateUser({ name: "Bob" })
      assert.strictEqual(created.name, "Bob")

      // Get the user
      const retrieved = yield* client.GetUser({ id: created.id })
      assert.strictEqual(retrieved.id, created.id)
      assert.strictEqual(retrieved.name, "Bob")
    }).pipe(Effect.provide(serverLayer))
  })

  it.scoped("should work with registerEffect", () => {
    const users = new Map<string, TestUser>()

    const handlersLayer = TestRpcs.toLayer(
      Effect.sync(() => ({
        GetUser: ({ id }) =>
          Effect.sync(() => {
            const user = users.get(id)
            if (!user) throw new Error("User not found")
            return user
          }),
        CreateUser: ({ name }) =>
          Effect.sync(() => {
            const id = crypto.randomUUID()
            const user = new TestUser({ id, name })
            users.set(id, user)
            return user
          })
      }))
    )

    const serverLayer = Layer.unwrapScoped(
      Effect.gen(function*() {
        const fastify = Fastify()

        yield* FastifyRpcServer.registerEffect(fastify, TestRpcs, {
          path: "/rpc"
        })

        yield* Effect.acquireRelease(
          Effect.promise(() => fastify.listen({ port: 0 })),
          () => Effect.promise(() => fastify.close())
        )

        const address = fastify.server.address()
        const port = typeof address === "object" && address ? address.port : 0

        return RpcClient.layerProtocolHttp({
          url: `http://localhost:${port}/rpc`
        }).pipe(
          Layer.provide(FetchHttpClient.layer),
          Layer.provide(RpcSerialization.layerNdjson)
        )
      }).pipe(Effect.provide(Layer.mergeAll(handlersLayer, RpcSerialization.layerNdjson)))
    )

    return Effect.gen(function*() {
      const client = yield* RpcClient.make(TestRpcs)

      // Create a user
      const created = yield* client.CreateUser({ name: "Charlie" })
      assert.strictEqual(created.name, "Charlie")

      // Get the user
      const retrieved = yield* client.GetUser({ id: created.id })
      assert.strictEqual(retrieved.id, created.id)
      assert.strictEqual(retrieved.name, "Charlie")
    }).pipe(Effect.provide(serverLayer))
  })
})
