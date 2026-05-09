# Introduction

Welcome to the documentation for `@effect/platform`, a library designed for creating platform-independent abstractions (Node.js, Bun, browsers).

> [!WARNING]
> This documentation focuses on **unstable modules**. For stable modules, refer to the [official website documentation](https://effect.website/docs/guides/platform/introduction).

# Running Your Main Program with runMain

Docs for `runMain` have been moved to the [official website](https://effect.website/docs/platform/runtime/).

# HTTP API

## Overview

The `HttpApi*` modules offer a flexible and declarative way to define HTTP APIs.

To define an API, create a set of `HttpEndpoint`s. Each endpoint is described by a path, a method, and schemas for the request and response.

Collections of endpoints are grouped in an `HttpApiGroup`, and multiple groups can be merged into a complete `HttpApi`.

```
HttpApi
├── HttpGroup
│   ├── HttpEndpoint
│   └── HttpEndpoint
└── HttpGroup
    ├── HttpEndpoint
    ├── HttpEndpoint
    └── HttpEndpoint
```

Once your API is defined, the same definition can be reused for multiple purposes:

- **Starting a Server**: Use the API definition to implement and serve endpoints.
- **Generating Documentation**: Create a Swagger page to document the API.
- **Deriving a Client**: Generate a fully-typed client for your API.

Benefits of a Single API Definition:

- **Consistency**: A single definition ensures the server, documentation, and client remain aligned.
- **Reduced Maintenance**: Changes to the API are reflected across all related components.
- **Simplified Workflow**: Avoids duplication by consolidating API details in one place.

## Hello World

### Defining and Implementing an API

This example demonstrates how to define and implement a simple API with a single endpoint that returns a string response. The structure of the API is as follows:

```
HttpApi ("MyApi)
└── HttpGroup ("Greetings")
    └── HttpEndpoint ("hello-world")
```

**Example** (Hello World Definition)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

// Define our API with one group named "Greetings" and one endpoint called "hello-world"
const MyApi = HttpApi.make("MyApi").add(
  HttpApiGroup.make("Greetings").add(
    HttpApiEndpoint.get("hello-world")`/`.addSuccess(Schema.String)
  )
)

// Implement the "Greetings" group
const GreetingsLive = HttpApiBuilder.group(MyApi, "Greetings", (handlers) =>
  handlers.handle("hello-world", () => Effect.succeed("Hello, World!"))
)

// Provide the implementation for the API
const MyApiLive = HttpApiBuilder.api(MyApi).pipe(Layer.provide(GreetingsLive))

// Set up the server using NodeHttpServer on port 3000
const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

// Launch the server
Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
```

After running the code, open a browser and navigate to http://localhost:3000. The server will respond with:

```
Hello, World!
```

### Serving The Auto Generated Swagger Documentation

You can enhance your API by adding auto-generated Swagger documentation using the `HttpApiSwagger` module. This makes it easier for developers to explore and interact with your API.

To include Swagger in your server setup, provide the `HttpApiSwagger.layer` when configuring the server.

**Example** (Serving Swagger Documentation)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSwagger
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const MyApi = HttpApi.make("MyApi").add(
  HttpApiGroup.make("Greetings").add(
    HttpApiEndpoint.get("hello-world")`/`.addSuccess(Schema.String)
  )
)

const GreetingsLive = HttpApiBuilder.group(MyApi, "Greetings", (handlers) =>
  handlers.handle("hello-world", () => Effect.succeed("Hello, World!"))
)

const MyApiLive = HttpApiBuilder.api(MyApi).pipe(Layer.provide(GreetingsLive))

const ServerLive = HttpApiBuilder.serve().pipe(
  // Provide the Swagger layer so clients can access auto-generated docs
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
```

After running the server, open your browser and navigate to http://localhost:3000/docs.

This URL will display the Swagger documentation, allowing you to explore the API's endpoints, request parameters, and response structures interactively.

![Swagger Documentation](./images/swagger-hello-world.png)

### Deriving a Client

Once you have defined your API, you can generate a client to interact with it using the `HttpApiClient` module. This allows you to call your API endpoints without manually handling HTTP requests.

**Example** (Deriving and Using a Client)

```ts
import {
  FetchHttpClient,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSwagger
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const MyApi = HttpApi.make("MyApi").add(
  HttpApiGroup.make("Greetings").add(
    HttpApiEndpoint.get("hello-world")`/`.addSuccess(Schema.String)
  )
)

const GreetingsLive = HttpApiBuilder.group(MyApi, "Greetings", (handlers) =>
  handlers.handle("hello-world", () => Effect.succeed("Hello, World!"))
)

const MyApiLive = HttpApiBuilder.api(MyApi).pipe(Layer.provide(GreetingsLive))

const ServerLive = HttpApiBuilder.serve().pipe(
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(MyApiLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)

// Create a program that derives and uses the client
const program = Effect.gen(function* () {
  // Derive the client
  const client = yield* HttpApiClient.make(MyApi, {
    baseUrl: "http://localhost:3000"
  })
  // Call the "hello-world" endpoint
  const hello = yield* client.Greetings["hello-world"]()
  console.log(hello)
})

// Provide a Fetch-based HTTP client and run the program
Effect.runFork(program.pipe(Effect.provide(FetchHttpClient.layer)))
// Output: Hello, World!
```

## Defining a HttpApiEndpoint

An `HttpApiEndpoint` represents a single endpoint in your API. Each endpoint is defined with a name, path, HTTP method, and optional schemas for requests and responses. This allows you to describe the structure and behavior of your API.

Below is an example of a simple CRUD API for managing users, which includes the following endpoints:

- `GET /users` - Retrieve all users.
- `GET /users/:userId` - Retrieve a specific user by ID.
- `POST /users` - Create a new user.
- `DELETE /users/:userId` - Delete a user by ID.
- `PATCH /users/:userId` - Update a user by ID.

### GET

The `HttpApiEndpoint.get` method allows you to define a GET endpoint by specifying its name, path, and optionally, a schema for the response.

To define the structure of successful responses, use the `.addSuccess` method. If no schema is provided, the default response status is `204 No Content`.

**Example** (Defining a GET Endpoint to Retrieve All Users)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

// Define a schema representing a User entity
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

// Define the "getUsers" endpoint, returning a list of users
const getUsers = HttpApiEndpoint
  //      ┌─── Endpoint name
  //      │            ┌─── Endpoint path
  //      ▼            ▼
  .get("getUsers", "/users")
  // Define the success schema for the response (optional).
  // If no response schema is specified, the default response is `204 No Content`.
  .addSuccess(Schema.Array(User))
```

### Path Parameters

Path parameters allow you to include dynamic segments in your endpoint's path. There are two ways to define path parameters in your API.

#### Using setPath

The `setPath` method allows you to explicitly define path parameters by associating them with a schema.

**Example** (Defining Parameters with setPath)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

// Define a GET endpoint with a path parameter ":id"
const getUser = HttpApiEndpoint.get("getUser", "/user/:id")
  .setPath(
    Schema.Struct({
      // Define a schema for the "id" path parameter
      id: Schema.NumberFromString
    })
  )
  .addSuccess(User)
```

#### Using Template Strings

You can also define path parameters by embedding them in a template string with the help of `HttpApiSchema.param`.

**Example** (Defining Parameters using a Template String)

```ts
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

// Create a path parameter using HttpApiSchema.param
const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

// Define the GET endpoint using a template string
const getUser = HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(
  User
)
```

### POST

The `HttpApiEndpoint.post` method is used to define an endpoint for creating resources. You can specify a schema for the request body (payload) and a schema for the successful response.

**Example** (Defining a POST Endpoint with Payload and Success Schemas)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

// Define a schema for the user object
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

// Define a POST endpoint for creating a new user
const createUser = HttpApiEndpoint.post("createUser", "/users")
  // Define the request body schema (payload)
  .setPayload(
    Schema.Struct({
      name: Schema.String
    })
  )
  // Define the schema for a successful response
  .addSuccess(User)
```

### DELETE

The `HttpApiEndpoint.del` method is used to define an endpoint for deleting a resource.

**Example** (Defining a DELETE Endpoint with Path Parameters)

```ts
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

// Define a path parameter for the user ID
const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

// Define a DELETE endpoint to delete a user by ID
const deleteUser = HttpApiEndpoint.del("deleteUser")`/users/${idParam}`
```

### PATCH

The `HttpApiEndpoint.patch` method is used to define an endpoint for partially updating a resource. This method allows you to specify a schema for the request payload and a schema for the successful response.

**Example** (Defining a PATCH Endpoint for Updating a User)

```ts
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

// Define a schema for the user object
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

// Define a path parameter for the user ID
const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

// Define a PATCH endpoint to update a user's name by ID
const updateUser = HttpApiEndpoint.patch("updateUser")`/users/${idParam}`
  // Specify the schema for the request payload
  .setPayload(
    Schema.Struct({
      name: Schema.String // Only the name can be updated
    })
  )
  // Specify the schema for a successful response
  .addSuccess(User)
```

### Catch-All Endpoints

The path can also be `"*"` to match any incoming path. This is useful for defining a catch-all endpoint to handle unmatched routes or provide a fallback response.

**Example** (Defining a Catch-All Endpoint)

```ts
import { HttpApiEndpoint } from "@effect/platform"

const catchAll = HttpApiEndpoint.get("catchAll", "*")
```

### Setting URL Parameters

The `setUrlParams` method allows you to define the structure of URL parameters for an endpoint. You can specify the schema for each parameter and include metadata such as descriptions to provide additional context.

**Example** (Defining URL Parameters with Metadata)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const getUsers = HttpApiEndpoint.get("getUsers", "/users")
  // Specify the URL parameters schema
  .setUrlParams(
    Schema.Struct({
      // Parameter "page" for pagination
      page: Schema.NumberFromString,
      // Parameter "sort" for sorting options with an added description
      sort: Schema.String.annotations({
        description: "Sorting criteria (e.g., 'name', 'date')"
      })
    })
  )
  .addSuccess(Schema.Array(User))
```

#### Defining an Array of Values for a URL Parameter

When defining a URL parameter that accepts multiple values, you can use the `Schema.Array` combinator. This allows the parameter to handle an array of items, with each item adhering to a specified schema.

**Example** (Defining an Array of String Values for a URL Parameter)

```ts
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("myApi").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/")
      .setUrlParams(
        Schema.Struct({
          // Define "a" as an array of strings
          a: Schema.Array(Schema.String)
        })
      )
      .addSuccess(Schema.String)
  )
)
```

You can test this endpoint by passing an array of values in the query string. For example:

```sh
curl "http://localhost:3000/?a=1&a=2"
```

The query string sends two values (`1` and `2`) for the `a` parameter. The server will process and validate these values according to the schema.

### Status Codes

By default, the success status code is `200 OK`. You can change it by annotating the schema with a custom status.

**Example** (Defining a GET Endpoint with a custom status code)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const getUsers = HttpApiEndpoint.get("getUsers", "/users")
  // Override the default success status
  .addSuccess(Schema.Array(User), { status: 206 })
```

### Handling Multipart Requests

To support file uploads, you can use the `HttpApiSchema.Multipart` API. This allows you to define an endpoint's payload schema as a multipart request, specifying the structure of the data, including file uploads, with the `Multipart` module.

**Example** (Defining an Endpoint for File Uploads)

In this example, the `HttpApiSchema.Multipart` function marks the payload as a multipart request. The `files` field uses `Multipart.FilesSchema` to handle uploaded file data automatically.

```ts
import { HttpApiEndpoint, HttpApiSchema, Multipart } from "@effect/platform"
import { Schema } from "effect"

const upload = HttpApiEndpoint.post("upload", "/users/upload").setPayload(
  // Specify that the payload is a multipart request
  HttpApiSchema.Multipart(
    Schema.Struct({
      // Define a "files" field to handle file uploads
      files: Multipart.FilesSchema
    })
  ).addSuccess(Schema.String)
)
```

You can test this endpoint by sending a multipart request with a file upload. For example:

```sh
echo "Sample file content" | curl -X POST -F "files=@-" http://localhost:3000/users/upload
```

### Changing the Request Encoding

By default, API requests are encoded as JSON. If your application requires a different format, you can customize the request encoding using the `HttpApiSchema.withEncoding` method. This allows you to define the encoding type and content type of the request.

**Example** (Customizing Request Encoding)

```ts
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const createUser = HttpApiEndpoint.post("createUser", "/users")
  // Set the request payload as a string encoded with URL parameters
  .setPayload(
    Schema.Struct({
      a: Schema.String // Parameter "a" must be a string
    })
      // Specify the encoding as URL parameters
      .pipe(HttpApiSchema.withEncoding({ kind: "UrlParams" }))
  )
```

### Changing the Response Encoding

By default, API responses are encoded as JSON. If your application requires a different format, you can customize the encoding using the `HttpApiSchema.withEncoding` API. This method lets you define the type and content type of the response.

**Example** (Returning Data as `text/csv`)

```ts
import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const csv = HttpApiEndpoint.get("csv")`/users/csv`
  // Set the success response as a string with CSV encoding
  .addSuccess(
    Schema.String.pipe(
      HttpApiSchema.withEncoding({
        // Specify the type of the response
        kind: "Text",
        // Define the content type as text/csv
        contentType: "text/csv"
      })
    )
  )
```

### Setting Request Headers

Use `HttpApiEndpoint.setHeaders` to declare a single, cumulative schema that describes all expected request headers.
Provide one struct schema where each header name maps to its validator, and you can attach metadata such as descriptions.

> [!IMPORTANT]
> All headers are normalized to lowercase. Always use lowercase keys in the headers schema.

**Example** (Describe and validate custom headers)

```ts
import { HttpApiEndpoint } from "@effect/platform"
import { Schema } from "effect"

// Model for successful responses
const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const getUsers = HttpApiEndpoint.get("getUsers", "/users")
  // Describe the headers the endpoint expects
  .setHeaders(
    // Declare a single struct schema for all headers
    // Header keys MUST be lowercase in the schema
    Schema.Struct({
      // This header must be a string
      "x-api-key": Schema.String,

      // A human-friendly description is useful for generated docs (e.g. OpenAPI)
      "x-request-id": Schema.String.annotations({
        description: "Unique identifier for the request"
      })
    })
  )
  // Successful response: an array of User
  .addSuccess(Schema.Array(User))
```

You can test the endpoint by sending the headers:

```sh
curl -H "X-API-Key: 1234567890" -H "X-Request-ID: 1234567890" http://localhost:3000/users
```

The server validates these headers against the declared schema before handling the request.

## Defining a HttpApiGroup

You can group related endpoints under a single entity by using `HttpApiGroup.make`. This can help organize your code and provide a clearer structure for your API.

**Example** (Creating a Group for User-Related Endpoints)

```ts
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const getUsers = HttpApiEndpoint.get("getUsers", "/users").addSuccess(
  Schema.Array(User)
)

const getUser = HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(
  User
)

const createUser = HttpApiEndpoint.post("createUser", "/users")
  .setPayload(
    Schema.Struct({
      name: Schema.String
    })
  )
  .addSuccess(User)

const deleteUser = HttpApiEndpoint.del("deleteUser")`/users/${idParam}`

const updateUser = HttpApiEndpoint.patch("updateUser")`/users/${idParam}`
  .setPayload(
    Schema.Struct({
      name: Schema.String
    })
  )
  .addSuccess(User)

// Group all user-related endpoints
const usersGroup = HttpApiGroup.make("users")
  .add(getUsers)
  .add(getUser)
  .add(createUser)
  .add(deleteUser)
  .add(updateUser)
```

If you would like to create a more opaque type for the group, you can extend `HttpApiGroup` with a class.

**Example** (Creating a Group with an Opaque Type)

```ts
// Create an opaque class extending HttpApiGroup
class UsersGroup extends HttpApiGroup.make("users").add(getUsers).add(getUser) {
  // Additional endpoints or methods can be added here
}
```

## Creating the Top-Level HttpApi

After defining your groups, you can combine them into one `HttpApi` representing your entire set of endpoints.

**Example** (Combining Groups into a Top-Level API)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema
} from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const getUsers = HttpApiEndpoint.get("getUsers", "/users").addSuccess(
  Schema.Array(User)
)

const getUser = HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(
  User
)

const createUser = HttpApiEndpoint.post("createUser", "/users")
  .setPayload(
    Schema.Struct({
      name: Schema.String
    })
  )
  .addSuccess(User)

const deleteUser = HttpApiEndpoint.del("deleteUser")`/users/${idParam}`

const updateUser = HttpApiEndpoint.patch("updateUser")`/users/${idParam}`
  .setPayload(
    Schema.Struct({
      name: Schema.String
    })
  )
  .addSuccess(User)

const usersGroup = HttpApiGroup.make("users")
  .add(getUsers)
  .add(getUser)
  .add(createUser)
  .add(deleteUser)
  .add(updateUser)

// Combine the groups into one API
const api = HttpApi.make("myApi").add(usersGroup)

// Alternatively, create an opaque class for your API
class MyApi extends HttpApi.make("myApi").add(usersGroup) {}
```

## Adding errors

Error responses allow your API to handle different failure scenarios. These responses can be defined at various levels:

- **Endpoint-level errors**: Use `HttpApiEndpoint.addError` to add errors specific to an endpoint.
- **Group-level errors**: Use `HttpApiGroup.addError` to add errors applicable to all endpoints in a group.
- **API-level errors**: Use `HttpApi.addError` to define errors that apply to every endpoint in the API.

Group-level and API-level errors are useful for handling shared issues like authentication failures, especially when managed through middleware.

**Example** (Defining Error Responses for Endpoints and Groups)

```ts
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

// Define error schemas
class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {}
) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

const getUsers = HttpApiEndpoint.get("getUsers", "/users").addSuccess(
  Schema.Array(User)
)

const getUser = HttpApiEndpoint.get("getUser")`/user/${idParam}`
  .addSuccess(User)
  // Add a 404 error response for this endpoint
  .addError(UserNotFound, { status: 404 })

const usersGroup = HttpApiGroup.make("users")
  .add(getUsers)
  .add(getUser)
  // ...etc...
  // Add a 401 error response for the entire group
  .addError(Unauthorized, { status: 401 })
```

You can assign multiple error responses to a single endpoint by calling `HttpApiEndpoint.addError` multiple times. This is useful when different types of errors might occur for a single operation.

**Example** (Adding Multiple Errors to an Endpoint)

```ts
const deleteUser = HttpApiEndpoint.del("deleteUser")`/users/${idParam}`
  // Add a 404 error response for when the user is not found
  .addError(UserNotFound, { status: 404 })
  // Add a 401 error response for unauthorized access
  .addError(Unauthorized, { status: 401 })
```

### Predefined Empty Error Types

The `HttpApiError` module provides a set of predefined empty error types that you can use in your endpoints. These error types help standardize common HTTP error responses, such as `404 Not Found` or `401 Unauthorized`. Using these predefined types simplifies error handling and ensures consistency across your API.

**Example** (Adding a Predefined Error to an Endpoint)

```ts
import { HttpApiEndpoint, HttpApiError, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const getUser = HttpApiEndpoint.get("getUser")`/user/${idParam}`
  .addSuccess(User)
  .addError(HttpApiError.NotFound)
```

| Name                  | Status | Description                                                                                        |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `HttpApiDecodeError`  | 400    | Represents an error where the request did not match the expected schema. Includes detailed issues. |
| `BadRequest`          | 400    | Indicates that the request was malformed or invalid.                                               |
| `Unauthorized`        | 401    | Indicates that authentication is required but missing or invalid.                                  |
| `Forbidden`           | 403    | Indicates that the client does not have permission to access the requested resource.               |
| `NotFound`            | 404    | Indicates that the requested resource could not be found.                                          |
| `MethodNotAllowed`    | 405    | Indicates that the HTTP method used is not allowed for the requested resource.                     |
| `NotAcceptable`       | 406    | Indicates that the requested resource cannot be delivered in a format acceptable to the client.    |
| `RequestTimeout`      | 408    | Indicates that the server timed out waiting for the client request.                                |
| `Conflict`            | 409    | Indicates a conflict in the request, such as conflicting data.                                     |
| `Gone`                | 410    | Indicates that the requested resource is no longer available and will not return.                  |
| `InternalServerError` | 500    | Indicates an unexpected server error occurred.                                                     |
| `NotImplemented`      | 501    | Indicates that the requested functionality is not implemented on the server.                       |
| `ServiceUnavailable`  | 503    | Indicates that the server is temporarily unavailable, often due to maintenance or overload.        |

## Prefixing

Prefixes can be added to endpoints, groups, or an entire API to simplify the management of common paths. This is especially useful when defining multiple related endpoints that share a common base URL.

**Example** (Using Prefixes for Common Path Management)

```ts
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      .add(
        HttpApiEndpoint.get("getRoot", "/")
          .addSuccess(Schema.String)
          // Prefix for this endpoint
          .prefix("/endpointPrefix")
      )
      .add(HttpApiEndpoint.get("getA", "/a").addSuccess(Schema.String))
      // Prefix for all endpoints in the group
      .prefix("/groupPrefix")
  )
  // Prefix for the entire API
  .prefix("/apiPrefix")
```

## Implementing a Server

After defining your API, you can implement a server to handle its endpoints. The `HttpApiBuilder` module provides tools to help you connect your API's structure to the logic that serves requests.

Here, we will create a simple example with a `getUser` endpoint organized within a `users` group.

**Example** (Defining the `users` Group and API)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema
} from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)
```

### Implementing a HttpApiGroup

The `HttpApiBuilder.group` API is used to implement a specific group of endpoints within an `HttpApi` definition. It requires the following inputs:

| Input                             | Description                                                             |
| --------------------------------- | ----------------------------------------------------------------------- |
| The complete `HttpApi` definition | The overall API structure that includes the group you are implementing. |
| The name of the group             | The specific group you are focusing on within the API.                  |
| A function to add handlers        | A function that defines how each endpoint in the group is handled.      |

Each endpoint in the group is connected to its logic using the `HttpApiBuilder.handle` method, which maps the endpoint's definition to its corresponding implementation.

The `HttpApiBuilder.group` API produces a `Layer` that can later be provided to the server implementation.

**Example** (Implementing a Group with Endpoint Logic)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema
} from "@effect/platform"
import { DateTime, Effect, Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

// --------------------------------------------
// Implementation
// --------------------------------------------

//      ┌─── Layer<HttpApiGroup.ApiGroup<"myApi", "users">>
//      ▼
const usersGroupLive =
  //                    ┌─── The Whole API
  //                    │      ┌─── The Group you are implementing
  //                    ▼      ▼
  HttpApiBuilder.group(api, "users", (handlers) =>
    handlers.handle(
      //  ┌─── The Endpoint you are implementing
      //  ▼
      "getUser",
      // Provide the handler logic for the endpoint.
      // The parameters & payload are passed to the handler function.
      ({ path: { id } }) =>
        Effect.succeed(
          // Return a mock user object with the provided ID
          {
            id,
            name: "John Doe",
            createdAt: DateTime.unsafeNow()
          }
        )
    )
  )
```

