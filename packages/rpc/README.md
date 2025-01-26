# Introduction

The `@effect/rpc` library facilitates the development of remote procedure call (RPC) systems in TypeScript, enhancing application scalability and maintainability. It provides a type-safe environment that reduces runtime errors by aligning with TypeScript's strong typing. This library simplifies the creation of network-exposed services, handling the intricacies of data serialization and network communication, allowing developers to concentrate on core business logic. Its features support custom serialization, error handling, and middleware, making it adaptable for diverse application needs.

# Quickstart

## Declaring Requests

The `RpcGroup` and `Rpc` modules can be used alongside the `Schema` module to
define requests and responses.

Here we are defining a request to retrieve a list of users, a request to
retrieve a user by ID, and a request to create a new user.

```ts filename="request.ts"
// request.ts
import { Rpc, RpcGroup, RpcSchema } from "@effect/rpc"
import { Schema } from "effect"

// Define a user with an ID and name
export class User extends Schema.Class<User>("User")({
  id: Schema.String, // User's ID as a string
  name: Schema.String // User's name as a string
}) {}

// Define a group of RPCs for user management.
// You can use the `RpcGroup.make` function to create a group of RPCs.
export class UserRpcs extends RpcGroup.make(
  // Request to retrieve a list of users
  Rpc.make("UserList", {
    success: RpcSchema.Stream({
      success: User, // Indicates that the response is an stream of Users
      failure: Schema.Never
    })
  }),
  Rpc.make("UserById", {
    success: User,
    error: Schema.String, // Indicates that errors, if any, will be returned as strings
    payload: {
      id: Schema.String
    }
  }),
  Rpc.make("UserCreate", {
    success: User,
    payload: {
      name: Schema.String
    }
  })
) {}
```

## Implementing the handlers

This section introduces how to implement the rpc handlers, using an imaginary database setup to manage user data.

```ts filename="router.ts"
// handlers.ts
import type { Rpc } from "@effect/rpc"
import { Effect, Layer, Ref, Stream } from "effect"
import { User, UserRpcs } from "./request.js"

// ---------------------------------------------
// Imaginary Database
// ---------------------------------------------

class UserRepository extends Effect.Service<UserRepository>()(
  "UserRepository",
  {
    effect: Effect.gen(function* () {
      const ref = yield* Ref.make<Array<User>>([
        new User({ id: "1", name: "Alice" }),
        new User({ id: "2", name: "Bob" })
      ])

      return {
        findMany: ref.get,
        findById: (id: string) =>
          Ref.get(ref).pipe(
            Effect.andThen((users) => {
              const user = users.find((user) => user.id === id)
              return user
                ? Effect.succeed(user)
                : Effect.fail(`User not found: ${id}`)
            })
          ),
        create: (name: string) =>
          Ref.updateAndGet(ref, (users) => [
            ...users,
            new User({ id: String(users.length + 1), name })
          ]).pipe(Effect.andThen((users) => users[users.length - 1]))
      }
    })
  }
) {}

// ---------------------------------------------
// RPC handlers
// ---------------------------------------------

export const UsersLive: Layer.Layer<
  Rpc.Handler<"UserList"> | Rpc.Handler<"UserById"> | Rpc.Handler<"UserCreate">
> = UserRpcs.toLayer(
  Effect.gen(function* () {
    const db = yield* UserRepository

    return {
      UserList: () => Stream.fromIterableEffect(db.findMany),
      UserById: ({ id }) => db.findById(id),
      UserCreate: ({ name }) => db.create(name)
    }
  })
).pipe(
  // Provide the UserRepository layer
  Layer.provide(UserRepository.Default)
)
```

## Serving the API

This part explains how to serve the API using the handlers we defined earlier.

```ts filename="server.ts"
// server.ts
import { HttpRouter, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { toHttpApp } from "@effect/rpc-http/HttpRouter"
import { Layer } from "effect"
import { createServer } from "http"
import { appRouter } from "./router.js"

const HttpLive = HttpRouter.empty.pipe(
  HttpRouter.post("/rpc", toHttpApp(appRouter)),
  HttpServer.serve(),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

NodeRuntime.runMain(Layer.launch(HttpLive))
```

**Testing the API with curl**

Use this `curl` command to test if the API is operational:

```bash
curl -X POST http://localhost:3000/rpc \
     -H "Content-Type: application/json" \
     -d $'{"_tag": "Request", "id": "123", "tag": "UserList", "payload": {}, "traceId": "traceId", "spanId": "spanId", "sampled": true, "headers": {} }\n'
```

## Using your new backend on the client

Let's now move to the client-side code and embrace the power of end-to-end typesafety.

```ts
// client.ts
import { FetchHttpClient } from "@effect/platform"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { Chunk, Effect, Layer, Stream } from "effect"
import { UserRpcs } from "./request.js"

// Choose which protocol to use
const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "http://localhost:3000/rpc"
}).pipe(
  Layer.provide([
    // use fetch for http requests
    FetchHttpClient.layer,
    // use ndjson for serialization
    RpcSerialization.layerNdjson
  ])
)

// Use the client
const program = Effect.gen(function* () {
  const client = yield* RpcClient.make(UserRpcs)
  let users = yield* Stream.runCollect(client.UserList({}))
  if (!Chunk.findFirst(users, (user) => user.id === "3")) {
    console.log(`Creating user "Charlie"`)
    yield* client.UserCreate({ name: "Charlie" })
    users = yield* Stream.runCollect(client.UserList({}))
  } else {
    console.log(`User "Charlie" already exists`)
  }
  return users
}).pipe(Effect.scoped)

program.pipe(Effect.provide(ProtocolLive), Effect.runPromise).then(console.log)
```
