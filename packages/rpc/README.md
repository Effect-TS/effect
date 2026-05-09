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
import { Rpc, RpcGroup } from "@effect/rpc"
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
    success: User, // Succeed with a stream of users
    stream: true
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

```ts filename="handers.ts"
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
import { HttpRouter } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { RpcSerialization, RpcServer } from "@effect/rpc"
import { Layer } from "effect"
import { UsersLive } from "./handlers.js"
import { UserRpcs } from "./request.js"

// Create the RPC server layer
const RpcLayer = RpcServer.layer(UserRpcs).pipe(Layer.provide(UsersLive))

// Choose the protocol and serialization format
const HttpProtocol = RpcServer.layerProtocolHttp({
  path: "/rpc"
}).pipe(Layer.provide(RpcSerialization.layerNdjson))

// Create the main server layer
const Main = HttpRouter.Default.serve().pipe(
  Layer.provide(RpcLayer),
  Layer.provide(HttpProtocol),
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
)

BunRuntime.runMain(Layer.launch(Main))
```

**Testing the API with curl**

Use this `curl` command to test if the API is operational:

```bash
curl -X POST http://localhost:3000/rpc \
     -H "Content-Type: application/ndjson" \
     -d $'{"_tag": "Request", "id": "123", "tag": "UserList", "payload": {}, "traceId": "traceId", "spanId": "spanId", "sampled": true, "headers": [] }\n'
```

## Using your new backend on the client

Let's now move to the client-side code and embrace the power of end-to-end typesafety.

```ts
// client.ts
import { FetchHttpClient } from "@effect/platform"
import { RpcClient, RpcSerialization } from "@effect/rpc"
import { Chunk, Effect, Layer, Option, Stream } from "effect"
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
  if (Option.isNone(Chunk.findFirst(users, (user) => user.id === "3"))) {
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

## Defining middleware

To add middleware to the RPC server (& optionally the client), you can use the
`RpcMiddleware` module.

The first step is to define the middleware context tag, which is used to both
implement and access the middleware.

```ts filename="middleware.ts"
// middleware.ts
import { RpcMiddleware } from "@effect/rpc"
import { Context } from "effect"
import type { User } from "./request.js"

// A context tag which represents the current user
export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  User
>() {}

// The context tag for the authentication middleware
export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    // This middleware will provide the current user context
    provides: CurrentUser,
    // This middleware requires a client implementation too
    requiredForClient: true
  }
) {}
```

## Implementing middleware

Once the middleware context tag is defined, you can then use it in a `RpcGroup`
to apply it to various RPCs.

When it has been applied, you can then implement the middleware logic and add it
to your server and client.

```ts
import { Headers } from "@effect/platform"
import { Rpc, RpcClient, RpcGroup, RpcMiddleware, RpcServer } from "@effect/rpc"
import { Effect, Layer, Schema } from "effect"
import { AuthMiddleware } from "./middleware.js"
import { User } from "./request.js"

export class UserRpcs extends RpcGroup.make(
  Rpc.make("UserById", {
    success: User,
    payload: {
      id: Schema.String
    }
  })
    // apply the middleware to a single RPC
    .middleware(AuthMiddleware)
)
  // or apply the middleware to the entire group
  .middleware(AuthMiddleware) {}

// Implement the middleware for a server
export const AuthLive: Layer.Layer<AuthMiddleware> = Layer.succeed(
  AuthMiddleware,
  // A middleware that provides the current user.
  //
  // You can access the headers, payload, and the RPC definition when
  // implementing the middleware.
  AuthMiddleware.of(({ headers, payload, rpc }) =>
    Effect.succeed(new User({ id: "123", name: "Logged in user" }))
  )
)

// apply the middleware to a rpc server
RpcServer.layer(UserRpcs).pipe(Layer.provide(AuthLive))

// Implement the middleware for a client
//
// The client middleware can access the request and the RPC definition, and
// returns a modified request.
export const AuthClientLive: Layer.Layer<
  RpcMiddleware.ForClient<AuthMiddleware>
> = RpcMiddleware.layerClient(AuthMiddleware, ({ request, rpc }) =>
  Effect.succeed({
    ...request,
    headers: Headers.set(request.headers, "authorization", "Bearer token")
  })
)

// apply the middleware to a rpc client
export class UsersClient extends Effect.Service<UsersClient>()("UsersClient", {
  scoped: RpcClient.make(UserRpcs),
  // add the middleware layer to the dependencies
  dependencies: [AuthClientLive]
}) {}
```
