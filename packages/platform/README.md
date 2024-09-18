# Introduction

Welcome to the documentation for `@effect/platform`, a library designed for creating platform-independent abstractions (Node.js, Bun, browsers).

> [!WARNING]
> This documentation focuses on **unstable modules**. For stable modules, refer to the [official website documentation](https://effect.website/docs/guides/platform/introduction).

# HTTP API

## Overview

The `HttpApi` family of modules provide a declarative way to define HTTP APIs.
You can create an API by combining multiple endpoints, each with its own set of
schemas that define the request and response types.

After you have defined your API, you can use it to implement a server or derive
a client that can interact with the server.

## Defining an API

To define an API, you need to create a set of endpoints. Each endpoint is
defined by a path, a method, and a set of schemas that define the request and
response types.

Each set of endpoints is added to an `HttpApiGroup`, which can be combined with
other groups to create a complete API.

### Your first `HttpApiGroup`

Let's define a simple CRUD API for managing users. First, we need to make an
`HttpApiGroup` that contains our endpoints.

```ts
import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "@effect/schema"

// Our domain "User" Schema
class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
}) {}

const usersApi = HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    // each endpoint has a name and a path
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      // the endpoint can have a Schema for a successful response
      HttpApiEndpoint.setSuccess(User),
      // and here is a Schema for the path parameters
      HttpApiEndpoint.setPath(
        Schema.Struct({
          id: Schema.NumberFromString
        })
      )
    )
  ),
  HttpApiGroup.add(
    HttpApiEndpoint.post("create", "/users").pipe(
      HttpApiEndpoint.setSuccess(User),
      // and here is a Schema for the request payload / body
      //
      // this is a POST request, so the payload is in the body
      // but for a GET request, the payload would be in the URL search params
      HttpApiEndpoint.setPayload(
        Schema.Struct({
          name: Schema.String
        })
      )
    )
  ),
  // by default, the endpoint will respond with a 204 No Content
  HttpApiGroup.add(HttpApiEndpoint.del("delete", "/users/:id")),
  HttpApiGroup.add(
    HttpApiEndpoint.patch("update", "/users/:id").pipe(
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.setPayload(
        Schema.Struct({
          name: Schema.String
        })
      )
    )
  )
)
```

You can also extend the `HttpApiGroup` with a class to gain an opaque type.
We will use this API style in the following examples:

```ts
class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id")
    // ... same as above
  )
) {}
```

### Creating the top level `HttpApi`

Once you have defined your groups, you can combine them into a single `HttpApi`.

```ts
import { HttpApi } from "@effect/platform"

class MyApi extends HttpApi.empty.pipe(HttpApi.addGroup(UsersApi)) {}
```

Or with the non-opaque style:

```ts
const api = HttpApi.empty.pipe(HttpApi.addGroup(usersApi))
```

### Adding OpenApi annotations

You can add OpenApi annotations to your API by using the `OpenApi` module.

Let's add a title to our `UsersApi` group:

```ts
import { OpenApi } from "@effect/platform"

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id")
    // ... same as above
  ),
  // add an OpenApi title & description
  OpenApi.annotate({
    title: "Users API",
    description: "API for managing users"
  })
) {}
```

Now when you generate OpenApi documentation, the title and description will be
included.

You can also add OpenApi annotations to the top-level `HttpApi`:

```ts
class MyApi extends HttpApi.empty.pipe(
  HttpApi.addGroup(UsersApi),
  OpenApi.annotate({
    title: "My API",
    description: "My awesome API"
  })
) {}
```

### Adding errors

You can add error responses to your endpoints using the following apis:

- `HttpApiEndpoint.addError` - add an error response for a single endpoint
- `HttpApiGroup.addError` - add an error response for all endpoints in a group
- `HttpApi.addError` - add an error response for all endpoints in the api

The group & api level errors are useful for adding common error responses that
can be used in middleware.

Here is an example of adding a 404 error to the `UsersApi` group:

```ts
// define the error schemas
class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {}
) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      // here we are adding our error response
      HttpApiEndpoint.addError(UserNotFound, { status: 404 }),
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.setPath(Schema.Struct({ id: Schema.NumberFromString }))
    )
  ),
  // or we could add an error to the group
  HttpApiGroup.addError(Unauthorized, { status: 401 })
) {}
```

It is worth noting that you can add multiple error responses to an endpoint,
just by calling `HttpApiEndpoint.addError` multiple times.

### Multipart requests

If you need to handle file uploads, you can use the `HttpApiSchema.Multipart`
api to flag a `HttpApiEndpoint` payload schema as a multipart request.

You can then use the schemas from the `Multipart` module to define the expected
shape of the multipart request.

```ts
import { HttpApiSchema, Multipart } from "@effect/platform"

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.post("upload", "/users/upload").pipe(
      HttpApiEndpoint.setPayload(
        HttpApiSchema.Multipart(
          Schema.Struct({
            // add a "files" field to the schema
            files: Multipart.FilesSchema
          })
        )
      )
    )
  )
) {}
```

### Adding security annotations

The `HttpApiSecurity` module provides a way to add security annotations to your
API.

It offers the following authorization types:

- `HttpApiSecurity.apiKey` - API key authorization through headers, query
  parameters, or cookies.
- `HttpApiSecurity.basicAuth` - HTTP Basic authentication.
- `HttpApiSecurity.bearerAuth` - Bearer token authentication.

You can annotate your API with these security types using the
`OpenApi.annotate` api as before.

```ts
import { HttpApiSecurity } from "@effect/platform"

const security = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "token"
})

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      // add the security annotation to the endpoint
      OpenApi.annotate({ security })
    )
  ),
  // or at the group level
  OpenApi.annotate({ security }),

  // or just for the endpoints above this line
  HttpApiGroup.annotateEndpoints(OpenApi.Security, security),
  // this endpoint will not have the security annotation
  HttpApiGroup.add(HttpApiEndpoint.get("list", "/users"))
) {}
```

### Changing the response encoding

By default, the response is encoded as JSON. You can change the encoding using
the `HttpApiSchema.withEncoding` api.

Here is an example of changing the encoding to text/csv:

```ts
class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("csv", "/users/csv").pipe(
      HttpApiEndpoint.setSuccess(
        Schema.String.pipe(
          HttpApiSchema.withEncoding({
            kind: "Text",
            contentType: "text/csv"
          })
        )
      )
    )
  )
) {}
```

## Implementing a server

Now that you have defined your API, you can implement a server that serves the
endpoints.

The `HttpApiBuilder` module provides all the apis you need to implement your
server.

### Implementing a `HttpApiGroup`

First up, let's implement an `UsersApi` group with a single `findById` endpoint.

The `HttpApiBuilder.group` api takes the `HttpApi` definition, the group name,
and a function that adds the handlers required for the group.

Each endpoint is implemented using the `HttpApiBuilder.handle` api.

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { DateTime, Effect } from "effect"

// here is our api definition
class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
}) {}

