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

## Running a Platform Command with stdout Streamed to process.stdout

To run a command (for example `cat`) and stream its `stdout` to `process.stdout` follow these steps:

```ts
import { Command } from "@effect/platform"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

// Create a command to run `cat` on a file and inherit stdout
const program = Command.make("cat", "./some-file.txt").pipe(
  Command.stdout("inherit"),
  Command.exitCode
)

// Run the command using NodeRuntime with the NodeContext layer
NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
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

# KeyValueStore

## Overview

The `KeyValueStore` module provides a robust and effectful interface for managing key-value pairs. It supports asynchronous operations, ensuring data integrity and consistency, and includes built-in implementations for in-memory, file system-based, and schema-validated stores.

## Basic Usage

The `KeyValueStore` interface includes the following operations:

- **get**: Retrieve a value by key.
- **set**: Store a key-value pair.
- **remove**: Delete a key-value pair.
- **clear**: Remove all key-value pairs.
- **size**: Get the number of stored pairs.
- **modify**: Atomically modify a value.
- **has**: Check if a key exists.
- **isEmpty**: Check if the store is empty.

**Example**

```ts
import { KeyValueStore, layerMemory } from "@effect/platform/KeyValueStore"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const store = yield* KeyValueStore
  console.log(yield* store.size) // Outputs: 0

  yield* store.set("key", "value")
  console.log(yield* store.size) // Outputs: 1

  const value = yield* store.get("key")
  console.log(value) // Outputs: { _id: 'Option', _tag: 'Some', value: 'value' }

  yield* store.remove("key")
  console.log(yield* store.size) // Outputs: 0
})

Effect.runPromise(program.pipe(Effect.provide(layerMemory)))
```

## Built-in Implementations

The module provides several built-in implementations to suit different needs:

- **In-Memory Store**: `layerMemory` provides a simple, in-memory key-value store, ideal for lightweight or testing scenarios.
- **File System Store**: `layerFileSystem` offers a file-based store for persistent storage needs.
- **Schema Store**: `layerSchema` enables schema-based validation for stored values, ensuring data integrity and type safety.

## Schema Store

The `SchemaStore` implementation allows you to validate and parse values according to a defined schema. This ensures that all data stored in the key-value store adheres to the specified structure, enhancing data integrity and type safety.

**Example**

```ts
import { KeyValueStore, layerMemory } from "@effect/platform/KeyValueStore"
import { Schema } from "@effect/schema"
import { Effect } from "effect"

// Define a schema for the values
const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.Number
})

const program = Effect.gen(function* () {
  const store = (yield* KeyValueStore).forSchema(Person)

  // Create a value that adheres to the schema
  const value = { name: "Alice", age: 30 }
  yield* store.set("user1", value)
  console.log(yield* store.size) // Outputs: 1

  // Retrieve and validate the value
  const retrievedValue = yield* store.get("user1")
  console.log(retrievedValue) // Outputs: { _id: 'Option', _tag: 'Some', value: { name: 'Alice', age: 30 } }
})

Effect.runPromise(program.pipe(Effect.provide(layerMemory)))
```

In this example:

- **Person**: Defines the structure for the values stored in the key-value store.
- **store.set**: Stores a value adhering to `Person`.
- **store.get**: Retrieves and validates the stored value against `Person`.

# HTTP Client

## Retrieving Data (GET)

In this section, we'll explore how to retrieve data using the `HttpClient` module from `@effect/platform`.

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getPostAsJson = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(HttpClient.fetch, HttpClientResponse.json)

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

If you want a response in a different format other than JSON, you can utilize other APIs provided by `HttpClientResponse`.

In the following example, we fetch the post as text:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getPostAsText = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(HttpClient.fetch, HttpClientResponse.text)

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

| **API**                            | **Description**                       |
| ---------------------------------- | ------------------------------------- |
| `HttpClientResponse.arrayBuffer`   | Convert to `ArrayBuffer`              |
| `HttpClientResponse.formData`      | Convert to `FormData`                 |
| `HttpClientResponse.json`          | Convert to JSON                       |
| `HttpClientResponse.stream`        | Convert to a `Stream` of `Uint8Array` |
| `HttpClientResponse.text`          | Convert to text                       |
| `HttpClientResponse.urlParamsBody` | Convert to `Http.urlParams.UrlParams` |

### Setting Headers

When making HTTP requests, sometimes you need to include additional information in the request headers. You can set headers using the `setHeader` function for a single header or `setHeaders` for multiple headers simultaneously.

```ts
import { HttpClient, HttpClientRequest } from "@effect/platform"

