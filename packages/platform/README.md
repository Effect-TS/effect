# Introduction

Welcome to the documentation for `@effect/platform`, a library designed for creating platform-independent abstractions (Node.js, Bun, browsers).

With `@effect/platform`, you can incorporate abstract services like `Terminal` or `FileSystem` into your program. Later, during the assembly of the final application, you can provide specific layers for the target platform using the corresponding packages: `platform-node`, `platform-bun`, and `platform-browser`.

This package empowers you to perform various operations, such as:

| **Operation**  | **Description**                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Terminal       | Reading and writing from/to standard input/output                                                |
| Command        | Creating and running a command with the specified process name and an optional list of arguments |
| FileSystem     | Reading and writing from/to the file system                                                      |
| HTTP Client    | Sending HTTP requests and receiving responses                                                    |
| HTTP Server    | Creating HTTP servers to handle incoming requests                                                |
| HTTP Router    | Routing HTTP requests to specific handlers                                                       |
| KeyValueStore  | Storing and retrieving key-value pairs                                                           |
| PlatformLogger | Creating a logger that writes to a specified file from another string logger                     |

By utilizing `@effect/platform`, you can write code that remains platform-agnostic, ensuring compatibility across different environments.

# Terminal

The `@effect/platform/Terminal` module exports a single `Terminal` tag, which serves as the entry point to reading from and writing to standard input and standard output.

## Writing to standard output

```ts
import { Terminal } from "@effect/platform"
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
import { Effect } from "effect"

// const displayMessage: Effect.Effect<void, PlatformError, Terminal.Terminal>
const displayMessage = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal)
  yield* _(terminal.display("a message\n"))
})

NodeRuntime.runMain(displayMessage.pipe(Effect.provide(NodeTerminal.layer)))
// Output: "a message"
```

## Reading from standard input

```ts
import { Terminal } from "@effect/platform"
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
import { Console, Effect } from "effect"

// const readLine: Effect.Effect<void, Terminal.QuitException, Terminal.Terminal>
const readLine = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal)
  const input = yield* _(terminal.readLine)
  yield* _(Console.log(`input: ${input}`))
})

NodeRuntime.runMain(readLine.pipe(Effect.provide(NodeTerminal.layer)))
// Input: "hello"
// Output: "input: hello"
```

These simple examples illustrate how to utilize the `Terminal` module for handling standard input and output in your programs. Let's use this knowledge to build a number guessing game:

```ts
import { Terminal } from "@effect/platform"
import type { PlatformError } from "@effect/platform/Error"
import { Effect, Option, Random } from "effect"

export const secret = Random.nextIntBetween(1, 100)

const parseGuess = (input: string) => {
  const n = parseInt(input, 10)
  return isNaN(n) || n < 1 || n > 100 ? Option.none() : Option.some(n)
}

const display = (message: string) =>
  Effect.gen(function* (_) {
    const terminal = yield* _(Terminal.Terminal)
    yield* _(terminal.display(`${message}\n`))
  })

const prompt = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal)
  yield* _(terminal.display("Enter a guess: "))
  return yield* _(terminal.readLine)
})

const answer: Effect.Effect<
  number,
  Terminal.QuitException | PlatformError,
  Terminal.Terminal
> = Effect.gen(function* (_) {
  const input = yield* _(prompt)
  const guess = parseGuess(input)
  if (Option.isNone(guess)) {
    yield* _(display("You must enter an integer from 1 to 100"))
    return yield* _(answer)
  }
  return guess.value
})

const check = <A, E, R>(
  secret: number,
  guess: number,
  ok: Effect.Effect<A, E, R>,
  ko: Effect.Effect<A, E, R>
): Effect.Effect<A, E | PlatformError, R | Terminal.Terminal> =>
  Effect.gen(function* (_) {
    if (guess > secret) {
      yield* _(display("Too high"))
      return yield* _(ko)
    } else if (guess < secret) {
      yield* _(display("Too low"))
      return yield* _(ko)
    } else {
      return yield* _(ok)
    }
  })

const end = display("You guessed it!")

const loop = (
  secret: number
): Effect.Effect<
  void,
  Terminal.QuitException | PlatformError,
  Terminal.Terminal
> =>
  Effect.gen(function* (_) {
    const guess = yield* _(answer)
    return yield* _(
      check(
        secret,
        guess,
        end,
        Effect.suspend(() => loop(secret))
      )
    )
  })

export const game = Effect.gen(function* (_) {
  yield* _(
    display(
      "We have selected a random number between 1 and 100. See if you can guess it in 10 turns or fewer. We'll tell you if your guess was too high or too low."
    )
  )
  yield* _(loop(yield* _(secret)))
})
```