Using `HttpApiBuilder.group`, you connect the structure of your API to its logic, enabling you to focus on each endpoint's functionality in isolation. Each handler receives the parameters and payload for the request, making it easy to process input and generate a response.

### Using Services Inside a HttpApiGroup

If your handlers need to use services, you can easily integrate them because the `HttpApiBuilder.group` API allows you to return an `Effect`. This ensures that external services can be accessed and utilized directly within your handlers.

**Example** (Using Services in a Group Implementation)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema
} from "@effect/platform"
import { Context, Effect, Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

// --------------------------------------------
// Implementation
// --------------------------------------------

type User = typeof User.Type

// Define the UsersRepository service
class UsersRepository extends Context.Tag("UsersRepository")<
  UsersRepository,
  {
    readonly findById: (id: number) => Effect.Effect<User>
  }
>() {}

// Implement the `users` group with access to the UsersRepository service
//
//      ┌─── Layer<HttpApiGroup.ApiGroup<"myApi", "users">, never, UsersRepository>
//      ▼
const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  Effect.gen(function* () {
    // Access the UsersRepository service
    const repository = yield* UsersRepository
    return handlers.handle("getUser", ({ path: { id } }) =>
      repository.findById(id)
    )
  })
)
```

### Implementing a HttpApi

Once all your groups are implemented, you can create a top-level implementation to combine them into a unified API. This is done using the `HttpApiBuilder.api` API, which generates a `Layer`. You then use `Layer.provide` to include the implementations of all the groups into the top-level `HttpApi`.

**Example** (Combining Group Implementations into a Top-Level API)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema
} from "@effect/platform"
import { DateTime, Effect, Layer, Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", ({ path: { id } }) =>
    Effect.succeed({
      id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
)

// Combine all group implementations into the top-level API
//
//      ┌─── Layer<HttpApi.Api, never, never>
//      ▼
const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))
```