class UsersApi extends HttpApiGroup.make("users").pipe(
  HttpApiGroup.add(
    HttpApiEndpoint.get("findById", "/users/:id").pipe(
      HttpApiEndpoint.setSuccess(User),
      HttpApiEndpoint.setPath(
        Schema.Struct({
          id: Schema.NumberFromString
        })
      )
    )
  )
) {}

class MyApi extends HttpApi.empty.pipe(HttpApi.addGroup(UsersApi)) {}

// --------------------------------------------
// Implementation
// --------------------------------------------

// the `HttpApiBuilder.group` api returns a `Layer`
const UsersApiLive: Layer.Layer<HttpApiGroup.HttpApiGroup.Service<"users">> =
  HttpApiBuilder.group(MyApi, "users", (handlers) =>
    handlers.pipe(
      // the parameters & payload are passed to the handler function.
      HttpApiBuilder.handle("findById", ({ path: { id } }) =>
        Effect.succeed(
          new User({
            id,
            name: "John Doe",
            createdAt: DateTime.unsafeNow()
          })
        )
      )
    )
  )
```

### Using services inside a `HttpApiGroup`

If you need to use services inside your handlers, you can return an
`Effect` from the `HttpApiBuilder.group` api.

```ts
class UsersRepository extends Context.Tag("UsersRepository")<
  UsersRepository,
  {
    readonly findById: (id: number) => Effect.Effect<User>
  }
>() {}

// the dependencies will show up in the resulting `Layer`
const UsersApiLive: Layer.Layer<
  HttpApiGroup.HttpApiGroup.Service<"users">,
  never,
  UsersRepository
> = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  // we can return an Effect that creates our handlers
  Effect.gen(function* () {
    const repository = yield* UsersRepository
    return handlers.pipe(
      HttpApiBuilder.handle("findById", ({ path: { id } }) =>
        repository.findById(id)
      )
    )
  })
)
```

### Implementing a `HttpApi`

Once all your groups are implemented, you can implement the top-level `HttpApi`.

This is done using the `HttpApiBuilder.api` api, and then using `Layer.provide`
to add all the group implementations.

```ts
const MyApiLive: Layer.Layer<HttpApi.HttpApi.Service> = HttpApiBuilder.api(
  MyApi
).pipe(Layer.provide(UsersApiLive))
```

### Serving the API

Finally, you can serve the API using the `HttpApiBuilder.serve` api.

You can also add middleware to the server using the `HttpMiddleware` module, or
use some of the middleware Layer's from the `HttpApiBuilder` module.

```ts
import { HttpMiddleware, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { createServer } from "node:http"

// use the `HttpApiBuilder.serve` function to register our API with the HTTP
// server
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Add CORS middleware
  Layer.provide(HttpApiBuilder.middlewareCors()),
  // Provide the API implementation
  Layer.provide(MyApiLive),
  // Log the address the server is listening on
  HttpServer.withLogAddress,
  // Provide the HTTP server implementation
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

// run the server
Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

## Implementing `HttpApiSecurity`

If you are using `HttpApiSecurity` in your API, you can use the security
definition to implement a middleware that will protect your endpoints.

The `HttpApiBuilder.middlewareSecurity` api will assist you in creating this
middleware.

Here is an example:

```ts
// our cookie security definition
const security = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "token"
})

// the user repository service
class UsersRepository extends Context.Tag("UsersRepository")<
  UsersRepository,
  {
    readonly findByToken: (token: Redacted.Redacted) => Effect.Effect<User>
  }
>() {}

// the security middleware will supply the current user to the handlers
class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

// implement the middleware
const makeSecurityMiddleware: Effect.Effect<
  HttpApiBuilder.SecurityMiddleware<CurrentUser>,
  never,
  UsersRepository
> = Effect.gen(function* () {
  const repository = yield* UsersRepository
  return HttpApiBuilder.middlewareSecurity(
    // the security definition
    security,
    // the Context.Tag this middleware will provide
    CurrentUser,
    // the function to get the user from the token
    (token) => repository.findByToken(token)
  )
})

// use the middleware
const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  Effect.gen(function* () {
    // construct the security middleware
    const securityMiddleware = yield* makeSecurityMiddleware

    return handlers.pipe(
      HttpApiBuilder.handle("findById", ({ path: { id } }) =>
        Effect.succeed(
          new User({ id, name: "John Doe", createdAt: DateTime.unsafeNow() })
        )
      ),
      // apply the middleware to the findById endpoint
      securityMiddleware
      // any endpoint after this will not be protected
    )
  })
)
```

If you need to set the security cookie from within a handler, you can use the
`HttpApiBuilder.securitySetCookie` api.

By default, the cookie will be set with the `HttpOnly` and `Secure` flags.

```ts
const security = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "token"
})

const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers.pipe(
    HttpApiBuilder.handle("login", () =>
      // set the security cookie
      HttpApiBuilder.securitySetCookie(
        security,
        Redacted.make("keep me secret")
      )
    )
  )
)
```

### Serving Swagger documentation

You can add Swagger documentation to your API using the `HttpApiSwagger` module.

You just need to provide the `HttpApiSwagger.layer` to your server
implementation:

```ts
import { HttpApiSwagger } from "@effect/platform"

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // add the swagger documentation layer
  Layer.provide(
    HttpApiSwagger.layer({
      // "/docs" is the default path for the swagger documentation
      path: "/docs"
    })
  ),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)
```

## Deriving a client

Once you have defined your API, you can derive a client that can interact with
the server.

The `HttpApiClient` module provides all the apis you need to derive a client.

```ts
import { HttpApiClient } from "@effect/platform"

Effect.gen(function* () {
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: "http://localhost:3000"
    // You can transform the HttpClient to add things like authentication
    // transformClient: ....
  })
  const user = yield* client.users.findById({ path: { id: 1 } })
  yield* Effect.log(user)
})
```

# HTTP Client

## Overview

The `@effect/platform/HttpClient*` modules provide a way to send HTTP requests,
handle responses, and abstract over the differences between platforms.

The `HttpClient` interface has a set of methods for sending requests:

- `.execute` - takes a [HttpClientRequest](#httpclientrequest) and returns a `HttpClientResponse`
- `.{get, del, head, options, patch, post, put}` - convenience methods for creating a request and
  executing it in one step

To access the `HttpClient`, you can use the `HttpClient.HttpClient` [tag](https://effect.website/docs/guides/context-management/services).
This will give you access to a `HttpClient.Service` instance, which is the default
instance of the `HttpClient` interface.

**Example: Retrieving JSON Data (GET)**

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Access HttpClient
  const client = yield* HttpClient.HttpClient

  // Create and execute a GET request
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  const json = yield* response.json

  console.log(json)
}).pipe(
  // Ensure request is aborted if the program is interrupted
  Effect.scoped,
  // Provide the HttpClient
  Effect.provide(FetchHttpClient.layer)
)

Effect.runPromise(program)
/*
Output:
{
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

**Example: Creating and Executing a Custom Request**

Using [HttpClientRequest](#httpclientrequest), you can create and then execute a request. This is useful for customizing the request further.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "@effect/platform"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  // Access HttpClient
  const client = yield* HttpClient.HttpClient

  // Create a GET request
  const req = HttpClientRequest.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  // Optionally customize the request

  // Execute the request and get the response
  const response = yield* client.execute(req)

  const json = yield* response.json

  console.log(json)
}).pipe(
  // Ensure request is aborted if the program is interrupted
  Effect.scoped,
  // Provide the HttpClient
  Effect.provide(FetchHttpClient.layer)
)

Effect.runPromise(program)
/*
Output:
{
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

## Customize a HttpClient

The `HttpClient` module allows you to customize the client in various ways. For instance, you can log details of a request before execution using the `tapRequest` function.

**Example: Tapping**

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Console, Effect } from "effect"

const program = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(
    // Log the request before fetching
    HttpClient.tapRequest(Console.log)
  )

  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  const json = yield* response.json

  console.log(json)
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
/*
Output:
{
  _id: '@effect/platform/HttpClientRequest',
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  urlParams: [],
  hash: { _id: 'Option', _tag: 'None' },
  headers: Object <[Object: null prototype]> {},
  body: { _id: '@effect/platform/HttpBody', _tag: 'Empty' }
}
{
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

**Operations Summary**

| Operation                | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `filterOrElse`           | Filters the result of a response, or runs an alternative effect if the predicate fails. |
| `filterOrFail`           | Filters the result of a response, or throws an error if the predicate fails.            |
| `filterStatus`           | Filters responses by HTTP status code.                                                  |
| `filterStatusOk`         | Filters responses that return a 2xx status code.                                        |
| `followRedirects`        | Follows HTTP redirects up to a specified number of times.                               |
| `map`                    | Transforms the result of a request.                                                     |
| `mapEffect`              | Transforms the result of a request using an effectful function.                         |
| `mapRequest`             | Appends a transformation of the request object before sending it.                       |
| `mapRequestEffect`       | Appends an effectful transformation of the request object before sending it.            |
| `mapRequestInput`        | Prepends a transformation of the request object before sending it.                      |
| `mapRequestInputEffect`  | Prepends an effectful transformation of the request object before sending it.           |
| `retry`                  | Retries the request based on a provided schedule or policy.                             |
| `schemaFunction`         | Creates a function that validates request data against a schema before sending it.      |
| `scoped`                 | Ensures resources are properly scoped and released after execution.                     |
| `tap`                    | Performs an additional effect after a successful request.                               |
| `tapRequest`             | Performs an additional effect on the request before sending it.                         |
| `withCookiesRef`         | Associates a `Ref` of cookies with the client for handling cookies across requests.     |
| `withTracerDisabledWhen` | Disables tracing for specific requests based on a provided predicate.                   |
| `withTracerPropagation`  | Enables or disables tracing propagation for the request.                                |

### Mapping Requests

Note that `mapRequest` and `mapRequestEffect` add transformations at the end of the request chain, while `mapRequestInput` and `mapRequestInputEffect` apply transformations at the start:

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(
    // Append transformation
    HttpClient.mapRequest((req) => {
      console.log(1)
      return req
    }),
    // Another append transformation
    HttpClient.mapRequest((req) => {
      console.log(2)
      return req
    }),
    // Prepend transformation, this executes first
    HttpClient.mapRequestInput((req) => {
      console.log(3)
      return req
    })
  )

  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )

  const json = yield* response.json

  console.log(json)
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
/*
Output:
3
1
2
{
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

### Integration with Schema

The `HttpClient.schemaFunction` allows you to integrate schemas into your HTTP client requests. This function ensures that the data you send conforms to a specified schema, enhancing type safety and validation.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const addTodo = HttpClient.schemaFunction(
    client,
    Schema.Struct({
      title: Schema.String,
      body: Schema.String,
      userId: Schema.Number
    })
  )(HttpClientRequest.post("https://jsonplaceholder.typicode.com/posts"))

  const response = yield* addTodo({
    title: "foo",
    body: "bar",
    userId: 1
  })

  const json = yield* response.json

  console.log(json)
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

## RequestInit Options

You can customize the `HttpClient` by passing `RequestInit` options to configure aspects of the HTTP requests, such as credentials, headers, and more.

In this example, we customize the `HttpClient` to include credentials with every request:

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect, Layer } from "effect"

const CustomFetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, {
      credentials: "include"
    })
  )
)

const program = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )
  const json = yield* response.json
  console.log(json)
}).pipe(Effect.scoped, Effect.provide(CustomFetchLive))
```

## Create a Custom HttpClient

You can create a custom `HttpClient.Service` using the `HttpClient.makeService` function. This allows you to simulate or mock server responses within your application.

```ts
import { HttpClient, HttpClientResponse } from "@effect/platform"
import { Effect, Layer } from "effect"

const myClient = HttpClient.makeService((req) =>
  Effect.succeed(
    HttpClientResponse.fromWeb(
      req,
      // Simulate a response from a server
      new Response(
        JSON.stringify({
          userId: 1,
          id: 1,
          title: "title...",
          body: "body..."
        })
      )
    )
  )
)

const program = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )
  const json = yield* response.json
  console.log(json)
}).pipe(
  Effect.scoped,
  // Provide the HttpClient
  Effect.provide(Layer.succeed(HttpClient.HttpClient, myClient))
)

Effect.runPromise(program)
/*
Output:
{ userId: 1, id: 1, title: 'title...', body: 'body...' }
*/
```

## HttpClientRequest

### Overview

You can create a `HttpClientRequest` using the following provided constructors:

| Constructor                 | Description               |
| --------------------------- | ------------------------- |
| `HttpClientRequest.del`     | Create a DELETE request   |
| `HttpClientRequest.get`     | Create a GET request      |
| `HttpClientRequest.head`    | Create a HEAD request     |
| `HttpClientRequest.options` | Create an OPTIONS request |
| `HttpClientRequest.patch`   | Create a PATCH request    |
| `HttpClientRequest.post`    | Create a POST request     |
| `HttpClientRequest.put`     | Create a PUT request      |

### Setting Headers

When making HTTP requests, sometimes you need to include additional information in the request headers. You can set headers using the `setHeader` function for a single header or `setHeaders` for multiple headers simultaneously.

```ts
import { HttpClientRequest } from "@effect/platform"

const req = HttpClientRequest.get("https://api.example.com/data").pipe(
  // Setting a single header
  HttpClientRequest.setHeader("Authorization", "Bearer your_token_here"),
  // Setting multiple headers
  HttpClientRequest.setHeaders({
    "Content-Type": "application/json; charset=UTF-8",
    "Custom-Header": "CustomValue"
  })
)

console.log(JSON.stringify(req.headers, null, 2))
/*
Output:
{
  "authorization": "Bearer your_token_here",
  "content-type": "application/json; charset=UTF-8",
  "custom-header": "CustomValue"
}
*/
```

### basicAuth

To include basic authentication in your HTTP request, you can use the `basicAuth` method provided by `HttpClientRequest`.

```ts
import { HttpClientRequest } from "@effect/platform"

const req = HttpClientRequest.get("https://api.example.com/data").pipe(
  HttpClientRequest.basicAuth("your_username", "your_password")
)

console.log(JSON.stringify(req.headers, null, 2))
/*
Output:
{
  "authorization": "Basic eW91cl91c2VybmFtZTp5b3VyX3Bhc3N3b3Jk"
}
*/
```

### bearerToken

To include a Bearer token in your HTTP request, use the `bearerToken` method provided by `HttpClientRequest`.

```ts
import { HttpClientRequest } from "@effect/platform"

const req = HttpClientRequest.get("https://api.example.com/data").pipe(
  HttpClientRequest.bearerToken("your_token")
)

console.log(JSON.stringify(req.headers, null, 2))
/*
Output:
{
  "authorization": "Bearer your_token"
}
*/
```

### accept

To specify the media types that are acceptable for the response, use the `accept` method provided by `HttpClientRequest`.

```ts
import { HttpClientRequest } from "@effect/platform"

const req = HttpClientRequest.get("https://api.example.com/data").pipe(
  HttpClientRequest.accept("application/xml")
)

console.log(JSON.stringify(req.headers, null, 2))
/*
Output:
{
  "accept": "application/xml"
}
*/
```

### acceptJson

To indicate that the client accepts JSON responses, use the `acceptJson` method provided by `HttpClientRequest`.

```ts
import { HttpClientRequest } from "@effect/platform"

const req = HttpClientRequest.get("https://api.example.com/data").pipe(
  HttpClientRequest.acceptJson
)

console.log(JSON.stringify(req.headers, null, 2))
/*
Output:
{
  "accept": "application/json"
}
*/
```

## GET

### Converting the Response

The `HttpClientResponse` provides several methods to convert a response into different formats.

**Example: Converting to JSON**

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getPostAsJson = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )
  return yield* response.json
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

getPostAsJson.pipe(
  Effect.andThen((post) => Console.log(typeof post, post)),
  NodeRuntime.runMain
)
/*
Output:
object {
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

**Example: Converting to Text**

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getPostAsText = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )
  return yield* response.text
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

getPostAsText.pipe(
  Effect.andThen((post) => Console.log(typeof post, post)),
  NodeRuntime.runMain
)
/*
Output:
string {
  userId: 1,
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
  body: 'quia et suscipit\n' +
    'suscipit recusandae consequuntur expedita et cum\n' +
    'reprehenderit molestiae ut ut quas totam\n' +
    'nostrum rerum est autem sunt rem eveniet architecto'
}
*/
```

**Methods Summary**

| Method          | Description                           |
| --------------- | ------------------------------------- |
| `arrayBuffer`   | Convert to `ArrayBuffer`              |
| `formData`      | Convert to `FormData`                 |
| `json`          | Convert to JSON                       |
| `stream`        | Convert to a `Stream` of `Uint8Array` |
| `text`          | Convert to text                       |
| `urlParamsBody` | Convert to `UrlParams`                |

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClientResponse` module is integrated with `@effect/schema`.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Console, Effect } from "effect"

const Post = Schema.Struct({
  id: Schema.Number,
  title: Schema.String
})

const getPostAndValidate = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  )
  return yield* HttpClientResponse.schemaBodyJson(Post)(response)
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

getPostAndValidate.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit'
}
*/
```

In this example, we define a schema for a post object with properties `id` and `title`. Then, we fetch the data and validate it against this schema using `HttpClientResponse.schemaBodyJson`. Finally, we log the validated post object.

Note that we use `Effect.scoped` after consuming the response. This ensures that any resources associated with the HTTP request are properly cleaned up once we're done processing the response.

### Filtering And Error Handling

It's important to note that `HttpClient.get` doesn't consider non-`200` status codes as errors by default. This design choice allows for flexibility in handling different response scenarios. For instance, you might have a schema union where the status code serves as the discriminator, enabling you to define a schema that encompasses all possible response cases.

You can use `HttpClient.filterStatusOk` to ensure only `2xx` responses are treated as successes.

In this example, we attempt to fetch a non-existent page and don't receive any error:

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getText = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/non-existing-page"
  )
  return yield* response.text
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