Let's run the game in Node.js:

```ts
import { NodeRuntime, NodeTerminal } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import { game } from "./game.js"

NodeRuntime.runMain(game.pipe(Effect.provide(NodeTerminal.layer)))
```

Let's run the game in Bun:

```ts
import { BunRuntime, BunTerminal } from "@effect/platform-bun"
import * as Effect from "effect/Effect"
import { game } from "./game.js"

BunRuntime.runMain(game.pipe(Effect.provide(BunTerminal.layer)))
```

# Command

As an example of using the `@effect/platform/Command` module, let's see how to run the TypeScript compiler `tsc`:

```ts
import { Command, CommandExecutor } from "@effect/platform"
import {
  NodeCommandExecutor,
  NodeFileSystem,
  NodeRuntime
} from "@effect/platform-node"
import { Effect } from "effect"

// const program: Effect.Effect<string, PlatformError, CommandExecutor.CommandExecutor>
const program = Effect.gen(function* (_) {
  const executor = yield* _(CommandExecutor.CommandExecutor)

  // Creating a command to run the TypeScript compiler
  const command = Command.make("tsc", "--noEmit")
  console.log("Running tsc...")

  // Executing the command and capturing the output
  const output = yield* _(executor.string(command))
  console.log(output)
  return output
})

// Running the program with the necessary runtime and executor layers
NodeRuntime.runMain(
  program.pipe(
    Effect.provide(NodeCommandExecutor.layer),
    Effect.provide(NodeFileSystem.layer)
  )
)
```

## Obtaining Information About the Running Process

Here, we'll explore how to retrieve information about a running process.

```ts
import { Command, CommandExecutor } from "@effect/platform"
import {
  NodeCommandExecutor,
  NodeFileSystem,
  NodeRuntime
} from "@effect/platform-node"
import { Effect, Stream, String } from "effect"

const runString = <E, R>(
  stream: Stream.Stream<Uint8Array, E, R>
): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat))

const program = Effect.gen(function* (_) {
  const executor = yield* _(CommandExecutor.CommandExecutor)

  const command = Command.make("ls")

  const [exitCode, stdout, stderr] = yield* _(
    // Start running the command and return a handle to the running process.
    executor.start(command),
    Effect.flatMap((process) =>
      Effect.all(
        [
          // Waits for the process to exit and returns the ExitCode of the command that was run.
          process.exitCode,
          // The standard output stream of the process.
          runString(process.stdout),
          // The standard error stream of the process.
          runString(process.stderr)
        ],
        { concurrency: 3 }
      )
    )
  )
  console.log({ exitCode, stdout, stderr })
})

NodeRuntime.runMain(
  Effect.scoped(program).pipe(
    Effect.provide(NodeCommandExecutor.layer),
    Effect.provide(NodeFileSystem.layer)
  )
)
```

# FileSystem

The `@effect/platform/FileSystem` module provides a single `FileSystem` tag, which acts as the gateway for interacting with the filesystem.

Here's a list of operations that can be performed using the `FileSystem` tag:

