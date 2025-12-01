# @effect/rpc-fastify

Fastify integration for @effect/rpc

## Installation

```bash
npm install @effect/rpc-fastify fastify
# or
pnpm add @effect/rpc-fastify fastify
# or
yarn add @effect/rpc-fastify fastify
```

## Features

- **Native Fastify Support**: Direct integration with Fastify's request/reply system
- **Type-Safe**: Full TypeScript support with end-to-end type safety
- **Streaming**: Support for streaming RPC responses
- **Serialization**: Built-in support for ndjson serialization (recommended for streaming)

## Quick Start

```typescript
import { FastifyRpcServer } from "@effect/rpc-fastify"
import { Rpc, RpcGroup, RpcSerialization } from "@effect/rpc"
import { Effect, Layer, Schema } from "effect"
import Fastify from "fastify"

// Define your RPC schema
class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}

class UserRpcs extends RpcGroup.make(
  Rpc.make("GetUser", {
    success: User,
    payload: { id: Schema.String }
  }),
  Rpc.make("CreateUser", {
    success: User,
    payload: { name: Schema.String }
  })
) {}

// Implement RPC handlers
const UsersLive = UserRpcs.toLayer(
  Effect.gen(function* () {
    return {
      GetUser: ({ id }) => Effect.succeed(new User({ id, name: "John Doe" })),
      CreateUser: ({ name }) =>
        Effect.succeed(new User({ id: crypto.randomUUID(), name }))
    }
  })
)

// Setup Fastify server
const fastify = Fastify({ logger: true })

// Register RPC handler
const { dispose } = FastifyRpcServer.register(fastify, UserRpcs, {
  path: "/rpc",
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

// Other routes work normally
fastify.get("/health", async () => ({ status: "ok" }))

// Start the server
await fastify.listen({ port: 3000 })
console.log("Server listening on http://localhost:3000")

// Cleanup on exit
process.on("SIGTERM", async () => {
  await dispose()
  await fastify.close()
})
```

## API

### `register` (Recommended)

Registers an RPC handler as a Fastify plugin with automatic content type parser configuration.
The content type parser is scoped to only the RPC route, so other routes on the same
Fastify instance work normally.

```typescript
FastifyRpcServer.register<Rpcs, LE>(
  fastify: FastifyInstance,
  group: RpcGroup<Rpcs>,
  options: {
    path: string
    layer: Layer<Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | RpcSerialization>
    disableTracing?: boolean
    spanPrefix?: string
    spanAttributes?: Record<string, unknown>
    disableFatalDefects?: boolean
    middleware?: (httpApp) => httpApp
    memoMap?: Layer.MemoMap
  }
): {
  dispose: () => Promise<void>
}
```

**Parameters:**

- `fastify`: The Fastify instance to register the handler on
- `group`: The RPC group containing your RPC definitions
- `options`:
  - `path`: The URL path for the RPC endpoint (e.g., "/rpc")
  - `layer`: Effect layer providing RPC handlers and serialization
  - `disableTracing`: Disable tracing for RPC calls
  - `spanPrefix`: Prefix for tracing spans
  - `spanAttributes`: Additional attributes for tracing spans
  - `disableFatalDefects`: Don't treat defects as fatal
  - `middleware`: HTTP middleware function
  - `memoMap`: Layer memoization map to share layers across multiple instantiations

**Returns:**

- `dispose`: Cleanup function to release resources

### `toFastifyHandler`

Creates a Fastify handler function. Use this when you need more control over route
registration or when integrating with existing Fastify plugins.

**Important:** When using `toFastifyHandler` directly, you must configure Fastify to not
parse request bodies for the RPC route:

```typescript
const { handler, dispose } = FastifyRpcServer.toFastifyHandler(UserRpcs, {
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

const fastify = Fastify()

// Required: disable body parsing for RPC routes
fastify.removeAllContentTypeParsers()
fastify.addContentTypeParser("*", (_req, _payload, done) => done(null))

fastify.post("/rpc", handler)
```

If you have other routes that need normal body parsing, use `fastify.register` to
scope the content type parser configuration:

```typescript
const { handler, dispose } = FastifyRpcServer.toFastifyHandler(UserRpcs, {
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

const fastify = Fastify()

// RPC route with custom body parsing
fastify.register((instance, _opts, done) => {
  instance.removeAllContentTypeParsers()
  instance.addContentTypeParser("*", (_req, _payload, done) => done(null))
  instance.post("/rpc", handler)
  done()
})

// Other routes use normal body parsing
fastify.post("/api/users", async (req) => {
  // req.body is parsed normally
})
```

## Serialization

The RPC layer requires a serialization format. Use `RpcSerialization.layerNdjson` for
newline-delimited JSON, which is recommended for streaming responses:

```typescript
import { RpcSerialization } from "@effect/rpc"

FastifyRpcServer.register(fastify, UserRpcs, {
  path: "/rpc",
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})
```

## Streaming RPCs

For streaming responses, define your RPC with `RpcSchema.Stream`:

```typescript
import { Rpc, RpcGroup, RpcSchema, RpcSerialization } from "@effect/rpc"
import { Effect, Schema, Stream } from "effect"

class StreamingRpcs extends RpcGroup.make(
  Rpc.make("StreamUsers", {
    success: RpcSchema.Stream({
      success: User,
      failure: Schema.Never
    }),
    payload: { count: Schema.Number }
  })
) {}

const StreamingLive = StreamingRpcs.toLayer(
  Effect.sync(() => ({
    StreamUsers: ({ count }) =>
      Stream.fromIterable(
        Array.from(
          { length: count },
          (_, i) => new User({ id: String(i), name: `User ${i}` })
        )
      )
  }))
)

FastifyRpcServer.register(fastify, StreamingRpcs, {
  path: "/rpc",
  layer: Layer.mergeAll(StreamingLive, RpcSerialization.layerNdjson)
})
```

## License

MIT