### Serving the API

You can serve your API using the `HttpApiBuilder.serve` function. This utility builds an `HttpApp` from an `HttpApi` instance and uses an `HttpServer` to handle requests. Middleware can be added to customize or enhance the server's behavior.

**Example** (Setting Up and Serving an API with Middleware)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { DateTime, Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", ({ path: { id } }) =>
    Effect.succeed({
      id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))

// Configure and serve the API
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Add CORS middleware to handle cross-origin requests
  Layer.provide(HttpApiBuilder.middlewareCors()),
  // Provide the API implementation
  Layer.provide(MyApiLive),
  // Log the server's listening address
  HttpServer.withLogAddress,
  // Set up the Node.js HTTP server
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

// Launch the server
Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

### Accessing the HttpServerRequest

In some cases, you may need to access details about the incoming `HttpServerRequest` within an endpoint handler. The HttpServerRequest module provides access to the request object, allowing you to inspect properties such as the HTTP method or headers.

**Example** (Accessing the Request Object in a GET Endpoint)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const api = HttpApi.make("myApi").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addSuccess(Schema.String)
  )
)

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
  handlers.handle("get", ({ request }) =>
    Effect.gen(function* () {
      // Log the HTTP method for demonstration purposes
      console.log(request.method)

      // Return a response
      return "Hello, World!"
    })
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(groupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

### Streaming Requests

Streaming requests allow you to send large or continuous data streams to the server. In this example, we define an API that accepts a stream of binary data and decodes it into a string.

**Example** (Handling Streaming Requests)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const api = HttpApi.make("myApi").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.post("acceptStream", "/stream")
      // Define the payload as a Uint8Array with a specific encoding
      .setPayload(
        Schema.Uint8ArrayFromSelf.pipe(
          HttpApiSchema.withEncoding({
            kind: "Uint8Array",
            contentType: "application/octet-stream"
          })
        )
      )
      .addSuccess(Schema.String)
  )
)

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
  handlers.handle("acceptStream", (req) =>
    // Decode the incoming binary data into a string
    Effect.succeed(new TextDecoder().decode(req.payload))
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(groupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

You can test the streaming request using `curl` or any tool that supports sending binary data. For example:

```sh
echo "abc" | curl -X POST 'http://localhost:3000/stream' --data-binary @- -H "Content-Type: application/octet-stream"
# Output: abc
```

### Streaming Responses

To handle streaming responses in your API, you can return a raw `HttpServerResponse`. The `HttpServerResponse.stream` function is designed to return a continuous stream of data as the response.

**Example** (Implementing a Streaming Endpoint)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpMiddleware,
  HttpServer,
  HttpServerResponse
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer, Schedule, Schema, Stream } from "effect"
import { createServer } from "node:http"

// Define the API with a single streaming endpoint
const api = HttpApi.make("myApi").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("getStream", "/stream").addSuccess(
      Schema.String.pipe(
        HttpApiSchema.withEncoding({
          kind: "Text",
          contentType: "application/octet-stream"
        })
      )
    )
  )
)