getText.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{}
*/
```

However, if we use `HttpClient.filterStatusOk`, an error is logged:

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getText = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/non-existing-page"
  )
  return yield* response.text
}).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer))

getText.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
[17:37:59.923] ERROR (#0):
  ResponseError: StatusCode: non 2xx status code (404 GET https://jsonplaceholder.typicode.com/non-existing-page)
      ... stack trace ...
*/
```

## POST

To make a POST request, you can use the `HttpClientRequest.post` function provided by the `HttpClientRequest` module. Here's an example of how to create and send a POST request:

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const addPost = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  return yield* HttpClientRequest.post(
    "https://jsonplaceholder.typicode.com/posts"
  ).pipe(
    HttpClientRequest.bodyJson({
      title: "foo",
      body: "bar",
      userId: 1
    }),
    Effect.flatMap(client.execute),
    Effect.flatMap((res) => res.json),
    Effect.scoped
  )
}).pipe(Effect.provide(FetchHttpClient.layer))

addPost.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

If you need to send data in a format other than JSON, such as plain text, you can use different APIs provided by `HttpClientRequest`.

In the following example, we send the data as text:

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const addPost = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  return yield* HttpClientRequest.post(
    "https://jsonplaceholder.typicode.com/posts"
  ).pipe(
    HttpClientRequest.bodyText(
      JSON.stringify({
        title: "foo",
        body: "bar",
        userId: 1
      }),
      "application/json; charset=UTF-8"
    ),
    client.execute,
    Effect.flatMap((res) => res.json),
    Effect.scoped
  )
}).pipe(Effect.provide(FetchHttpClient.layer))

addPost.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClientResponse` module is integrated with `@effect/schema`.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Console, Effect } from "effect"

const Post = Schema.Struct({
  id: Schema.Number,
  title: Schema.String
})

const addPost = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  return yield* HttpClientRequest.post(
    "https://jsonplaceholder.typicode.com/posts"
  ).pipe(
    HttpClientRequest.bodyText(
      JSON.stringify({
        title: "foo",
        body: "bar",
        userId: 1
      }),
      "application/json; charset=UTF-8"
    ),
    client.execute,
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Post)),
    Effect.scoped
  )
}).pipe(Effect.provide(FetchHttpClient.layer))

addPost.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{ id: 101, title: 'foo' }
*/
```

## Testing

### Injecting Fetch

To test HTTP requests, you can inject a mock fetch implementation.

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect, Layer } from "effect"
import * as assert from "node:assert"

// Mock fetch implementation
const FetchTest = Layer.succeed(FetchHttpClient.Fetch, () =>
  Promise.resolve(new Response("not found", { status: 404 }))
)

const TestLayer = FetchHttpClient.layer.pipe(Layer.provide(FetchTest))

const program = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  return yield* client.get("https://www.google.com/").pipe(
    Effect.flatMap((res) => res.text),
    Effect.scoped
  )
})

