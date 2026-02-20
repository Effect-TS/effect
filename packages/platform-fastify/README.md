# @effect/platform-fastify

Fastify integration for Effect's HttpApp and @effect/rpc

## Installation

```bash
npm install @effect/platform-fastify fastify
# or
pnpm add @effect/platform-fastify fastify
# or
yarn add @effect/platform-fastify fastify
```

## Features

- **Native Fastify Support**: Direct integration with Fastify's request/reply system
- **Type-Safe**: Full TypeScript support with end-to-end type safety
- **Streaming**: Support for streaming RPC responses with backpressure handling
- **Serialization**: Built-in support for ndjson serialization (recommended for streaming)
- **Client Disconnect Detection**: Automatic fiber interruption when clients disconnect

## Quick Start

```typescript
import { FastifyRpcServer } from "@effect/platform-fastify"
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

## API Reference

### `register`

Registers an RPC handler as a Fastify plugin with automatic content type parser configuration.
This is the **recommended** way to add RPC routes to a Fastify server as it properly
encapsulates the content type parser configuration to avoid affecting other routes.

**Signature:**

```typescript
declare const register: <Rpcs extends Rpc.Any, LE>(
  fastify: FastifyInstance,
  group: RpcGroup<Rpcs>,
  options: {
    readonly path: string
    readonly layer: Layer<
      Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | RpcSerialization,
      LE
    >
    readonly disableTracing?: boolean
    readonly spanPrefix?: string
    readonly spanAttributes?: Record<string, unknown>
    readonly disableFatalDefects?: boolean
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope>
    ) => HttpApp.Default<never, Scope>
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly dispose: () => Promise<void>
}
```

**Parameters:**

| Parameter                     | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `fastify`                     | The Fastify instance to register the handler on                      |
| `group`                       | The RPC group containing your RPC definitions                        |
| `options.path`                | The URL path for the RPC endpoint (e.g., `"/rpc"`)                   |
| `options.layer`               | Effect layer providing RPC handlers and serialization                |
| `options.disableTracing`      | Disable tracing for RPC calls                                        |
| `options.spanPrefix`          | Prefix for tracing spans                                             |
| `options.spanAttributes`      | Additional attributes for tracing spans                              |
| `options.disableFatalDefects` | Don't treat defects as fatal                                         |
| `options.middleware`          | HTTP middleware function to transform the HTTP app                   |
| `options.memoMap`             | Layer memoization map to share layers across multiple instantiations |

**Returns:**

| Property  | Description                                                                       |
| --------- | --------------------------------------------------------------------------------- |
| `dispose` | Cleanup function to release resources. Call this before shutting down the server. |

**Example:**

```typescript
import { FastifyRpcServer } from "@effect/platform-fastify"
import { RpcSerialization } from "@effect/rpc"
import { Layer } from "effect"
import Fastify from "fastify"

const fastify = Fastify({ logger: true })

const { dispose } = FastifyRpcServer.register(fastify, UserRpcs, {
  path: "/rpc",
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

await fastify.listen({ port: 3000 })

// Cleanup
await dispose()
await fastify.close()
```

---

### `registerEffect`

Registers an RPC handler as a Fastify plugin, returning an Effect that extracts context
from the environment. This is useful when you want to integrate the RPC handler into an
existing Effect application and manage the context yourself, while still benefiting from
automatic content type parser configuration.

**Signature:**

```typescript
declare const registerEffect: <Rpcs extends Rpc.Any>(
  fastify: FastifyInstance,
  group: RpcGroup<Rpcs>,
  options: {
    readonly path: string
    readonly disableTracing?: boolean
    readonly spanPrefix?: string
    readonly spanAttributes?: Record<string, unknown>
    readonly disableFatalDefects?: boolean
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope>
    ) => HttpApp.Default<never, Scope>
  }
) => Effect<
  void,
  never,
  | Scope
  | RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
>
```

**Parameters:**

| Parameter                     | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `fastify`                     | The Fastify instance to register the handler on    |
| `group`                       | The RPC group containing your RPC definitions      |
| `options.path`                | The URL path for the RPC endpoint (e.g., `"/rpc"`) |
| `options.disableTracing`      | Disable tracing for RPC calls                      |
| `options.spanPrefix`          | Prefix for tracing spans                           |
| `options.spanAttributes`      | Additional attributes for tracing spans            |
| `options.disableFatalDefects` | Don't treat defects as fatal                       |
| `options.middleware`          | HTTP middleware function to transform the HTTP app |

**Returns:**

An `Effect` that registers the RPC handler. The Effect requires:

- `Scope` - For resource management
- `RpcSerialization` - Serialization format (e.g., `RpcSerialization.layerNdjson`)
- `Rpc.ToHandler<Rpcs>` - The RPC handler implementations
- `Rpc.Context<Rpcs>` - Any additional context required by the RPCs
- `Rpc.Middleware<Rpcs>` - Any RPC middleware

**Example:**

```typescript
import { FastifyRpcServer } from "@effect/platform-fastify"
import { RpcSerialization } from "@effect/rpc"
import { Effect, Layer } from "effect"
import Fastify from "fastify"

const program = Effect.gen(function* () {
  const fastify = Fastify()

  yield* FastifyRpcServer.registerEffect(fastify, UserRpcs, {
    path: "/rpc"
  })

  yield* Effect.acquireRelease(
    Effect.promise(() => fastify.listen({ port: 3000 })),
    () => Effect.promise(() => fastify.close())
  )
})

const MainLive = Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)