| **Name**                    | **Arguments**                                                    | **Return**                                     | **Description**                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **access**                  | `path: string`, `options?: AccessFileOptions`                    | `Effect<void, PlatformError>`                  | Check if a file can be accessed. You can optionally specify the level of access to check for.                                                                          |
| **copy**                    | `fromPath: string`, `toPath: string`, `options?: CopyOptions`    | `Effect<void, PlatformError>`                  | Copy a file or directory from `fromPath` to `toPath`. Equivalent to `cp -r`.                                                                                           |
| **copyFile**                | `fromPath: string`, `toPath: string`                             | `Effect<void, PlatformError>`                  | Copy a file from `fromPath` to `toPath`.                                                                                                                               |
| **chmod**                   | `path: string`, `mode: number`                                   | `Effect<void, PlatformError>`                  | Change the permissions of a file.                                                                                                                                      |
| **chown**                   | `path: string`, `uid: number`, `gid: number`                     | `Effect<void, PlatformError>`                  | Change the owner and group of a file.                                                                                                                                  |
| **exists**                  | `path: string`                                                   | `Effect<boolean, PlatformError>`               | Check if a path exists.                                                                                                                                                |
| **link**                    | `fromPath: string`, `toPath: string`                             | `Effect<void, PlatformError>`                  | Create a hard link from `fromPath` to `toPath`.                                                                                                                        |
| **makeDirectory**           | `path: string`, `options?: MakeDirectoryOptions`                 | `Effect<void, PlatformError>`                  | Create a directory at `path`. You can optionally specify the mode and whether to recursively create nested directories.                                                |
| **makeTempDirectory**       | `options?: MakeTempDirectoryOptions`                             | `Effect<string, PlatformError>`                | Create a temporary directory. By default, the directory will be created inside the system's default temporary directory.                                               |
| **makeTempDirectoryScoped** | `options?: MakeTempDirectoryOptions`                             | `Effect<string, PlatformError, Scope>`         | Create a temporary directory inside a scope. Functionally equivalent to `makeTempDirectory`, but the directory will be automatically deleted when the scope is closed. |
| **makeTempFile**            | `options?: MakeTempFileOptions`                                  | `Effect<string, PlatformError>`                | Create a temporary file. The directory creation is functionally equivalent to `makeTempDirectory`. The file name will be a randomly generated string.                  |
| **makeTempFileScoped**      | `options?: MakeTempFileOptions`                                  | `Effect<string, PlatformError, Scope>`         | Create a temporary file inside a scope. Functionally equivalent to `makeTempFile`, but the file will be automatically deleted when the scope is closed.                |
| **open**                    | `path: string`, `options?: OpenFileOptions`                      | `Effect<File, PlatformError, Scope>`           | Open a file at `path` with the specified `options`. The file handle will be automatically closed when the scope is closed.                                             |
| **readDirectory**           | `path: string`, `options?: ReadDirectoryOptions`                 | `Effect<ReadonlyArray<string>, PlatformError>` | List the contents of a directory. You can recursively list the contents of nested directories by setting the `recursive` option.                                       |
| **readFile**                | `path: string`                                                   | `Effect<Uint8Array, PlatformError>`            | Read the contents of a file.                                                                                                                                           |
| **readFileString**          | `path: string`, `encoding?: string`                              | `Effect<string, PlatformError>`                | Read the contents of a file as a string.                                                                                                                               |
| **readLink**                | `path: string`                                                   | `Effect<string, PlatformError>`                | Read the destination of a symbolic link.                                                                                                                               |
| **realPath**                | `path: string`                                                   | `Effect<string, PlatformError>`                | Resolve a path to its canonicalized absolute pathname.                                                                                                                 |
| **remove**                  | `path: string`, `options?: RemoveOptions`                        | `Effect<void, PlatformError>`                  | Remove a file or directory. By setting the `recursive` option to `true`, you can recursively remove nested directories.                                                |
| **rename**                  | `oldPath: string`, `newPath: string`                             | `Effect<void, PlatformError>`                  | Rename a file or directory.                                                                                                                                            |
| **sink**                    | `path: string`, `options?: SinkOptions`                          | `Sink<void, Uint8Array, never, PlatformError>` | Create a writable `Sink` for the specified `path`.                                                                                                                     |
| **stat**                    | `path: string`                                                   | `Effect<File.Info, PlatformError>`             | Get information about a file at `path`.                                                                                                                                |
| **stream**                  | `path: string`, `options?: StreamOptions`                        | `Stream<Uint8Array, PlatformError>`            | Create a readable `Stream` for the specified `path`.                                                                                                                   |
| **symlink**                 | `fromPath: string`, `toPath: string`                             | `Effect<void, PlatformError>`                  | Create a symbolic link from `fromPath` to `toPath`.                                                                                                                    |
| **truncate**                | `path: string`, `length?: SizeInput`                             | `Effect<void, PlatformError>`                  | Truncate a file to a specified length. If the `length` is not specified, the file will be truncated to length `0`.                                                     |
| **utimes**                  | `path: string`, `atime: Date \| number`, `mtime: Date \| number` | `Effect<void, PlatformError>`                  | Change the file system timestamps of the file at `path`.                                                                                                               |
| **watch**                   | `path: string`                                                   | `Stream<WatchEvent, PlatformError>`            | Watch a directory or file for changes.                                                                                                                                 |