// Test
Effect.gen(function* () {
  const response = yield* program
  assert.equal(response, "not found")
}).pipe(Effect.provide(TestLayer), Effect.runPromise)
```

# HTTP Server

## Overview

This section provides a simplified explanation of key concepts within the `@effect/platform` TypeScript library, focusing on components used to build HTTP servers. Understanding these terms and their relationships helps in structuring and managing server applications effectively.

### Core Concepts

- **HttpApp**: This is an `Effect` which results in a value `A`. It can utilize `ServerRequest` to produce the outcome `A`. Essentially, an `HttpApp` represents an application component that handles HTTP requests and generates responses based on those requests.

- **Default** (HttpApp): A special type of `HttpApp` that specifically produces a `ServerResponse` as its output `A`. This is the most common form of application where each interaction is expected to result in an HTTP response.

- **Server**: A construct that takes a `Default` app and converts it into an `Effect`. This serves as the execution layer where the `Default` app is operated, handling incoming requests and serving responses.

- **Router**: A type of `Default` app where the possible error outcome is `RouteNotFound`. Routers are used to direct incoming requests to appropriate handlers based on the request path and method.

- **Handler**: Another form of `Default` app, which has access to both `RouteContext` and `ServerRequest.ParsedSearchParams`. Handlers are specific functions designed to process requests and generate responses.

- **Middleware**: Functions that transform a `Default` app into another `Default` app. Middleware can be used to modify requests, responses, or handle tasks like logging, authentication, and more. Middleware can be applied in two ways:
  - On a `Router` using `router.use: Handler -> Default` which applies the middleware to specific routes.
  - On a `Server` using `server.serve: () -> Layer | Middleware -> Layer` which applies the middleware globally to all routes handled by the server.

### Applying Concepts

These components are designed to work together in a modular and flexible way, allowing developers to build complex server applications with reusable components. Here's how you might typically use these components in a project:

1. **Create Handlers**: Define functions that process specific types of requests (e.g., GET, POST) and return responses.

2. **Set Up Routers**: Organize handlers into routers, where each router manages a subset of application routes.

3. **Apply Middleware**: Enhance routers or entire servers with middleware to add extra functionality like error handling or request logging.

4. **Initialize the Server**: Wrap the main router with server functionality, applying any server-wide middleware, and start listening for requests.

## Getting Started

### Hello world example

In this example, we will create a simple HTTP server that listens on port `3000`. The server will respond with "Hello World!" when a request is made to the root URL (/) and return a `500` error for all other paths.

Node.js Example

```ts
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World"))
)

// Set up the application server with logging
const app = router.pipe(HttpServer.serve(), HttpServer.withLogAddress)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))

/*
Output:
timestamp=... level=INFO fiber=#0 message="Listening on http://localhost:3000"
*/
```

> [!NOTE]
> The `HttpServer.withLogAddress` middleware logs the address and port where the server is listening, helping to confirm that the server is running correctly and accessible on the expected endpoint.

Bun Example

```ts
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Layer } from "effect"

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World"))
)

// Set up the application server with logging
const app = router.pipe(HttpServer.serve(), HttpServer.withLogAddress)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = BunHttpServer.layer({ port })

// Run the application
BunRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))

/*
Output:
timestamp=... level=INFO fiber=#0 message="Listening on http://localhost:3000"
*/
```

To avoid boilerplate code for the final server setup, we'll use a helper function from the `listen.ts` file:

```ts
import type { HttpPlatform, HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

export const listen = (
  app: Layer.Layer<
    never,
    never,
    HttpPlatform.HttpPlatform | HttpServer.HttpServer
  >,
  port: number
) =>
  NodeRuntime.runMain(
    Layer.launch(
      Layer.provide(
        app,
        NodeHttpServer.layer(() => createServer(), { port })
      )
    )
  )
```

### Basic routing

Routing refers to determining how an application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

Route definition takes the following structure:

```
router.pipe(HttpRouter.METHOD(PATH, HANDLER))
```

Where:

- **router** is an instance of `Router` (`import type { Router } from "@effect/platform/Http/Router"`).
- **METHOD** is an HTTP request method, in lowercase (e.g., get, post, put, del).
- **PATH** is the path on the server (e.g., "/", "/user").
- **HANDLER** is the action that gets executed when the route is matched.

The following examples illustrate defining simple routes.

Respond with `"Hello World!"` on the homepage:

```ts
router.pipe(HttpRouter.get("/", HttpServerResponse.text("Hello World")))
```

Respond to POST request on the root route (/), the application's home page:

```ts
router.pipe(HttpRouter.post("/", HttpServerResponse.text("Got a POST request")))
```

Respond to a PUT request to the `/user` route:

```ts
router.pipe(
  HttpRouter.put("/user", HttpServerResponse.text("Got a PUT request at /user"))
)
```

Respond to a DELETE request to the `/user` route:

```ts
router.pipe(
  HttpRouter.del(
    "/user",
    HttpServerResponse.text("Got a DELETE request at /user")
  )
)
```

### Serving static files

To serve static files such as images, CSS files, and JavaScript files, use the `HttpServerResponse.file` built-in action.

```ts
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { listen } from "./listen.js"

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.file("index.html"))
)

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

Create an `index.html` file in your project directory:

```html filename="index.html"
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>index.html</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    index.html
  </body>
</html>
```

## Routing

Routing refers to how an application's endpoints (URIs) respond to client requests.

You define routing using methods of the `HttpRouter` object that correspond to HTTP methods; for example, `HttpRouter.get()` to handle GET requests and `HttpRouter.post` to handle POST requests. You can also use `HttpRouter.all()` to handle all HTTP methods.

These routing methods specify a `Route.Handler` called when the application receives a request to the specified route (endpoint) and HTTP method. In other words, the application “listens” for requests that match the specified route(s) and method(s), and when it detects a match, it calls the specified handler.

The following code is an example of a very basic route.

```ts
// respond with "hello world" when a GET request is made to the homepage
HttpRouter.get("/", HttpServerResponse.text("Hello World"))
```

### Route methods

A route method is derived from one of the HTTP methods, and is attached to an instance of the `HttpRouter` object.

The following code is an example of routes that are defined for the GET and the POST methods to the root of the app.

```ts
// GET method route
HttpRouter.get("/", HttpServerResponse.text("GET request to the homepage"))

// POST method route
HttpRouter.post("/", HttpServerResponse.text("POST request to the homepage"))
```

`HttpRouter` supports methods that correspond to all HTTP request methods: `get`, `post`, and so on.

There is a special routing method, `HttpRouter.all()`, used to load middleware functions at a path for **all** HTTP request methods. For example, the following handler is executed for requests to the route “/secret” whether using GET, POST, PUT, DELETE.

```ts
HttpRouter.all(
  "/secret",
  HttpServerResponse.empty().pipe(
    Effect.tap(Console.log("Accessing the secret section ..."))
  )
)
```

### Route paths

Route paths, when combined with a request method, define the endpoints where requests can be made. Route paths can be specified as strings according to the following type:

```ts
type PathInput = `/${string}` | "*"
```

> [!NOTE]
> Query strings are not part of the route path.

Here are some examples of route paths based on strings.

This route path will match requests to the root route, /.

