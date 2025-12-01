import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc"
import { FastifyRpcServer } from "@effect/rpc-fastify"
import { Effect, Layer, Schema } from "effect"
import Fastify from "fastify"

// Define your RPC schema
class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String
}) {}

class UserRpcs extends RpcGroup.make(
  Rpc.make("GetUser", {
    success: User,
    payload: { id: Schema.String }
  }),
  Rpc.make("CreateUser", {
    success: User,
    payload: { name: Schema.String, email: Schema.String }
  }),
  Rpc.make("ListUsers", {
    success: Schema.Array(User)
  })
) {}

// Implement RPC handlers
const UsersLive = UserRpcs.toLayer(
  Effect.gen(function*() {
    // Simulated in-memory database
    const users = new Map<string, User>()

    return {
      GetUser: ({ id }) =>
        Effect.sync(() => {
          const user = users.get(id)
          if (!user) {
            throw new Error(`User ${id} not found`)
          }
          return user
        }),

      CreateUser: ({ email, name }) =>
        Effect.sync(() => {
          const id = crypto.randomUUID()
          const user = new User({ id, name, email })
          users.set(id, user)
          return user
        }),

      ListUsers: () => Effect.sync(() => Array.from(users.values()))
    }
  })
)

// Setup Fastify server
const fastify = Fastify({ logger: true })

// Register RPC handler (automatically configures content type parser for this route)
const { dispose } = FastifyRpcServer.register(fastify, UserRpcs, {
  path: "/rpc",
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

// Add health check (uses normal Fastify body parsing)
fastify.get("/health", async () => {
  return { status: "ok" }
})

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
    console.log("Server listening on http://localhost:3000")
    console.log("RPC endpoint: POST http://localhost:3000/rpc")
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

// Cleanup on exit
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...")
  await dispose()
  await fastify.close()
})

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...")
  await dispose()
  await fastify.close()
  process.exit(0)
})