const getPost = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(
  // Setting a single header
  HttpClientRequest.setHeader(
    "Content-type",
    "application/json; charset=UTF-8"
  ),
  // Setting multiple headers
  HttpClientRequest.setHeaders({
    "Content-type": "application/json; charset=UTF-8",
    Foo: "Bar"
  }),
  HttpClient.fetch
)
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClient` module is integrated with `@effect/schema`.

```ts
import {
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

/*
const getPostAndValidate: Effect.Effect<{
    readonly id: number;
    readonly title: string;
}, Http.error.HttpClientError | ParseError, never>
*/
const getPostAndValidate = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(
  HttpClient.fetch,
  Effect.andThen(HttpClientResponse.schemaBodyJson(Post)),
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

In this example, we define a schema for a post object with properties `id` and `title`. Then, we fetch the data and validate it against this schema using `HttpClientResponse.schemaBodyJson`. Finally, we log the validated post object.

Note that we use `Effect.scoped` after consuming the response. This ensures that any resources associated with the HTTP request are properly cleaned up once we're done processing the response.

### Filtering And Error Handling

It's important to note that `HttpClient.fetch` doesn't consider non-`200` status codes as errors by default. This design choice allows for flexibility in handling different response scenarios. For instance, you might have a schema union where the status code serves as the discriminator, enabling you to define a schema that encompasses all possible response cases.

You can use `HttpClient.filterStatusOk`, or `HttpClient.fetchOk` to ensure only `2xx` responses are treated as successes.

In this example, we attempt to fetch a non-existent page and don't receive any error:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getText = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/non-existing-page"
).pipe(HttpClient.fetch, HttpClientResponse.text)

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)))
/*
Output:
{}
*/
```

However, if we use `HttpClient.filterStatusOk`, an error is logged:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const getText = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/non-existing-page"
).pipe(HttpClient.filterStatusOk(HttpClient.fetch), HttpClientResponse.text)

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)))
/*
Output:
timestamp=... level=ERROR fiber=#0 cause="ResponseError: StatusCode error (404 GET https://jsonplaceholder.typicode.com/non-existing-page): non 2xx status code
    ... stack trace ...
*/
```

Note that you can use `HttpClient.fetchOk` as a shortcut for `HttpClient.filterStatusOk(HttpClient.fetch)`:

```ts
const getText = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/non-existing-page"
).pipe(HttpClient.fetchOk, HttpClientResponse.text)
```

You can also create your own status-based filters. In fact, `HttpClient.filterStatusOk` is just a shortcut for the following filter:

```ts
const getText = HttpClientRequest.get(
  "https://jsonplaceholder.typicode.com/non-existing-page"
).pipe(
  HttpClient.filterStatus(
    HttpClient.fetch,
    (status) => status >= 200 && status < 300
  ),
  HttpClientResponse.text
)

/*
Output:
timestamp=... level=ERROR fiber=#0 cause="ResponseError: StatusCode error (404 GET https://jsonplaceholder.typicode.com/non-existing-page): invalid status code
    ... stack trace ...
*/
```

## POST

To make a POST request, you can use the `HttpClientRequest.post` function provided by the `HttpClient` module. Here's an example of how to create and send a POST request:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const addPost = HttpClientRequest.post(
  "https://jsonplaceholder.typicode.com/posts"
).pipe(
  HttpClientRequest.jsonBody({
    title: "foo",
    body: "bar",
    userId: 1
  }),
  Effect.andThen(HttpClient.fetch),
  HttpClientResponse.json
)

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)))
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

If you need to send data in a format other than JSON, such as plain text, you can use different APIs provided by `HttpClientRequest`.

In the following example, we send the data as text:

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

const addPost = HttpClientRequest.post(
  "https://jsonplaceholder.typicode.com/posts"
).pipe(
  HttpClientRequest.textBody(
    JSON.stringify({
      title: "foo",
      body: "bar",
      userId: 1
    }),
    "application/json; charset=UTF-8"
  ),
  HttpClient.fetch,
  HttpClientResponse.json
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
import {
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

const addPost = HttpClientRequest.post(
  "https://jsonplaceholder.typicode.com/posts"
).pipe(
  HttpClientRequest.jsonBody({
    title: "foo",
    body: "bar",
    userId: 1
  }),
  Effect.andThen(HttpClient.fetch),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Post)),
  Effect.scoped
)

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)))
/*
Output:
{ id: 101, title: 'foo' }
*/
```

## Testing

### Injecting Fetch

To test HTTP requests, you can inject a mock fetch implementation.

```ts
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse
} from "@effect/platform"
import { Effect, Layer } from "effect"
import * as assert from "node:assert"

// Mock fetch implementation
const FetchTest = Layer.succeed(HttpClient.Fetch, () =>
  Promise.resolve(new Response("not found", { status: 404 }))
)

// Program to test
const program = HttpClientRequest.get("https://www.google.com/").pipe(
  HttpClient.fetch,
  HttpClientResponse.text
)

// Test
Effect.gen(function* () {
  const response = yield* program
  assert.equal(response, "not found")
}).pipe(Effect.provide(FetchTest), Effect.runPromise)
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