// Simulate a stream of data
const stream = Stream.make("a", "b", "c").pipe(
  Stream.schedule(Schedule.spaced("500 millis")),
  Stream.map((s) => new TextEncoder().encode(s))
)

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
  handlers.handle("getStream", () => HttpServerResponse.stream(stream))
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(groupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

You can test the streaming response using `curl` or any similar HTTP client that supports streaming:

```sh
curl 'http://localhost:3000/stream' --no-buffer
```

The response will stream data (`a`, `b`, `c`) with a 500ms interval between each item.

## Middlewares

### Defining Middleware

The `HttpApiMiddleware` module allows you to add middleware to your API. Middleware can enhance your API by introducing features like logging, authentication, or additional error handling.

You can define middleware using the `HttpApiMiddleware.Tag` class, which lets you specify:

| Option     | Description                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `failure`  | A schema that describes any errors the middleware might return.                                                                                                                                                                 |
| `provides` | A `Context.Tag` representing the resource or data the middleware will provide to subsequent handlers.                                                                                                                           |
| `security` | Definitions from `HttpApiSecurity` that the middleware will implement, such as authentication mechanisms.                                                                                                                       |
| `optional` | A boolean indicating whether the request should continue if the middleware fails with an expected error. When `optional` is set to `true`, the `provides` and `failure` options do not affect the final error type or handlers. |

**Example** (Defining a Logger Middleware)

```ts
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema
} from "@effect/platform"
import { Schema } from "effect"

// Define a schema for errors returned by the logger middleware
class LoggerError extends Schema.TaggedError<LoggerError>()(
  "LoggerError",
  {}
) {}

// Extend the HttpApiMiddleware.Tag class to define the logger middleware tag
class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger", {
  // Optionally define the error schema for the middleware
  failure: LoggerError
}) {}

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getUser")`/user/${idParam}`
      .addSuccess(User)
      // Apply the middleware to a single endpoint
      .middleware(Logger)
  )
  // Or apply the middleware to the entire group
  .middleware(Logger)
```

### Implementing HttpApiMiddleware

Once you have defined your `HttpApiMiddleware`, you can implement it as a `Layer`. This allows the middleware to be applied to specific API groups or endpoints, enabling modular and reusable behavior.

**Example** (Implementing and Using Logger Middleware)

```ts
import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform"
import { Effect, Layer } from "effect"

class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger") {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    yield* Effect.log("creating Logger middleware")

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      yield* Effect.log(`Request: ${request.method} ${request.url}`)
    })
  })
)
```

After implementing the middleware, you can attach it to your API groups or specific endpoints using the `Layer` APIs.

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpServerRequest
} from "@effect/platform"
import { DateTime, Effect, Layer, Schema } from "effect"

// Define a schema for errors returned by the logger middleware
class LoggerError extends Schema.TaggedError<LoggerError>()(
  "LoggerError",
  {}
) {}