```ts
HttpRouter.get("/", HttpServerResponse.text("root"))
```

This route path will match requests to `/user`.

```ts
HttpRouter.get("/user", HttpServerResponse.text("user"))
```

This route path matches requests to any path starting with `/user` (e.g., `/user`, `/users`, etc.)

```ts
HttpRouter.get(
  "/user*",
  Effect.map(HttpServerRequest.HttpServerRequest, (req) =>
    HttpServerResponse.text(req.url)
  )
)
```

### Route parameters

Route parameters are named URL segments that are used to capture the values specified at their position in the URL. By using a schema the captured values are populated in an object, with the name of the route parameter specified in the path as their respective keys.

Route parameters are named segments in a URL that capture the values specified at those positions. These captured values are stored in an object, with the parameter names used as keys.

For example:

```
Route path: /users/:userId/books/:bookId
Request URL: http://localhost:3000/users/34/books/8989
params: { "userId": "34", "bookId": "8989" }
```

To define routes with parameters, include the parameter names in the path and use a schema to validate and parse these parameters, as shown below.

```ts
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Define the schema for route parameters
const Params = Schema.Struct({
  userId: Schema.String,
  bookId: Schema.String
})

// Create a router with a route that captures parameters
const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/users/:userId/books/:bookId",
    HttpRouter.schemaPathParams(Params).pipe(
      Effect.flatMap((params) => HttpServerResponse.json(params))
    )
  )
)

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

### Response methods

The methods on `HttpServerResponse` object in the following table can send a response to the client, and terminate the request-response cycle. If none of these methods are called from a route handler, the client request will be left hanging.

| Method       | Description                    |
| ------------ | ------------------------------ |
| **empty**    | Sends an empty response.       |
| **formData** | Sends form data.               |
| **html**     | Sends an HTML response.        |
| **raw**      | Sends a raw response.          |
| **setBody**  | Sets the body of the response. |
| **stream**   | Sends a streaming response.    |
| **text**     | Sends a plain text response.   |

### Router

Use the `HttpRouter` object to create modular, mountable route handlers. A `Router` instance is a complete middleware and routing system, often referred to as a "mini-app."

The following example shows how to create a router as a module, define some routes, and mount the router module on a path in the main app.

Create a file named `birds.ts` in your app directory with the following content:

```ts
import { HttpRouter, HttpServerResponse } from "@effect/platform"

export const birds = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Birds home page")),
  HttpRouter.get("/about", HttpServerResponse.text("About birds"))
)
```

In your main application file, load the router module and mount it.

```ts
import { HttpRouter, HttpServer } from "@effect/platform"
import { birds } from "./birds.js"
import { listen } from "./listen.js"

// Create the main router and mount the birds router
const router = HttpRouter.empty.pipe(HttpRouter.mount("/birds", birds))

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

When you run this code, your application will be able to handle requests to `/birds` and `/birds/about`, serving the respective responses defined in the `birds` router module.

## Writing Middleware

In this section, we'll build a simple "Hello World" application and demonstrate how to add three middleware functions: `myLogger` for logging, `requestTime` for displaying request timestamps, and `validateCookies` for validating incoming cookies.

### Example Application

Here is an example of a basic "Hello World" application with middleware.

### Middleware `myLogger`

This middleware logs "LOGGED" whenever a request passes through it.

```ts
const myLogger = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    console.log("LOGGED")
    return yield* app
  })
)
```

To use the middleware, add it to the router using `HttpRouter.use()`:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

const myLogger = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    console.log("LOGGED")
    return yield* app
  })
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World"))
)

const app = router.pipe(HttpRouter.use(myLogger), HttpServer.serve())

listen(app, 3000)
```

With this setup, every request to the app will log "LOGGED" to the terminal. Middleware execute in the order they are loaded.

### Middleware `requestTime`

Next, we'll create a middleware that records the timestamp of each HTTP request and provides it via a service called `RequestTime`.

```ts
class RequestTime extends Context.Tag("RequestTime")<RequestTime, number>() {}

const requestTime = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    return yield* app.pipe(Effect.provideService(RequestTime, Date.now()))
  })
)
```

Update the app to use this middleware and display the timestamp in the response:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Context, Effect } from "effect"
import { listen } from "./listen.js"

class RequestTime extends Context.Tag("RequestTime")<RequestTime, number>() {}

const requestTime = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    return yield* app.pipe(Effect.provideService(RequestTime, Date.now()))
  })
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      const requestTime = yield* RequestTime
      const responseText = `Hello World<br/><small>Requested at: ${requestTime}</small>`
      return yield* HttpServerResponse.html(responseText)
    })
  )
)

const app = router.pipe(HttpRouter.use(requestTime), HttpServer.serve())

listen(app, 3000)
```

Now, when you make a request to the root path, the response will include the timestamp of the request.

### Middleware `validateCookies`

Finally, we'll create a middleware that validates incoming cookies. If the cookies are invalid, it sends a 400 response.

Here's an example that validates cookies using an external service:

```ts
class CookieError {
  readonly _tag = "CookieError"
}

const externallyValidateCookie = (testCookie: string | undefined) =>
  testCookie && testCookie.length > 0
    ? Effect.succeed(testCookie)
    : Effect.fail(new CookieError())

const cookieValidator = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    yield* externallyValidateCookie(req.cookies.testCookie)
    return yield* app
  }).pipe(
    Effect.catchTag("CookieError", () =>
      HttpServerResponse.text("Invalid cookie")
    )
  )
)
```

Update the app to use the `cookieValidator` middleware:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

class CookieError {
  readonly _tag = "CookieError"
}

const externallyValidateCookie = (testCookie: string | undefined) =>
  testCookie && testCookie.length > 0
    ? Effect.succeed(testCookie)
    : Effect.fail(new CookieError())

const cookieValidator = HttpMiddleware.make((app) =>
  Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    yield* externallyValidateCookie(req.cookies.testCookie)
    return yield* app
  }).pipe(
    Effect.catchTag("CookieError", () =>
      HttpServerResponse.text("Invalid cookie")
    )
  )
)

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World"))
)

const app = router.pipe(HttpRouter.use(cookieValidator), HttpServer.serve())

listen(app, 3000)
```

Test the middleware with the following commands:

```sh
curl -i http://localhost:3000
curl -i http://localhost:3000 --cookie "testCookie=myvalue"
curl -i http://localhost:3000 --cookie "testCookie="
```

This setup validates the `testCookie` and returns "Invalid cookie" if the validation fails, or "Hello World" if it passes.

## Applying Middleware in Your Application

Middleware functions are powerful tools that allow you to modify the request-response cycle. Middlewares can be applied at various levels to achieve different scopes of influence:

- **Route Level**: Apply middleware to individual routes.
- **Router Level**: Apply middleware to a group of routes within a single router.
- **Server Level**: Apply middleware across all routes managed by a server.

### Applying Middleware at the Route Level

At the route level, middlewares are applied to specific endpoints, allowing for targeted modifications or enhancements such as logging, authentication, or parameter validation for a particular route.

**Example**

Here's a practical example showing how to apply middleware at the route level:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Middleware constructor that logs the name of the middleware
const withMiddleware = (name: string) =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      console.log(name) // Log the middleware name when the route is accessed
      return yield* app // Continue with the original application flow
    })
  )

const router = HttpRouter.empty.pipe(
  // Applying middleware to route "/a"
  HttpRouter.get("/a", HttpServerResponse.text("a").pipe(withMiddleware("M1"))),
  // Applying middleware to route "/b"
  HttpRouter.get("/b", HttpServerResponse.text("b").pipe(withMiddleware("M2")))
)

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

**Testing the Middleware**

You can test the middleware by making requests to the respective routes and observing the console output:

```sh
# Test route /a
curl -i http://localhost:3000/a
# Expected console output: M1