Let's explore a simple example using `readFileString`:

```ts
import { FileSystem } from "@effect/platform"
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

// const readFileString: Effect.Effect<void, PlatformError, FileSystem.FileSystem>
const readFileString = Effect.gen(function* (_) {
  const fs = yield* _(FileSystem.FileSystem)

  // Reading the content of the same file where this code is written
  const content = yield* _(fs.readFileString("./index.ts", "utf8"))
  console.log(content)
})

NodeRuntime.runMain(readFileString.pipe(Effect.provide(NodeFileSystem.layer)))
```

# HTTP Client

## Retrieving Data (GET)

In this section, we'll explore how to retrieve data using the `HttpClient` module from `@effect/platform`.

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const getPostAsJson = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(Http.client.fetch, Http.response.json)

NodeRuntime.runMain(
  getPostAsJson.pipe(Effect.andThen((post) => Console.log(typeof post, post)))
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

If you want a response in a different format other than JSON, you can utilize other APIs provided by `Http.response`.

In the following example, we fetch the post as text:

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const getPostAsText = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(Http.client.fetch, Http.response.text)

NodeRuntime.runMain(
  getPostAsText.pipe(Effect.andThen((post) => Console.log(typeof post, post)))
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

Here are some APIs you can use to convert the response:

| **API**                       | **Description**                       |
| ----------------------------- | ------------------------------------- |
| `Http.response.arrayBuffer`   | Convert to `ArrayBuffer`              |
| `Http.response.formData`      | Convert to `FormData`                 |
| `Http.response.json`          | Convert to JSON                       |
| `Http.response.stream`        | Convert to a `Stream` of `Uint8Array` |
| `Http.response.text`          | Convert to text                       |
| `Http.response.urlParamsBody` | Convert to `Http.urlParams.UrlParams` |

### Setting Headers

When making HTTP requests, sometimes you need to include additional information in the request headers. You can set headers using the `setHeader` function for a single header or `setHeaders` for multiple headers simultaneously.

```ts
import * as Http from "@effect/platform/HttpClient"

const getPost = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(
    // Setting a single header
    Http.request.setHeader("Content-type", "application/json; charset=UTF-8"),
    // Setting multiple headers
    Http.request.setHeaders({
      "Content-type": "application/json; charset=UTF-8",
      Foo: "Bar"
    }),
    Http.client.fetch
  )
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClient` module is integrated with `@effect/schema`.

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Schema } from "@effect/schema"
import { Console, Effect } from "effect"

const Post = Schema.struct({
  id: Schema.number,
  title: Schema.string
})

/*
const getPostAndValidate: Effect.Effect<{
    readonly id: number;
    readonly title: string;
}, Http.error.HttpClientError | ParseError, never>
*/
const getPostAndValidate = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(
    Http.client.fetch,
    Effect.andThen(Http.response.schemaBodyJson(Post)),
    Effect.scoped
  )

NodeRuntime.runMain(getPostAndValidate.pipe(Effect.andThen(Console.log)))
/*
Output:
{
  id: 1,
  title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit'
}
*/
```

In this example, we define a schema for a post object with properties `id` and `title`. Then, we fetch the data and validate it against this schema using `Http.response.schemaBodyJson`. Finally, we log the validated post object.

Note that we use `Effect.scoped` after consuming the response. This ensures that any resources associated with the HTTP request are properly cleaned up once we're done processing the response.

### Filtering And Error Handling

It's important to note that `Http.client.fetch` doesn't consider non-`200` status codes as errors by default. This design choice allows for flexibility in handling different response scenarios. For instance, you might have a schema union where the status code serves as the discriminator, enabling you to define a schema that encompasses all possible response cases.

You can use `Http.client.filterStatusOk`, or `Http.client.fetchOk` to ensure only `2xx` responses are treated as successes.

In this example, we attempt to fetch a non-existent page and don't receive any error:

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.fetch, Http.response.text)

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)))
/*
Output:
{}
*/
```

However, if we use `Http.client.filterStatusOk`, an error is logged:

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.filterStatusOk(Http.client.fetch), Http.response.text)

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)))
/*
Output:
timestamp=2024-03-25T10:21:16.972Z level=ERROR fiber=#0 cause="ResponseError: StatusCode error (404 GET https://jsonplaceholder.typicode.com/non-existing-page): non 2xx status code
*/
```

Note that you can use `Http.client.fetchOk` as a shortcut for `Http.client.filterStatusOk(Http.client.fetch)`:

```ts
const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.fetchOk, Http.response.text)
```

You can also create your own status-based filters. In fact, `Http.client.filterStatusOk` is just a shortcut for the following filter:

```ts
const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(
    Http.client.filterStatus(
      Http.client.fetch,
      (status) => status >= 200 && status < 300
    ),
    Http.response.text
  )