// Extend the HttpApiMiddleware.Tag class to define the logger middleware tag
class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger", {
  // Optionally define the error schema for the middleware
  failure: LoggerError
}) {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    yield* Effect.log("creating Logger middleware")

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      yield* Effect.log(`Request: ${request.method} ${request.url}`)
    })
  })
)

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getUser")`/user/${idParam}`
      .addSuccess(User)
      // Apply the middleware to a single endpoint
      .middleware(Logger)
  )
  // Or apply the middleware to the entire group
  .middleware(Logger)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", (req) =>
    Effect.succeed({
      id: req.path.id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
).pipe(
  // Provide the Logger middleware to the group
  Layer.provide(LoggerLive)
)
```

### Defining security middleware

The `HttpApiSecurity` module enables you to add security annotations to your API. These annotations specify the type of authorization required to access specific endpoints.

Supported authorization types include:

| Authorization Type       | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `HttpApiSecurity.apiKey` | API key authorization via headers, query parameters, or cookies. |
| `HttpApiSecurity.basic`  | HTTP Basic authentication.                                       |
| `HttpApiSecurity.bearer` | Bearer token authentication.                                     |

These security annotations can be used alongside `HttpApiMiddleware` to create middleware that protects your API endpoints.

**Example** (Defining Security Middleware)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Schema } from "effect"

// Define a schema for the "User"
class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

// Define a schema for the "Unauthorized" error
class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  // Specify the HTTP status code for unauthorized errors
  HttpApiSchema.annotations({ status: 401 })
) {}

// Define a Context.Tag for the authenticated user
class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

// Create the Authorization middleware
class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    // Define the error schema for unauthorized access
    failure: Unauthorized,
    // Specify the resource this middleware will provide
    provides: CurrentUser,
    // Add security definitions
    security: {
      // ┌─── Custom name for the security definition
      // ▼
      myBearer: HttpApiSecurity.bearer
      // Additional security definitions can be added here.
      // They will attempt to be resolved in the order they are defined.
    }
  }
) {}

const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      .add(
        HttpApiEndpoint.get("get", "/")
          .addSuccess(Schema.String)
          // Apply the middleware to a single endpoint
          .middleware(Authorization)
      )
      // Or apply the middleware to the entire group
      .middleware(Authorization)
  )
  // Or apply the middleware to the entire API
  .middleware(Authorization)
```

### Implementing HttpApiSecurity middleware

When using `HttpApiSecurity` in your middleware, the implementation involves creating a `Layer` with security handlers tailored to your requirements. Below is an example demonstrating how to implement middleware for `HttpApiSecurity.bearer` authentication.

**Example** (Implementing Bearer Token Authentication Middleware)

```ts
import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Effect, Layer, Redacted, Schema } from "effect"

class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: {
      myBearer: HttpApiSecurity.bearer
    }
  }
) {}

const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    yield* Effect.log("creating Authorization middleware")

    // Return the security handlers for the middleware
    return {
      // Define the handler for the Bearer token
      // The Bearer token is redacted for security
      myBearer: (bearerToken) =>
        Effect.gen(function* () {
          yield* Effect.log(
            "checking bearer token",
            Redacted.value(bearerToken)
          )
          // Return a mock User object as the CurrentUser
          return new User({ id: 1 })
        })
    }
  })
)
```

### Adding Descriptions to Security Definitions

The `HttpApiSecurity.annotate` function allows you to add metadata, such as a description, to your security definitions. This metadata is displayed in the Swagger documentation, making it easier for developers to understand your API's security requirements.

**Example** (Adding a Description to a Bearer Token Security Definition)

```ts
import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi
} from "@effect/platform"
import { Context, Schema } from "effect"

class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: {
      myBearer: HttpApiSecurity.bearer.pipe(
        // Add a description to the security definition
        HttpApiSecurity.annotate(OpenApi.Description, "my description")
      )
    }
  }
) {}
```

### Setting HttpApiSecurity cookies

To set a security cookie from within a handler, you can use the `HttpApiBuilder.securitySetCookie` API. This method sets a cookie with default properties, including the `HttpOnly` and `Secure` flags, ensuring the cookie is not accessible via JavaScript and is transmitted over secure connections.

**Example** (Setting a Security Cookie in a Login Handler)

```ts
// Define the security configuration for an API key stored in a cookie
const security = HttpApiSecurity.apiKey({
   // Specify that the API key is stored in a cookie
  in: "cookie"
   // Define the cookie name,
  key: "token"
})

const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers.handle("login", () =>
    // Set the security cookie with a redacted value
    HttpApiBuilder.securitySetCookie(security, Redacted.make("keep me secret"))
  )
)
```

## Serving Swagger documentation

You can add Swagger documentation to your API using the `HttpApiSwagger` module. This integration provides an interactive interface for developers to explore and test your API. To enable Swagger, you simply provide the `HttpApiSwagger.layer` to your server implementation.

**Example** (Adding Swagger Documentation to an API)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { DateTime, Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", ({ path: { id } }) =>
    Effect.succeed({
      id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Add the Swagger documentation layer
  Layer.provide(
    HttpApiSwagger.layer({
      // Specify the Swagger documentation path.
      // "/docs" is the default path.
      path: "/docs"
    })
  ),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
```

![Swagger Documentation](./images/swagger-myapi.png)

### Adding OpenAPI Annotations

You can add OpenAPI annotations to your API to include metadata such as titles, descriptions, and more. These annotations help generate richer API documentation.

#### HttpApi

Below is a list of available annotations for a top-level `HttpApi`. They can be added using the `.annotate` method:

| Annotation                  | Description                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `HttpApi.AdditionalSchemas` | Adds custom schemas to the final OpenAPI specification. Only schemas with an `identifier` annotation are included. |
| `OpenApi.Description`       | Sets a general description for the API.                                                                            |
| `OpenApi.License`           | Defines the license used by the API.                                                                               |
| `OpenApi.Summary`           | Provides a brief summary of the API.                                                                               |
| `OpenApi.Servers`           | Lists server URLs and optional metadata such as variables.                                                         |
| `OpenApi.Override`          | Merges the supplied fields into the resulting specification.                                                       |
| `OpenApi.Transform`         | Allows you to modify the final specification with a custom function.                                               |

**Example** (Annotating the Top-Level API)

```ts
import { HttpApi, OpenApi } from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api")
  // Provide additional schemas
  .annotate(HttpApi.AdditionalSchemas, [
    Schema.String.annotations({ identifier: "MyString" })
  ])
  // Add a description
  .annotate(OpenApi.Description, "my description")
  // Set license information
  .annotate(OpenApi.License, { name: "MIT", url: "http://example.com" })
  // Provide a summary
  .annotate(OpenApi.Summary, "my summary")
  // Define servers
  .annotate(OpenApi.Servers, [
    {
      url: "http://example.com",
      description: "example",
      variables: { a: { default: "b", enum: ["c"], description: "d" } }
    }
  ])
  // Override parts of the generated specification
  .annotate(OpenApi.Override, {
    tags: [{ name: "a", description: "a-description" }]
  })
  // Apply a transform function to the final specification
  .annotate(OpenApi.Transform, (spec) => ({
    ...spec,
    tags: [...spec.tags, { name: "b", description: "b-description" }]
  }))

// Generate the OpenAPI specification from the annotated API
const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec, null, 2))
/*
Output:
{
  "openapi": "3.1.0",
  "info": {
    "title": "Api",
    "version": "0.0.1",
    "description": "my description",
    "license": {
      "name": "MIT",
      "url": "http://example.com"
    },
    "summary": "my summary"
  },
  "paths": {},
  "tags": [
    { "name": "a", "description": "a-description" },
    { "name": "b", "description": "b-description" }
  ],
  "components": {
    "schemas": {
      "MyString": {
        "type": "string"
      }
    },
    "securitySchemes": {}
  },
  "security": [],
  "servers": [
    {
      "url": "http://example.com",
      "description": "example",
      "variables": {
        "a": {
          "default": "b",
          "enum": [
            "c"
          ],
          "description": "d"
        }
      }
    }
  ]
}
*/
```

#### HttpApiGroup

The following annotations can be added to an `HttpApiGroup`:

| Annotation             | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `OpenApi.Description`  | Sets a description for this group.                                    |
| `OpenApi.ExternalDocs` | Provides external documentation links for the group.                  |
| `OpenApi.Override`     | Merges specified fields into the resulting specification.             |
| `OpenApi.Transform`    | Lets you modify the final group specification with a custom function. |
| `OpenApi.Exclude`      | Excludes the group from the final OpenAPI specification.              |

**Example** (Annotating a Group)

```ts
import { HttpApi, HttpApiGroup, OpenApi } from "@effect/platform"

const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      // Add a description for the group
      .annotate(OpenApi.Description, "my description")
      // Provide external documentation links
      .annotate(OpenApi.ExternalDocs, {
        url: "http://example.com",
        description: "example"
      })
      // Override parts of the final output
      .annotate(OpenApi.Override, { name: "my name" })
      // Transform the final specification for this group
      .annotate(OpenApi.Transform, (spec) => ({
        ...spec,
        name: spec.name + "-transformed"
      }))
  )
  .add(
    HttpApiGroup.make("excluded")
      // Exclude the group from the final specification
      .annotate(OpenApi.Exclude, true)
  )

// Generate the OpenAPI spec
const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec, null, 2))
/*
Output:
{
  "openapi": "3.1.0",
  "info": {
    "title": "Api",
    "version": "0.0.1"
  },
  "paths": {},
  "tags": [
    {
      "name": "my name-transformed",
      "description": "my description",
      "externalDocs": {
        "url": "http://example.com",
        "description": "example"
      }
    }
  ],
  "components": {
    "schemas": {},
    "securitySchemes": {}
  },
  "security": []
}
*/
```

#### HttpApiEndpoint

For an `HttpApiEndpoint`, you can use the following annotations:

| Annotation             | Description                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `OpenApi.Description`  | Adds a description for this endpoint.                                       |
| `OpenApi.Summary`      | Provides a short summary of the endpoint's purpose.                         |
| `OpenApi.Deprecated`   | Marks the endpoint as deprecated.                                           |
| `OpenApi.ExternalDocs` | Supplies external documentation links for the endpoint.                     |
| `OpenApi.Override`     | Merges specified fields into the resulting specification for this endpoint. |
| `OpenApi.Transform`    | Lets you modify the final endpoint specification with a custom function.    |
| `OpenApi.Exclude`      | Excludes the endpoint from the final OpenAPI specification.                 |

**Example** (Annotating an Endpoint)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group")
    .add(
      HttpApiEndpoint.get("get", "/")
        .addSuccess(Schema.String)
        // Add a description
        .annotate(OpenApi.Description, "my description")
        // Provide a summary
        .annotate(OpenApi.Summary, "my summary")
        // Mark the endpoint as deprecated
        .annotate(OpenApi.Deprecated, true)
        // Provide external documentation
        .annotate(OpenApi.ExternalDocs, {
          url: "http://example.com",
          description: "example"
        })
    )
    .add(
      HttpApiEndpoint.get("excluded", "/excluded")
        .addSuccess(Schema.String)
        // Exclude this endpoint from the final specification
        .annotate(OpenApi.Exclude, true)
    )
)

// Generate the OpenAPI spec
const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec, null, 2))
/*
Output:
{
  "openapi": "3.1.0",
  "info": {
    "title": "Api",
    "version": "0.0.1"
  },
  "paths": {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "my operationId-transformed",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        },
        "description": "my description",
        "summary": "my summary",
        "deprecated": true,
        "externalDocs": {
          "url": "http://example.com",
          "description": "example"
        }
      }
    }
  },
  ...
}
*/
```

The default response description is "Success". You can override this by annotating the schema.

**Example** (Defining a custom response description)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
}).annotations({ identifier: "User" })

const api = HttpApi.make("api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("getUsers", "/users").addSuccess(
      Schema.Array(User).annotations({
        description: "Returns an array of users"
      })
    )
  )
)

const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/users": {
    "get": {
      "tags": [
        "group"
      ],
      "operationId": "group.getUsers",
      "parameters": [],
      "security": [],
      "responses": {
        "200": {
          "description": "Returns an array of users",
          "content": {
            "application/json": {
              "schema": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/User"
                },
                "description": "Returns an array of users"
              }
            }
          }
        },
        "400": {
          "description": "The request did not match the expected schema",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HttpApiDecodeError"
              }
            }
          }
        }
      }
    }
  }
}
*/
```

### Top Level Groups

When a group is marked as `topLevel`, the operation IDs of its endpoints do not include the group name as a prefix. This is helpful when you want to group endpoints under a shared tag without adding a redundant prefix to their operation IDs.

**Example** (Using a Top-Level Group)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi
} from "@effect/platform"
import { Schema } from "effect"

const api = HttpApi.make("api").add(
  // Mark the group as top-level
  HttpApiGroup.make("group", { topLevel: true }).add(
    HttpApiEndpoint.get("get", "/").addSuccess(Schema.String)
  )
)

// Generate the OpenAPI spec
const spec = OpenApi.fromApi(api)

console.log(JSON.stringify(spec.paths, null, 2))
/*
Output:
{
  "/": {
    "get": {
      "tags": [
        "group"
      ],
      "operationId": "get", // The operation ID is not prefixed with "group"
      "parameters": [],
      "security": [],
      "responses": {
        "200": {
          "description": "a string",
          "content": {
            "application/json": {
              "schema": {
                "type": "string"
              }
            }
          }
        },
        "400": {
          "description": "The request did not match the expected schema",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/HttpApiDecodeError"
              }
            }
          }
        }
      }
    }
  }
}
*/
```