# Test route /b
curl -i http://localhost:3000/b
# Expected console output: M2
```

### Applying Middleware at the Router Level

Applying middleware at the router level is an efficient way to manage common functionalities across multiple routes within your application. Middleware can handle tasks such as logging, authentication, and response modifications before reaching the actual route handlers.

**Example**

Here's how you can structure and apply middleware across different routers using the `@effect/platform` library:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Middleware constructor that logs the name of the middleware
const withMiddleware = (name: string) =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      console.log(name) // Log the middleware name when a route is accessed
      return yield* app // Continue with the original application flow
    })
  )

// Define Router1 with specific routes
const router1 = HttpRouter.empty.pipe(
  HttpRouter.get("/a", HttpServerResponse.text("a")), // Middleware M4, M3, M1 will apply
  HttpRouter.get("/b", HttpServerResponse.text("b")), // Middleware M4, M3, M1 will apply
  // Apply Middleware at the router level
  HttpRouter.use(withMiddleware("M1")),
  HttpRouter.get("/c", HttpServerResponse.text("c")) // Middleware M4, M3 will apply
)

// Define Router2 with specific routes
const router2 = HttpRouter.empty.pipe(
  HttpRouter.get("/d", HttpServerResponse.text("d")), // Middleware M4, M2 will apply
  HttpRouter.get("/e", HttpServerResponse.text("e")), // Middleware M4, M2 will apply
  HttpRouter.get("/f", HttpServerResponse.text("f")), // Middleware M4, M2 will apply
  // Apply Middleware at the router level
  HttpRouter.use(withMiddleware("M2"))
)

// Main router combining Router1 and Router2
const router = HttpRouter.empty.pipe(
  HttpRouter.mount("/r1", router1),
  // Apply Middleware affecting all routes under /r1
  HttpRouter.use(withMiddleware("M3")),
  HttpRouter.get("/g", HttpServerResponse.text("g")), // Only Middleware M4 will apply
  HttpRouter.mount("/r2", router2),
  // Apply Middleware affecting all routes
  HttpRouter.use(withMiddleware("M4"))
)

// Configure the application with the server middleware
const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

**Testing the Middleware**

To ensure that the middleware is working as expected, you can test it by making HTTP requests to the defined routes and checking the console output for middleware logs:

```sh
# Test route /a under router1
curl -i http://localhost:3000/r1/a
# Expected console output: M4 M3 M1

# Test route /c under router1
curl -i http://localhost:3000/r1/c
# Expected console output: M4 M3

# Test route /d under router2
curl -i http://localhost:3000/r2/d
# Expected console output: M4 M2

# Test route /g under the main router
curl -i http://localhost:3000/g
# Expected console output: M4
```

### Applying Middleware at the Server Level

Applying middleware at the server level allows you to introduce certain functionalities, such as logging, authentication, or general request processing, that affect every request handled by the server. This ensures that all incoming requests, regardless of the route, pass through the applied middleware, making it an essential feature for global error handling, logging, or authentication.

**Example**

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Middleware constructor that logs the name of the middleware
const withMiddleware = (name: string) =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      console.log(name) // Log the middleware name when the route is accessed
      return yield* app // Continue with the original application flow
    })
  )

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/a", HttpServerResponse.text("a").pipe(withMiddleware("M1"))),
  HttpRouter.get("/b", HttpServerResponse.text("b")),
  HttpRouter.use(withMiddleware("M2")),
  HttpRouter.get("/", HttpServerResponse.text("root"))
)

const app = router.pipe(HttpServer.serve(withMiddleware("M3")))

listen(app, 3000)
```

**Testing the Middleware**

To confirm the middleware is functioning as intended, you can send HTTP requests to the defined routes and check the console for middleware logs:

```sh
# Test route /a and observe the middleware logs
curl -i http://localhost:3000/a
# Expected console output: M3 M2 M1  - Middleware M3 (server-level), M2 (router-level), and M1 (route-level) apply.

# Test route /b and observe the middleware logs
curl -i http://localhost:3000/b
# Expected console output: M3 M2  - Middleware M3 (server-level) and M2 (router-level) apply.

# Test route / and observe the middleware logs
curl -i http://localhost:3000/
# Expected console output: M3 M2  - Middleware M3 (server-level) and M2 (router-level) apply.
```

### Applying Multiple Middlewares

Middleware functions are simply functions that transform a `Default` app into another `Default` app. This flexibility allows for stacking multiple middleware functions, much like composing functions in functional programming. The `flow` function from the `Effect` library facilitates this by enabling function composition.

**Example**

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { Effect, flow } from "effect"
import { listen } from "./listen.js"

// Middleware constructor that logs the middleware's name when a route is accessed
const withMiddleware = (name: string) =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      console.log(name) // Log the middleware name
      return yield* app // Continue with the original application flow
    })
  )

// Setup routes and apply multiple middlewares using flow for function composition
const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/a",
    HttpServerResponse.text("a").pipe(
      flow(withMiddleware("M1"), withMiddleware("M2"))
    )
  ),
  HttpRouter.get("/b", HttpServerResponse.text("b")),
  // Apply combined middlewares to the entire router
  HttpRouter.use(flow(withMiddleware("M3"), withMiddleware("M4"))),
  HttpRouter.get("/", HttpServerResponse.text("root"))
)

// Apply combined middlewares at the server level
const app = router.pipe(
  HttpServer.serve(flow(withMiddleware("M5"), withMiddleware("M6")))
)

listen(app, 3000)
```

**Testing the Middleware Composition**

To verify that the middleware is functioning as expected, you can send HTTP requests to the routes and check the console for the expected middleware log output:

```sh
# Test route /a to see the output from multiple middleware layers
curl -i http://localhost:3000/a
# Expected console output: M6 M5 M4 M3 M2 M1

# Test route /b where fewer middleware are applied
curl -i http://localhost:3000/b
# Expected console output: M6 M5 M4 M3