```

## POST

To make a POST request, you can use the `Http.request.post` function provided by the `HttpClient` module. Here's an example of how to create and send a POST request:

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.jsonBody({
      title: "foo",
      body: "bar",
      userId: 1
    }),
    Effect.andThen(Http.client.fetch),
    Http.response.json
  )

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)))
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

If you need to send data in a format other than JSON, such as plain text, you can use different APIs provided by `Http.request`.

In the following example, we send the data as text:

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Console, Effect } from "effect"

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.textBody(
      JSON.stringify({
        title: "foo",
        body: "bar",
        userId: 1
      }),
      "application/json; charset=UTF-8"
    ),
    Http.client.fetch,
    Http.response.json
  )

NodeRuntime.runMain(Effect.andThen(addPost, Console.log))
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClient` module is integrated with `@effect/schema`.

```ts
import { NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpClient"
import { Schema } from "@effect/schema"
import { Console, Effect } from "effect"

const Post = Schema.struct({
  id: Schema.number,
  title: Schema.string
})

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.jsonBody({
      title: "foo",
      body: "bar",
      userId: 1
    }),
    Effect.andThen(Http.client.fetch),
    Effect.andThen(Http.response.schemaBodyJson(Post)),
    Effect.scoped
  )

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)))
/*
Output:
{ id: 101, title: 'foo' }
*/
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

These components are designed to work together in a modular and flexible way, allowing developers to build complex server applications with reusable components. Here’s how you might typically use these components in a project:

1. **Create Handlers**: Define functions that process specific types of requests (e.g., GET, POST) and return responses.

2. **Set Up Routers**: Organize handlers into routers, where each router manages a subset of application routes.

3. **Apply Middleware**: Enhance routers or entire servers with middleware to add extra functionality like error handling or request logging.

4. **Initialize the Server**: Wrap the main router with server functionality, applying any server-wide middleware, and start listening for requests.

## Getting Started

### Hello world example

In this example, we will create a simple HTTP server that listens on port `3000`. The server will respond with "Hello World!" when a request is made to the root URL (/) and return a `500` error for all other paths.

Node.js Example

```ts
import { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

// Define the router with a single route for the root URL
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World"))
)

// Set up the application server with logging
const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = NodeHttpServer.server.layer(() => createServer(), { port })

// Run the application
NodeRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))

/*
Output:
timestamp=... level=INFO fiber=#0 message="Listening on http://localhost:3000"
*/
```

Bun Example

```ts
import { HttpServer } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Layer } from "effect"

// Define the router with a single route for the root URL
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World"))
)

// Set up the application server with logging
const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

// Specify the port
const port = 3000

// Create a server layer with the specified port
const ServerLive = BunHttpServer.server.layer({ port })

// Run the application
BunRuntime.runMain(Layer.launch(Layer.provide(app, ServerLive)))

/*
Output:
timestamp=... level=INFO fiber=#0 message="Listening on http://localhost:3000"
*/
```

To avoid boilerplate code for the final server setup, we'll use a helper function from the `listen.ts` file:

```ts
import type { HttpServer } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"

export const listen = (
  app: Layer.Layer<
    never,
    never,
    HttpServer.platform.Platform | HttpServer.server.Server
  >,
  port: number
) =>
  NodeRuntime.runMain(
    Layer.launch(
      Layer.provide(
        app,
        NodeHttpServer.server.layer(() => createServer(), { port })
      )
    )
  )