program.pipe(Effect.provide(MainLive), Effect.scoped, Effect.runPromise)
```

---

### `toFastifyHandler`

Creates a Fastify handler function from an RPC group. Use this when you need more control
over route registration or when integrating with existing Fastify plugins.

**Important:** When using `toFastifyHandler` directly, you must configure Fastify to not
parse request bodies for the RPC route.

**Signature:**

```typescript
declare const toFastifyHandler: <Rpcs extends Rpc.Any, LE>(
  group: RpcGroup<Rpcs>,
  options: {
    readonly layer: Layer<
      Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | RpcSerialization,
      LE
    >
    readonly disableTracing?: boolean
    readonly spanPrefix?: string
    readonly spanAttributes?: Record<string, unknown>
    readonly disableFatalDefects?: boolean
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope>
    ) => HttpApp.Default<never, Scope>
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly handler: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>
  readonly dispose: () => Promise<void>
}
```

**Parameters:**

| Parameter                     | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `group`                       | The RPC group containing your RPC definitions                        |
| `options.layer`               | Effect layer providing RPC handlers and serialization                |
| `options.disableTracing`      | Disable tracing for RPC calls                                        |
| `options.spanPrefix`          | Prefix for tracing spans                                             |
| `options.spanAttributes`      | Additional attributes for tracing spans                              |
| `options.disableFatalDefects` | Don't treat defects as fatal                                         |
| `options.middleware`          | HTTP middleware function to transform the HTTP app                   |
| `options.memoMap`             | Layer memoization map to share layers across multiple instantiations |

**Returns:**

| Property  | Description                           |
| --------- | ------------------------------------- |
| `handler` | The Fastify route handler function    |
| `dispose` | Cleanup function to release resources |

**Example:**

```typescript
import { FastifyRpcServer } from "@effect/platform-fastify"
import { RpcSerialization } from "@effect/rpc"
import { Layer } from "effect"
import Fastify from "fastify"