# Test the root route to confirm top-level middleware application
curl -i http://localhost:3000/
# Expected console output: M6 M5
```

## Built-in middleware

### Middleware Summary

| Middleware            | Description                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Logger**            | Provides detailed logging of all requests and responses, aiding in debugging and monitoring application activities.               |
| **xForwardedHeaders** | Manages `X-Forwarded-*` headers to accurately maintain client information such as IP addresses and host names in proxy scenarios. |

### logger

The `HttpMiddleware.logger` middleware enables logging for your entire application, providing insights into each request and response. Here's how to set it up:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { listen } from "./listen.js"

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World"))
)

// Apply the logger middleware globally
const app = router.pipe(HttpServer.serve(HttpMiddleware.logger))

listen(app, 3000)
/*
curl -i http://localhost:3000
timestamp=... level=INFO fiber=#0 message="Listening on http://0.0.0.0:3000"
timestamp=... level=INFO fiber=#19 message="Sent HTTP response" http.span.1=8ms http.status=200 http.method=GET http.url=/
timestamp=... level=INFO fiber=#20 cause="RouteNotFound: GET /favicon.ico not found
    at ...
    at http.server GET" http.span.2=4ms http.status=500 http.method=GET http.url=/favicon.ico
*/
```

To disable the logger for specific routes, you can use `HttpMiddleware.withLoggerDisabled`:

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { listen } from "./listen.js"

// Create the router with routes that will and will not have logging
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("Hello World")),
  HttpRouter.get(
    "/no-logger",
    HttpServerResponse.text("no-logger").pipe(HttpMiddleware.withLoggerDisabled)
  )
)

// Apply the logger middleware globally
const app = router.pipe(HttpServer.serve(HttpMiddleware.logger))

listen(app, 3000)
/*
curl -i http://localhost:3000/no-logger
timestamp=2024-05-19T09:53:29.877Z level=INFO fiber=#0 message="Listening on http://0.0.0.0:3000"
*/
```

### xForwardedHeaders

This middleware handles `X-Forwarded-*` headers, useful when your app is behind a reverse proxy or load balancer and you need to retrieve the original client's IP and host information.

```ts
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Create a router and a route that logs request headers and remote address
const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      console.log(req.headers)
      console.log(req.remoteAddress)
      return yield* HttpServerResponse.text("Hello World")
    })
  )
)

// Set up the server with xForwardedHeaders middleware
const app = router.pipe(HttpServer.serve(HttpMiddleware.xForwardedHeaders))

listen(app, 3000)
/*
curl -H "X-Forwarded-Host: 192.168.1.1" -H "X-Forwarded-For: 192.168.1.1" http://localhost:3000
timestamp=... level=INFO fiber=#0 message="Listening on http://0.0.0.0:3000"
{
  host: '192.168.1.1',
  'user-agent': 'curl/8.6.0',
  accept: '*\/*',
  'x-forwarded-host': '192.168.1.1',
  'x-forwarded-for': '192.168.1.1'
}
{ _id: 'Option', _tag: 'Some', value: '192.168.1.1' }
*/
```

## Error Handling

### Catching Errors

Below is an example illustrating how to catch and manage errors that occur during the execution of route handlers:

```ts
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Define routes that might throw errors or fail
const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/throw",
    Effect.sync(() => {
      throw new Error("BROKEN") // This will intentionally throw an error
    })
  ),
  HttpRouter.get("/fail", Effect.fail("Uh oh!")) // This will intentionally fail
)

// Configure the application to handle different types of errors
const app = router.pipe(
  Effect.catchTags({
    RouteNotFound: () =>
      HttpServerResponse.text("Route Not Found", { status: 404 })
  }),
  Effect.catchAllCause((cause) =>
    HttpServerResponse.text(cause.toString(), { status: 500 })
  ),
  HttpServer.serve()
)

listen(app, 3000)
```

You can test the error handling setup with `curl` commands by trying to access routes that trigger errors:

```sh
# Accessing a route that does not exist
curl -i http://localhost:3000/nonexistent

# Accessing the route that throws an error
curl -i http://localhost:3000/throw

# Accessing the route that fails
curl -i http://localhost:3000/fail
```

## Validations

Validation is a critical aspect of handling HTTP requests to ensure that the data your server receives is as expected. We'll explore how to validate headers and cookies using the `@effect/platform` and `@effect/schema` libraries, which provide structured and robust methods for these tasks.

### Headers

Headers often contain important information needed by your application, such as content types, authentication tokens, or session data. Validating these headers ensures that your application can trust and correctly process the information it receives.

```ts
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      // Define the schema for expected headers and validate them
      const headers = yield* HttpServerRequest.schemaHeaders(
        Schema.Struct({ test: Schema.String })
      )
      return yield* HttpServerResponse.text("header: " + headers.test)
    }).pipe(
      // Handle parsing errors
      Effect.catchTag("ParseError", (e) =>
        HttpServerResponse.text(`Invalid header: ${e.message}`)
      )
    )
  )
)

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

You can test header validation using the following `curl` commands:

```sh
# Request without the required header
curl -i http://localhost:3000

# Request with the valid header
curl -i -H "test: myvalue" http://localhost:3000
```

### Cookies

Cookies are commonly used to maintain session state or user preferences. Validating cookies ensures that the data they carry is intact and as expected, enhancing security and application integrity.

Here's how you can validate cookies received in HTTP requests:

```ts
import {
  Cookies,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      const cookies = yield* HttpServerRequest.schemaCookies(
        Schema.Struct({ test: Schema.String })
      )
      return yield* HttpServerResponse.text("cookie: " + cookies.test)
    }).pipe(
      Effect.catchTag("ParseError", (e) =>
        HttpServerResponse.text(`Invalid cookie: ${e.message}`)
      )
    )
  )
)

const app = router.pipe(HttpServer.serve())

listen(app, 3000)
```

Validate the cookie handling with the following `curl` commands:

```sh
# Request without any cookies
curl -i http://localhost:3000

# Request with the valid cookie
curl -i http://localhost:3000 --cookie "test=myvalue"
```

## ServerRequest

### How do I get the raw request?

The native request object depends on the platform you are using, and it is not directly modeled in `@effect/platform`. Instead, you need to refer to the specific platform package you are working with, such as `@effect/platform-node` or `@effect/platform-bun`.

Here is an example using Node.js:

```ts
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { NodeHttpServer, NodeHttpServerRequest } from "@effect/platform-node"
import { Effect } from "effect"
import { listen } from "./listen.js"

const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/",
    Effect.gen(function* () {
      const req = yield* HttpServerRequest.HttpServerRequest
      const raw = NodeHttpServerRequest.toIncomingMessage(req)
      console.log(raw)
      return HttpServerResponse.empty()
    })
  )
)

listen(HttpServer.serve(router), 3000)
```

## Conversions

### toWebHandler

The `toWebHandler` function converts a `Default` (i.e. a type of `HttpApp` that specifically produces a `ServerResponse` as its output) into a web handler that can process `Request` objects and return `Response` objects.

```ts
import { HttpApp, HttpRouter, HttpServerResponse } from "@effect/platform"

// Define the router with some routes
const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", HttpServerResponse.text("content 1")),
  HttpRouter.get("/foo", HttpServerResponse.text("content 2"))
)

// Convert the router to a web handler
// const handler: (request: Request) => Promise<Response>
const handler = HttpApp.toWebHandler(router)

// Test the handler with a request
const response = await handler(new Request("http://localhost:3000/foo"))
console.log(await response.text()) // Output: content 2
```