```

### Basic routing

Routing refers to determining how an application responds to a client request to a particular endpoint, which is a URI (or path) and a specific HTTP request method (GET, POST, and so on).

Route definition takes the following structure:

```
router.pipe(HttpServer.router.METHOD(PATH, HANDLER))
```

Where:

- **router** is an instance of `Router` (`import type { Router } from "@effect/platform/Http/Router"`).
- **METHOD** is an HTTP request method, in lowercase (e.g., get, post, put, del).
- **PATH** is the path on the server (e.g., "/", "/user").
- **HANDLER** is the action that gets executed when the route is matched.

The following examples illustrate defining simple routes.

Respond with `"Hello World!"` on the homepage:

```ts
router.pipe(HttpServer.router.get("/", HttpServer.response.text("Hello World")))
```

Respond to POST request on the root route (/), the application's home page:

```ts
router.pipe(
  HttpServer.router.post("/", HttpServer.response.text("Got a POST request"))
)
```

Respond to a PUT request to the `/user` route:

```ts
router.pipe(
  HttpServer.router.put(
    "/user",
    HttpServer.response.text("Got a PUT request at /user")
  )
)
```

Respond to a DELETE request to the `/user` route:

```ts
router.pipe(
  HttpServer.router.del(
    "/user",
    HttpServer.response.text("Got a DELETE request at /user")
  )
)
```

### Serving static files

To serve static files such as images, CSS files, and JavaScript files, use the `HttpServer.response.file` built-in action.

```ts
import { HttpServer } from "@effect/platform"
import { listen } from "./listen.js"

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.file("index.html"))
)

const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

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

You define routing using methods of the `HttpServer.router` object that correspond to HTTP methods; for example, `HttpServer.router.get()` to handle GET requests and `HttpServer.router.post` to handle POST requests. You can also use `HttpServer.router.all()` to handle all HTTP methods.

These routing methods specify a `Route.Handler` called when the application receives a request to the specified route (endpoint) and HTTP method. In other words, the application “listens” for requests that match the specified route(s) and method(s), and when it detects a match, it calls the specified handler.

The following code is an example of a very basic route.

```ts
// respond with "hello world" when a GET request is made to the homepage
HttpServer.router.get("/", HttpServer.response.text("Hello World"))
```

### Route methods

A route method is derived from one of the HTTP methods, and is attached to an instance of the `HttpServer.router` object.

The following code is an example of routes that are defined for the GET and the POST methods to the root of the app.

```ts
// GET method route
HttpServer.router.get(
  "/",
  HttpServer.response.text("GET request to the homepage")
)

// POST method route
HttpServer.router.post(
  "/",
  HttpServer.response.text("POST request to the homepage")
)
```

`HttpServer.router` supports methods that correspond to all HTTP request methods: `get`, `post`, and so on.

There is a special routing method, `HttpServer.router.all()`, used to load middleware functions at a path for **all** HTTP request methods. For example, the following handler is executed for requests to the route “/secret” whether using GET, POST, PUT, DELETE.

```ts
HttpServer.router.all(
  "/secret",
  HttpServer.response
    .empty()
    .pipe(Effect.tap(Console.log("Accessing the secret section ...")))
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
HttpServer.router.get("/", HttpServer.response.text("root"))
```

This route path will match requests to `/user`.

```ts
HttpServer.router.get("/user", HttpServer.response.text("user"))
```

This route path matches requests to any path starting with `/user` (e.g., `/user`, `/users`, etc.)

```ts
HttpServer.router.get(
  "/user*",
  Effect.map(HttpServer.request.ServerRequest, (req) =>
    HttpServer.response.text(req.url)
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
import { HttpServer } from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Define the schema for route parameters
const Params = Schema.Struct({
  userId: Schema.String,
  bookId: Schema.String
})

// Create a router with a route that captures parameters
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/users/:userId/books/:bookId",
    HttpServer.router
      .schemaPathParams(Params)
      .pipe(Effect.flatMap((params) => HttpServer.response.json(params)))
  )
)

const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

listen(app, 3000)
```