## Deriving a Client

After defining your API, you can derive a client that interacts with the server. The `HttpApiClient` module simplifies the process by providing tools to generate a client based on your API definition.

**Example** (Deriving and Using a Client)

This example demonstrates how to create a client for an API and use it to call an endpoint.

```ts
import {
  FetchHttpClient,
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { DateTime, Effect, Layer, Schema } from "effect"
import { createServer } from "node:http"

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.get("getUser")`/user/${idParam}`.addSuccess(User)
)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", ({ path: { id } }) =>
    Effect.succeed({
      id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer()),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(MyApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(NodeRuntime.runMain)

// Create a program that derives and uses the client
const program = Effect.gen(function* () {
  // Derive the client
  const client = yield* HttpApiClient.make(api, {
    baseUrl: "http://localhost:3000"
  })
  // Call the `getUser` endpoint
  const user = yield* client.users.getUser({ path: { id: 1 } })
  console.log(user)
})

// Provide a Fetch-based HTTP client and run the program
Effect.runFork(program.pipe(Effect.provide(FetchHttpClient.layer)))
/*
Example Output:
User {
  id: 1,
  name: 'John Doe',
  createdAt: DateTime.Utc(2025-01-04T15:14:49.562Z)
}
*/
```

### Top Level Groups

When a group is marked as `topLevel`, the methods on the client are not nested under the group name. This can simplify client usage by providing direct access to the endpoint methods.

**Example** (Using a Top-Level Group in the Client)

```ts
import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup
} from "@effect/platform"
import { Effect, Schema } from "effect"

const api = HttpApi.make("api").add(
  // Mark the group as top-level
  HttpApiGroup.make("group", { topLevel: true }).add(
    HttpApiEndpoint.get("get", "/").addSuccess(Schema.String)
  )
)

const program = Effect.gen(function* () {
  const client = yield* HttpApiClient.make(api, {
    baseUrl: "http://localhost:3000"
  })
  // The `get` method is not nested under the "group" name
  const user = yield* client.get()
  console.log(user)
})
```

## Converting to a Web Handler

You can convert your `HttpApi` implementation into a web handler using the `HttpApiBuilder.toWebHandler` API. This approach enables you to serve your API through a custom server setup.

**Example** (Creating and Serving a Web Handler)

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSwagger,
  HttpServer
} from "@effect/platform"
import { Effect, Layer, Schema } from "effect"
import * as http from "node:http"

const api = HttpApi.make("myApi").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/").addSuccess(Schema.String)
  )
)

const groupLive = HttpApiBuilder.group(api, "group", (handlers) =>
  handlers.handle("get", () => Effect.succeed("Hello, world!"))
)

const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(groupLive))

const SwaggerLayer = HttpApiSwagger.layer().pipe(Layer.provide(MyApiLive))

// Convert the API to a web handler
const { dispose, handler } = HttpApiBuilder.toWebHandler(
  Layer.mergeAll(MyApiLive, SwaggerLayer, HttpServer.layerContext)
)

// Serving the handler using a custom HTTP server
http
  .createServer(async (req, res) => {
    const url = `http://${req.headers.host}${req.url}`
    const init: RequestInit = {
      method: req.method!
    }

    const response = await handler(new Request(url, init))

    res.writeHead(
      response.status,
      response.statusText,
      Object.fromEntries(response.headers.entries())
    )
    const responseBody = await response.arrayBuffer()
    res.end(Buffer.from(responseBody))
  })
  .listen(3000, () => {
    console.log("Server running at http://localhost:3000/")
  })
  .on("close", () => {
    dispose()
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
This will give you access to a `HttpClient` instance.

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

**Example: Retrieving JSON Data with accessor apis (GET)**

The `HttpClient` module also provides a set of accessor apis that allow you to
easily send requests without first accessing the `HttpClient` service.

Below is an example of using the `get` accessor api to send a GET request:

(The following examples will continue to use the `HttpClient` service approach).

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

const program = HttpClient.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(
  Effect.andThen((response) => response.json),
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
}).pipe(Effect.provide(FetchHttpClient.layer))

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
| `get`,`post`,`put`...    | Send a request without first accessing the `HttpClient` service.                        |
| `filterOrElse`           | Filters the result of a response, or runs an alternative effect if the predicate fails. |
| `filterOrFail`           | Filters the result of a response, or throws an error if the predicate fails.            |
| `filterStatus`           | Filters responses by HTTP status code.                                                  |
| `filterStatusOk`         | Filters responses that return a 2xx status code.                                        |
| `followRedirects`        | Follows HTTP redirects up to a specified number of times.                               |
| `mapRequest`             | Appends a transformation of the request object before sending it.                       |
| `mapRequestEffect`       | Appends an effectful transformation of the request object before sending it.            |
| `mapRequestInput`        | Prepends a transformation of the request object before sending it.                      |
| `mapRequestInputEffect`  | Prepends an effectful transformation of the request object before sending it.           |
| `retry`                  | Retries the request based on a provided schedule or policy.                             |
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
}).pipe(Effect.provide(FetchHttpClient.layer))

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

### Persisting Cookies

You can manage cookies across requests using the `HttpClient.withCookiesRef` function, which associates a reference to a `Cookies` object with the client.

```ts
import { Cookies, FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
  // Create a reference to store cookies
  const ref = yield* Ref.make(Cookies.empty)

  // Access the HttpClient and associate the cookies reference with it
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.withCookiesRef(ref)
  )

  // Make a GET request to the specified URL
  yield* client.get("https://www.google.com/")

  // Log the keys of the cookies stored in the reference
  console.log(Object.keys((yield* ref).cookies))
}).pipe(Effect.provide(FetchHttpClient.layer))

Effect.runPromise(program)
// Output: [ 'SOCS', 'AEC', '__Secure-ENID' ]
```

## RequestInit Options

You can customize the `FetchHttpClient` by passing `RequestInit` options to configure aspects of the HTTP requests, such as credentials, headers, and more.

In this example, we customize the `FetchHttpClient` to include credentials with every request:

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
}).pipe(Effect.provide(CustomFetchLive))
```

## Create a Custom HttpClient

You can create a custom `HttpClient` using the `HttpClient.make` function. This allows you to simulate or mock server responses within your application.

```ts
import { HttpClient, HttpClientResponse } from "@effect/platform"
import { Effect, Layer } from "effect"

const myClient = HttpClient.make((req) =>
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
}).pipe(Effect.provide(FetchHttpClient.layer))

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
}).pipe(Effect.provide(FetchHttpClient.layer))

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

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClientResponse` module is integrated with `effect/Schema`.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Schema } from "effect"

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
}).pipe(Effect.provide(FetchHttpClient.layer))

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
}).pipe(Effect.provide(FetchHttpClient.layer))

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
}).pipe(Effect.provide(FetchHttpClient.layer))

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
    Effect.flatMap((res) => res.json)
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
    Effect.flatMap((res) => res.json)
  )
}).pipe(Effect.provide(FetchHttpClient.layer))

addPost.pipe(Effect.andThen(Console.log), NodeRuntime.runMain)
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClientResponse` module is integrated with `effect/Schema`.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Schema } from "effect"

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
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Post))
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

  return yield* client
    .get("https://www.google.com/")
    .pipe(Effect.flatMap((res) => res.text))
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

Node.js Example

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

Bun Example

```ts
import type { HttpPlatform, HttpServer } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Layer } from "effect"

export const listen = (
  app: Layer.Layer<
    never,
    never,
    HttpPlatform.HttpPlatform | HttpServer.HttpServer
  >,
  port: number
) =>
  BunRuntime.runMain(
    Layer.launch(Layer.provide(app, BunHttpServer.layer({ port })))
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
import { Effect, Schema } from "effect"
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
**WARNING:** The `X-Forwarded-*` headers are untrustworthy when no trusted reverse proxy or load balancer is between the client and server.

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

Validation is a critical aspect of handling HTTP requests to ensure that the data your server receives is as expected. We'll explore how to validate headers and cookies using the `@effect/platform` and `effect/Schema` libraries, which provide structured and robust methods for these tasks.

### Headers

Headers often contain important information needed by your application, such as content types, authentication tokens, or session data. Validating these headers ensures that your application can trust and correctly process the information it receives.

```ts
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform"
import { Effect, Schema } from "effect"
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
import { Effect, Schema } from "effect"
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

# Url

The `Url` module provides utilities for constructing and working with `URL` objects in a functional style. It includes:

- A safe constructor for parsing URLs from strings.
- Functions for immutably updating `URL` properties like `host`, `href`, and `search`.
- Tools for reading and modifying URL parameters using the `UrlParams` module.
- A focus on immutability, creating new `URL` instances for every change.