const { handler, dispose } = FastifyRpcServer.toFastifyHandler(UserRpcs, {
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

const fastify = Fastify()

// Required: disable body parsing for RPC routes
fastify.removeAllContentTypeParsers()
fastify.addContentTypeParser("*", (_req, _payload, done) => done(null))

fastify.post("/rpc", handler)

await fastify.listen({ port: 3000 })
```

**Scoping content type parser (when you have other routes):**

```typescript
const { handler, dispose } = FastifyRpcServer.toFastifyHandler(UserRpcs, {
  layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)
})

const fastify = Fastify()

// RPC route with custom body parsing (scoped to this plugin)
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

---

### `toFastifyHandlerEffect`

Creates a Fastify handler as an Effect, allowing the context to be provided externally.
This is useful when you want to integrate the RPC handler into an existing Effect application
and manage the context yourself.

**Important:** When using this function, you must configure Fastify to not parse request bodies
for the RPC route.

**Signature:**

```typescript
declare const toFastifyHandlerEffect: <Rpcs extends Rpc.Any>(
  group: RpcGroup<Rpcs>,
  options?: {
    readonly disableTracing?: boolean
    readonly spanPrefix?: string
    readonly spanAttributes?: Record<string, unknown>
    readonly disableFatalDefects?: boolean
    readonly middleware?: (
      httpApp: HttpApp.Default<never, Scope>
    ) => HttpApp.Default<never, Scope>
  }
) => Effect<
  (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  never,
  | Scope
  | RpcSerialization
  | Rpc.ToHandler<Rpcs>
  | Rpc.Context<Rpcs>
  | Rpc.Middleware<Rpcs>
>
```

**Parameters:**

| Parameter                     | Description                                        |
| ----------------------------- | -------------------------------------------------- |
| `group`                       | The RPC group containing your RPC definitions      |
| `options.disableTracing`      | Disable tracing for RPC calls                      |
| `options.spanPrefix`          | Prefix for tracing spans                           |
| `options.spanAttributes`      | Additional attributes for tracing spans            |
| `options.disableFatalDefects` | Don't treat defects as fatal                       |
| `options.middleware`          | HTTP middleware function to transform the HTTP app |

**Returns:**

An `Effect` that produces the Fastify handler function. The Effect requires:

- `Scope` - For resource management
- `RpcSerialization` - Serialization format (e.g., `RpcSerialization.layerNdjson`)
- `Rpc.ToHandler<Rpcs>` - The RPC handler implementations
- `Rpc.Context<Rpcs>` - Any additional context required by the RPCs
- `Rpc.Middleware<Rpcs>` - Any RPC middleware

**Example:**

```typescript
import { FastifyRpcServer } from "@effect/platform-fastify"
import { RpcSerialization } from "@effect/rpc"
import { Effect, Layer } from "effect"
import Fastify from "fastify"

const program = Effect.gen(function* () {
  const handler = yield* FastifyRpcServer.toFastifyHandlerEffect(UserRpcs)

  const fastify = Fastify()
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser("*", (_req, _payload, done) => done(null))
  fastify.post("/rpc", handler)

  yield* Effect.acquireRelease(
    Effect.promise(() => fastify.listen({ port: 3000 })),
    () => Effect.promise(() => fastify.close())
  )
})

const MainLive = Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson)

program.pipe(Effect.provide(MainLive), Effect.scoped, Effect.runPromise)
```

---

## FastifyHttpAppServer

The package also exports `FastifyHttpAppServer` for attaching any `HttpApp` to Fastify routes,
not just RPC handlers. This is the lower-level API that `FastifyRpcServer` is built on.

### `FastifyHttpAppServer.toHandlerEffect`

Create a Fastify handler from an `HttpApp` as an Effect, allowing the context to be provided externally.

**Signature:**

```typescript
declare const toHandlerEffect: <E, R>(
  httpApp: HttpApp.Default<E, R>
) => Effect<
  (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  never,
  Exclude<R, HttpServerRequest> | Scope
>
```

**Example:**

```typescript
import { FastifyHttpAppServer } from "@effect/platform-fastify"
import { HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import Fastify from "fastify"

const httpApp = Effect.succeed(HttpServerResponse.text("Hello, World!"))

const program = Effect.gen(function* () {
  const handler = yield* FastifyHttpAppServer.toHandlerEffect(httpApp)

  const fastify = Fastify()
  fastify.get("/hello", handler)

  yield* Effect.acquireRelease(
    Effect.promise(() => fastify.listen({ port: 3000 })),
    () => Effect.promise(() => fastify.close())
  )
})

program.pipe(Effect.scoped, Effect.runPromise)
```

---

### `FastifyHttpAppServer.toHandler`

Create a Fastify handler from an `HttpApp` with a layer that provides the required context.

**Signature:**

```typescript
declare const toHandler: <E, R, LE>(
  httpApp: HttpApp.Default<E, R>,
  layer: Layer<Exclude<R, HttpServerRequest | Scope>, LE>,
  options?: {
    readonly memoMap?: Layer.MemoMap
  }
) => {
  readonly handler: (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>
  readonly dispose: () => Promise<void>
}
```

**Example:**

```typescript
import { FastifyHttpAppServer } from "@effect/platform-fastify"
import { HttpServerResponse } from "@effect/platform"
import { Effect, Layer, Context } from "effect"
import Fastify from "fastify"

class Greeter extends Context.Tag("Greeter")<
  Greeter,
  { greet: (name: string) => string }
>() {}

const httpApp = Effect.gen(function* () {
  const greeter = yield* Greeter
  return HttpServerResponse.text(greeter.greet("World"))
})

const GreeterLive = Layer.succeed(Greeter, {
  greet: (name) => `Hello, ${name}!`
})

const { handler, dispose } = FastifyHttpAppServer.toHandler(
  httpApp,
  GreeterLive
)

const fastify = Fastify()
fastify.get("/hello", handler)

await fastify.listen({ port: 3000 })

// Cleanup
await dispose()
await fastify.close()
```

---

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