### Response methods

The methods on `HttpServer.response` object in the following table can send a response to the client, and terminate the request-response cycle. If none of these methods are called from a route handler, the client request will be left hanging.

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

Use the `HttpServer.router` object to create modular, mountable route handlers. A `Router` instance is a complete middleware and routing system, often referred to as a "mini-app."

The following example shows how to create a router as a module, define some routes, and mount the router module on a path in the main app.

Create a file named `birds.ts` in your app directory with the following content:

```ts
import { HttpServer } from "@effect/platform"

export const birds = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Birds home page")),
  HttpServer.router.get("/about", HttpServer.response.text("About birds"))
)
```

In your main application file, load the router module and mount it.

```ts
import { HttpServer } from "@effect/platform"
import { birds } from "./birds.js"
import { listen } from "./listen.js"

// Create the main router and mount the birds router
const router = HttpServer.router.empty.pipe(
  HttpServer.router.mount("/birds", birds)
)

const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

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
const myLogger = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    console.log("LOGGED")
    return yield* app
  })
)
```

To use the middleware, add it to the router using `HttpServer.router.use()`:

```ts
import { HttpServer } from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

const myLogger = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    console.log("LOGGED")
    return yield* app
  })
)

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World"))
)

const app = router.pipe(
  HttpServer.router.use(myLogger),
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

listen(app, 3000)
```

With this setup, every request to the app will log "LOGGED" to the terminal. Middleware execute in the order they are loaded.

### Middleware `requestTime`

Next, we'll create a middleware that records the timestamp of each HTTP request and provides it via a service called `RequestTime`.

```ts
class RequestTime extends Context.Tag("RequestTime")<RequestTime, number>() {}

const requestTime = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    return yield* app.pipe(Effect.provideService(RequestTime, Date.now()))
  })
)
```

Update the app to use this middleware and display the timestamp in the response:

```ts
import { HttpServer } from "@effect/platform"
import { Context, Effect } from "effect"
import { listen } from "./listen.js"

class RequestTime extends Context.Tag("RequestTime")<RequestTime, number>() {}

const requestTime = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    return yield* app.pipe(Effect.provideService(RequestTime, Date.now()))
  })
)

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/",
    Effect.gen(function* () {
      const requestTime = yield* RequestTime
      const responseText = `Hello World<br/><small>Requested at: ${requestTime}</small>`
      return yield* HttpServer.response.html(responseText)
    })
  )
)

const app = router.pipe(
  HttpServer.router.use(requestTime),
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

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

const cookieValidator = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    const req = yield* HttpServer.request.ServerRequest
    yield* externallyValidateCookie(req.cookies.testCookie)
    return yield* app
  }).pipe(
    Effect.catchTag("CookieError", () =>
      HttpServer.response.text("Invalid cookie")
    )
  )
)
```

Update the app to use the `cookieValidator` middleware:

```ts
import { HttpServer } from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

class CookieError {
  readonly _tag = "CookieError"
}

const externallyValidateCookie = (testCookie: string | undefined) =>
  testCookie && testCookie.length > 0
    ? Effect.succeed(testCookie)
    : Effect.fail(new CookieError())

const cookieValidator = HttpServer.middleware.make((app) =>
  Effect.gen(function* () {
    const req = yield* HttpServer.request.ServerRequest
    yield* externallyValidateCookie(req.cookies.testCookie)
    return yield* app
  }).pipe(
    Effect.catchTag("CookieError", () =>
      HttpServer.response.text("Invalid cookie")
    )
  )
)

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World"))
)

const app = router.pipe(
  HttpServer.router.use(cookieValidator),
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

listen(app, 3000)
```

Test the middleware with the following commands:

```sh
curl -i http://localhost:3000
curl -i http://localhost:3000 --cookie "testCookie=myvalue"
curl -i http://localhost:3000 --cookie "testCookie="
```

This setup validates the `testCookie` and returns "Invalid cookie" if the validation fails, or "Hello World" if it passes.

## Built-in middleware

### Middleware Summary

| Middleware            | Description                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Logger**            | Provides detailed logging of all requests and responses, aiding in debugging and monitoring application activities.               |
| **xForwardedHeaders** | Manages `X-Forwarded-*` headers to accurately maintain client information such as IP addresses and host names in proxy scenarios. |