## Creating a URL

### fromString

This function takes a string and attempts to parse it into a `URL` object. If the string is invalid, it returns an `Either.Left` containing an `IllegalArgumentException` with the error details. Otherwise, it returns an `Either.Right` containing the parsed `URL`.

You can optionally provide a `base` parameter to resolve relative URLs. When supplied, the function treats the input `url` as relative to the `base`.

**Example** (Parsing a URL with Optional Base)

```ts
import { Url } from "@effect/platform"
import { Either } from "effect"

// Parse an absolute URL
//
//      ┌─── Either<URL, IllegalArgumentException>
//      ▼
const parsed = Url.fromString("https://example.com/path")

if (Either.isRight(parsed)) {
  console.log("Parsed URL:", parsed.right.toString())
} else {
  console.log("Error:", parsed.left.message)
}
// Output: Parsed URL: https://example.com/path

// Parse a relative URL with a base
const relativeParsed = Url.fromString("/relative-path", "https://example.com")

if (Either.isRight(relativeParsed)) {
  console.log("Parsed relative URL:", relativeParsed.right.toString())
} else {
  console.log("Error:", relativeParsed.left.message)
}
// Output: Parsed relative URL: https://example.com/relative-path
```

## Immutably Changing URL Properties

The `Url` module offers a set of functions for updating properties of a `URL` object without modifying the original instance. These functions create and return a new `URL` with the specified updates, preserving the immutability of the original.

### Available Setters

| Setter        | Description                                               |
| ------------- | --------------------------------------------------------- |
| `setHash`     | Updates the hash fragment of the URL.                     |
| `setHost`     | Updates the host (domain and port) of the URL.            |
| `setHostname` | Updates the domain of the URL without modifying the port. |
| `setHref`     | Replaces the entire URL string.                           |
| `setPassword` | Updates the password used for authentication.             |
| `setPathname` | Updates the path of the URL.                              |
| `setPort`     | Updates the port of the URL.                              |
| `setProtocol` | Updates the protocol (e.g., `http`, `https`).             |
| `setSearch`   | Updates the query string of the URL.                      |
| `setUsername` | Updates the username used for authentication.             |

**Example** (Using Setters to Modify URL Properties)

```ts
import { Url } from "@effect/platform"
import { pipe } from "effect"

const myUrl = new URL("https://example.com")

// Changing protocol, host, and port
const newUrl = pipe(
  myUrl,
  Url.setProtocol("http:"),
  Url.setHost("google.com"),
  Url.setPort("8080")
)

console.log("Original:", myUrl.toString())
// Output: Original: https://example.com/

console.log("New:", newUrl.toString())
// Output: New: http://google.com:8080/
```

### mutate

For more advanced modifications, use the `mutate` function. It clones the original `URL` object and applies a callback to the clone, allowing multiple updates at once.

**Example** (Applying Multiple Changes with `mutate`)

```ts
import { Url } from "@effect/platform"

const myUrl = new URL("https://example.com")

const mutatedUrl = Url.mutate(myUrl, (url) => {
  url.username = "user"
  url.password = "pass"
})

console.log("Mutated:", mutatedUrl.toString())
// Output: Mutated: https://user:pass@example.com/
```

## Reading and Writing URL Parameters

The `Url` module provides utilities for working with URL query parameters. These utilities allow you to read existing parameters and write new ones, all while maintaining immutability. This functionality is supported by the `UrlParams` module.

You can extract the query parameters from a `URL` object using the `urlParams` function.

To modify or add query parameters, use the `setUrlParams` function. This function creates a new `URL` with the updated query string.

**Example** (Reading and Writing Parameters)

```ts
import { Url, UrlParams } from "@effect/platform"

const myUrl = new URL("https://example.com?foo=bar")

// Read parameters
const params = Url.urlParams(myUrl)

console.log(params)
// Output: [ [ 'foo', 'bar' ] ]

// Write parameters
const updatedUrl = Url.setUrlParams(
  myUrl,
  UrlParams.fromInput([["key", "value"]])
)

console.log(updatedUrl.toString())
// Output: https://example.com/?key=value
```

### Modifying URL Parameters

The `modifyUrlParams` function allows you to read, modify, and overwrite URL parameters in a single operation.

**Example** (Appending a Parameter to a URL)

```ts
import { Url, UrlParams } from "@effect/platform"

const myUrl = new URL("https://example.com?foo=bar")

const changedUrl = Url.modifyUrlParams(myUrl, UrlParams.append("key", "value"))

console.log(changedUrl.toString())
// Output: https://example.com/?foo=bar&key=value
```

# OpenApiJsonSchema

The `OpenApiJsonSchema` module provides utilities to transform `Schema` objects into JSON schemas that comply with the OpenAPI Specification. These utilities are especially helpful for generating OpenAPI documentation or working with tools that require OpenAPI-compliant schemas.

## Creating a JSON Schema from a Schema

This module enables you to convert `Schema` objects into OpenAPI-compatible JSON schemas, making it easy to integrate with tools like Swagger or other OpenAPI-based frameworks.

**Example** (Generating a JSON Schema from a String Schema)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { Schema } from "effect"

const schema = Schema.String

// Convert the schema to OpenAPI JSON Schema
const openApiSchema = OpenApiJsonSchema.make(schema)

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "type": "string"
}
*/
```

## Differences from JSONSchema

The `OpenApiJsonSchema` module differs from the `JSONSchema` module in several ways. These differences are tailored to align with the OpenAPI Specification.

### `$schema` Property Omission

OpenAPI schemas do not include the `$schema` property, while JSON schemas do.

**Example** (Comparison of `$schema` Property)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { JSONSchema, Schema } from "effect"

const schema = Schema.String

const openApiSchema = OpenApiJsonSchema.make(schema)
const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "type": "string"
}
*/

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
*/
```

### Handling of `null` Values

OpenAPI does not support `{ "type": "null" }`. Instead, it uses an `enum` containing `null` to represent nullable values.

**Example** (Representation of `null` Values)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { JSONSchema, Schema } from "effect"

const schema = Schema.Null

const openApiSchema = OpenApiJsonSchema.make(schema)
const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "enum": [
    null
  ]
}
*/

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "null"
}
*/
```

### Nullable Values

OpenAPI uses the `nullable` property to indicate that a value can be `null`, whereas JSON schemas use an `anyOf` structure.

**Example** (Nullable Property Representation)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { JSONSchema, Schema } from "effect"

const schema = Schema.NullOr(Schema.String)

const openApiSchema = OpenApiJsonSchema.make(schema)
const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "type": "string",
  "nullable": true
}
*/

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "anyOf": [
    {
      "type": "string"
    },
    {
      "type": "null"
    }
  ]
}
*/
```

### `contentSchema` Support

OpenAPI schemas include a `contentSchema` property, which allows you to describe the structure of the content for a media type (e.g., `application/json`). This feature is not available in JSON schemas (Draft 7), making `contentSchema` particularly useful for defining structured payloads in OpenAPI documentation.

**Note**: Use `contentSchema` to define the internal structure of media types like `application/json` in OpenAPI specifications. This property provides clarity and detail for tools and users interacting with the API, especially when handling structured payloads.

**Example** (Defining a Schema with `contentSchema` for JSON Content)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { JSONSchema, Schema } from "effect"

// Define a schema for parsing JSON content
const schema = Schema.parseJson(Schema.Struct({ a: Schema.String }))

const openApiSchema = OpenApiJsonSchema.make(schema)
const jsonSchema = JSONSchema.make(schema)

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "type": "string",
  "contentMediaType": "application/json",
  "contentSchema": {
    "type": "object",
    "required": [
      "a"
    ],
    "properties": {
      "a": {
        "type": "string"
      }
    },
    "additionalProperties": false
  }
}
*/

console.log(JSON.stringify(jsonSchema, null, 2))
/*
Output:
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "a"
  ],
  "properties": {
    "a": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
*/
```

### makeWithDefs

The `makeWithDefs` function generates OpenAPI-compatible JSON schemas and collects schema definitions in a shared object. This is especially useful for consolidating multiple schemas into a single OpenAPI specification, enabling schema reuse across your API.

**Example** (Generating OpenAPI Schema with Definitions)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { Schema } from "effect"

// Define a schema with an identifier annotation
const schema = Schema.Struct({ a: Schema.String }).annotations({
  identifier: "MyStruct"
})

// Create a definitions object
const defs = {}

// Generate the OpenAPI schema while collecting definitions
const openApiSchema = OpenApiJsonSchema.makeWithDefs(schema, { defs })

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "$ref": "#/components/schemas/MyStruct"
}
*/

console.log(JSON.stringify(defs, null, 2))
/*
Output:
{
  "MyStruct": {
    "type": "object",
    "required": [
      "a"
    ],
    "properties": {
      "a": {
        "type": "string"
      }
    },
    "additionalProperties": false
  }
}
*/
```