### logger

The `HttpServer.middleware.logger` middleware enables logging for your entire application, providing insights into each request and response. Here’s how to set it up:

```ts
import { HttpServer } from "@effect/platform"
import { listen } from "./listen.js"

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World"))
)

// Apply the logger middleware globally
const app = router.pipe(
  HttpServer.server.serve(HttpServer.middleware.logger),
  HttpServer.server.withLogAddress
)

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

To disable the logger for specific routes, you can use `HttpServer.middleware.withLoggerDisabled`:

```ts
import { HttpServer } from "@effect/platform"
import { listen } from "./listen.js"

// Create the router with routes that will and will not have logging
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get("/", HttpServer.response.text("Hello World")),
  HttpServer.router.get(
    "/no-logger",
    HttpServer.response
      .text("no-logger")
      .pipe(HttpServer.middleware.withLoggerDisabled)
  )
)

// Apply the logger middleware globally
const app = router.pipe(
  HttpServer.server.serve(HttpServer.middleware.logger),
  HttpServer.server.withLogAddress
)

listen(app, 3000)
/*
curl -i http://localhost:3000/no-logger
timestamp=2024-05-19T09:53:29.877Z level=INFO fiber=#0 message="Listening on http://0.0.0.0:3000"
*/
```

### xForwardedHeaders

This middleware handles `X-Forwarded-*` headers, useful when your app is behind a reverse proxy or load balancer and you need to retrieve the original client's IP and host information.

```ts
import { HttpServer } from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Create a router and a route that logs request headers and remote address
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/",
    Effect.gen(function* () {
      const req = yield* HttpServer.request.ServerRequest
      console.log(req.headers)
      console.log(req.remoteAddress)
      return yield* HttpServer.response.text("Hello World")
    })
  )
)

// Set up the server with xForwardedHeaders middleware
const app = router.pipe(
  HttpServer.server.serve(HttpServer.middleware.xForwardedHeaders),
  HttpServer.server.withLogAddress
)

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
import { HttpServer } from "@effect/platform"
import { Effect } from "effect"
import { listen } from "./listen.js"

// Define routes that might throw errors or fail
const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/throw",
    Effect.sync(() => {
      throw new Error("BROKEN") // This will intentionally throw an error
    })
  ),
  HttpServer.router.get("/fail", Effect.fail("Uh oh!")) // This will intentionally fail
)

// Configure the application to handle different types of errors
const app = router.pipe(
  Effect.catchTags({
    RouteNotFound: () =>
      HttpServer.response.text("Route Not Found", { status: 404 })
  }),
  Effect.catchAllCause((cause) =>
    HttpServer.response.text(cause.toString(), { status: 500 })
  ),
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
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
import { HttpServer } from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/",
    Effect.gen(function* () {
      // Define the schema for expected headers and validate them
      const headers = yield* HttpServer.request.schemaHeaders(
        Schema.Struct({ test: Schema.String })
      )
      return yield* HttpServer.response.text("header: " + headers.test)
    }).pipe(
      // Handle parsing errors
      Effect.catchTag("ParseError", (e) =>
        HttpServer.response.text(`Invalid header: ${e.message}`)
      )
    )
  )
)

const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

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

Here’s how you can validate cookies received in HTTP requests:

```ts
import { HttpServer } from "@effect/platform"
import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { listen } from "./listen.js"

const router = HttpServer.router.empty.pipe(
  HttpServer.router.get(
    "/",
    Effect.gen(function* () {
      const cookies = yield* HttpServer.request.schemaCookies(
        Schema.Struct({ test: Schema.String })
      )
      return yield* HttpServer.response.text("cookie: " + cookies.test)
    }).pipe(
      Effect.catchTag("ParseError", (e) =>
        HttpServer.response.text(`Invalid cookie: ${e.message}`)
      )
    )
  )
)

const app = router.pipe(
  HttpServer.server.serve(),
  HttpServer.server.withLogAddress
)

listen(app, 3000)
```

Validate the cookie handling with the following `curl` commands:

```sh
# Request without any cookies
curl -i http://localhost:3000

# Request with the valid cookie
curl -i http://localhost:3000 --cookie "test=myvalue"
```