**Example** (Combining Multiple Schemas into One OpenAPI Specification)

```ts
import { OpenApiJsonSchema } from "@effect/platform"
import { Schema } from "effect"

// Define multiple schemas with unique identifiers
const schema1 = Schema.Struct({ a: Schema.String }).annotations({
  identifier: "MyStruct1"
})
const schema2 = Schema.Struct({ b: Schema.Number }).annotations({
  identifier: "MyStruct2"
})

// Create a shared definitions object
const defs = {}

// Use `makeWithDefs` to generate schemas for API paths
const paths = {
  paths: {
    "/path1": {
      get: {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: OpenApiJsonSchema.makeWithDefs(schema1, { defs })
              }
            }
          }
        }
      }
    },
    "/path2": {
      get: {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: OpenApiJsonSchema.makeWithDefs(schema2, { defs })
              }
            }
          }
        }
      }
    }
  }
}

// Combine paths and definitions into a single OpenAPI schema
const openApiSchema = {
  components: {
    schemas: defs
  },
  paths
}

console.log(JSON.stringify(openApiSchema, null, 2))
/*
Output:
{
  "components": {
    "schemas": {
      "MyStruct1": {
        "type": "object",
        "required": [
          "a"
        ],
        "properties": {
          "a": {
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "MyStruct2": {
        "type": "object",
        "required": [
          "b"
        ],
        "properties": {
          "b": {
            "type": "number"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "paths": {
    "paths": {
      "/path1": {
        "get": {
          "responses": {
            "200": {
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MyStruct1"
                  }
                }
              }
            }
          }
        }
      },
      "/path2": {
        "get": {
          "responses": {
            "200": {
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MyStruct2"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
*/
```

# HttpLayerRouter

The experimental `HttpLayerRouter` module provides a simplified way to create HTTP servers.
It aims to simplify the process of defining routes and registering other HTTP
services like `HttpApi` or `RpcServer`'s.

## Registering routes

```ts
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { createServer } from "http"

// Here is how you can register a simple GET route
const HelloRoute = Layer.effectDiscard(
  Effect.gen(function* () {
    // First, we need to access the `HttpRouter` service
    const router = yield* HttpLayerRouter.HttpRouter

    // Then, we can add a new route to the router
    yield* router.add("GET", "/hello", HttpServerResponse.text("Hello, World!"))
  })
)

// You can also use the `HttpLayerRouter.use` function to register a route
const GoodbyeRoute = HttpLayerRouter.use(
  Effect.fn(function* (router) {
    // The `router` parameter is the `HttpRouter` service
    yield* router.add(
      "GET",
      "/goodbye",
      HttpServerResponse.text("Goodbye, World!")
    )
  })
)
// Or use `HttpLayerRouter.add/addAll` for simple routes
const SimpleRoute = HttpLayerRouter.add(
  "GET",
  "/simple",
  HttpServerResponse.text("Simply fantastic!")
)

const AllRoutes = Layer.mergeAll(HelloRoute, GoodbyeRoute, SimpleRoute)

// To start the server, we use `HttpLayerRouter.serve` with the routes layer
HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
```

## Applying middleware

```ts
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// Here is a service that we want to provide to every HTTP request
class CurrentSession extends Context.Tag("CurrentSession")<
  CurrentSession,
  {
    readonly token: string
  }
>() {}

// Using the `HttpLayerRouter.middleware` function, we can create a middleware
// that provides the `CurrentSession` service to every HTTP request.
const SessionMiddleware = HttpLayerRouter.middleware<{
  provides: CurrentSession
}>()(
  Effect.gen(function* () {
    yield* Effect.log("SessionMiddleware initialized")

    return (httpEffect) =>
      Effect.provideService(httpEffect, CurrentSession, {
        token: "dummy-token"
      })
  })
)

// And here is an example of global middleware, that modifies the HTTP response.
// Global middleware directly returns a `Layer`.
const CorsMiddleware = HttpLayerRouter.middleware(HttpMiddleware.cors(), {
  global: true
})
// You can also use `HttpLayerRouter.cors()` to create a CORS middleware

const HelloRoute = HttpLayerRouter.add(
  "GET",
  "/hello",
  Effect.gen(function* () {
    // We can now access the `CurrentSession` service in our route handler
    const session = yield* CurrentSession
    return HttpServerResponse.text(
      `Hello, World! Your session token is: ${session.token}`
    )
  })
).pipe(
  // We can provide the `SessionMiddleware.layer` to the `HelloRoute` layer
  Layer.provide(SessionMiddleware.layer),
  // And we can also provide the `CorsMiddleware` layer to handle CORS
  Layer.provide(CorsMiddleware)
)
```

## Interdependent middleware

If middleware depends on another middleware, you can use the `.combine` api to
combine them.

```ts
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

class CurrentSession extends Context.Tag("CurrentSession")<
  CurrentSession,
  {
    readonly token: string
  }
>() {}

const SessionMiddleware = HttpLayerRouter.middleware<{
  provides: CurrentSession
}>()(
  Effect.gen(function* () {
    yield* Effect.log("SessionMiddleware initialized")

    return (httpEffect) =>
      Effect.provideService(httpEffect, CurrentSession, {
        token: "dummy-token"
      })
  })
)

// Here is a middleware that uses the `CurrentSession` service
const LogMiddleware = HttpLayerRouter.middleware(
  Effect.gen(function* () {
    yield* Effect.log("LogMiddleware initialized")

    return Effect.fn(function* (httpEffect) {
      const session = yield* CurrentSession
      yield* Effect.log(`Current session token: ${session.token}`)
      return yield* httpEffect
    })
  })
)

// We can then use the .combine method to combine the middlewares
const LogAndSessionMiddleware = LogMiddleware.combine(SessionMiddleware)

const HelloRoute = HttpLayerRouter.add(
  "GET",
  "/hello",
  Effect.gen(function* () {
    const session = yield* CurrentSession
    return HttpServerResponse.text(
      `Hello, World! Your session token is: ${session.token}`
    )
  })
).pipe(Layer.provide(LogAndSessionMiddleware.layer))
```

## Registering a HttpApi

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiScalar,
  HttpLayerRouter
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "http"

// First, we define our HttpApi
class MyApi extends HttpApi.make("api").add(
  HttpApiGroup.make("users")
    .add(HttpApiEndpoint.get("me", "/me"))
    .prefix("/users")
) {}

// Implement the handlers for the API
const UsersApiLayer = HttpApiBuilder.group(MyApi, "users", (handers) =>
  handers.handle("me", () => Effect.void)
)

// Use `HttpLayerRouter.addHttpApi` to register the API with the router
const HttpApiRoutes = HttpLayerRouter.addHttpApi(MyApi, {
  openapiPath: "/docs/openapi.json"
}).pipe(
  // Provide the api handlers layer
  Layer.provide(UsersApiLayer)
)

// Create a /docs route for the API documentation
const DocsRoute = HttpApiScalar.layerHttpLayerRouter({
  api: MyApi,
  path: "/docs"
})

// Finally, we merge all routes and serve them using the Node HTTP server
const AllRoutes = Layer.mergeAll(HttpApiRoutes, DocsRoute).pipe(
  Layer.provide(HttpLayerRouter.cors())
)

HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
```

## Registering a RpcServer

```ts
import { HttpLayerRouter } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from "@effect/rpc"
import { Effect, Layer, Schema } from "effect"
import { createServer } from "http"

export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String
}) {}

// Define a group of RPCs
export class UserRpcs extends RpcGroup.make(
  Rpc.make("UserById", {
    success: User,
    error: Schema.String, // Indicates that errors, if any, will be returned as strings
    payload: {
      id: Schema.String
    }
  })
) {}

const UserHandlers = UserRpcs.toLayer({
  UserById: ({ id }) => Effect.succeed(new User({ id, name: "John Doe" }))
})

// Use `HttpLayerRouter` to register the rpc server
const RpcRoute = RpcServer.layerHttpRouter({
  group: UserRpcs,
  path: "/rpc"
}).pipe(
  Layer.provide(UserHandlers),
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(HttpLayerRouter.cors()) // provide CORS middleware
)

// Start the HTTP server with the RPC route
HttpLayerRouter.serve(RpcRoute).pipe(
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.launch,
  NodeRuntime.runMain
)
```

## Create a web handler

```ts
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"

const HelloRoute = HttpLayerRouter.use(
  Effect.fn(function* (router) {
    yield* router.add(
      "GET",
      "/hello",
      HttpServerResponse.text("Hellow, World!")
    )
  })
)

const { dispose, handler } = HttpLayerRouter.toWebHandler(HelloRoute)

// When the process is interrupted, we want to clean up resources
process.on("SIGINT", () => {
  dispose().then(
    () => {
      process.exit(0)
    },
    () => {
      process.exit(1)
    }
  )
})

// Use the handler in your server setup
export { handler }
```
