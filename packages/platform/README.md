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
import { Terminal } from "@effect/platform";
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { Effect } from "effect";

// const displayMessage: Effect.Effect<void, PlatformError, Terminal.Terminal>
const displayMessage = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal);
  yield* _(terminal.display("a message\n"));
});

NodeRuntime.runMain(displayMessage.pipe(Effect.provide(NodeTerminal.layer)));
// Output: "a message"
```

## Reading from standard input

```ts
import { Terminal } from "@effect/platform";
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { Console, Effect } from "effect";

// const readLine: Effect.Effect<void, Terminal.QuitException, Terminal.Terminal>
const readLine = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal);
  const input = yield* _(terminal.readLine);
  yield* _(Console.log(`input: ${input}`));
});

NodeRuntime.runMain(readLine.pipe(Effect.provide(NodeTerminal.layer)));
// Input: "hello"
// Output: "input: hello"
```

These simple examples illustrate how to utilize the `Terminal` module for handling standard input and output in your programs. Let's use this knowledge to build a number guessing game:

```ts
import { Terminal } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Option, Random } from "effect";

export const secret = Random.nextIntBetween(1, 100);

const parseGuess = (input: string) => {
  const n = parseInt(input, 10);
  return isNaN(n) || n < 1 || n > 100 ? Option.none() : Option.some(n);
};

const display = (message: string) =>
  Effect.gen(function* (_) {
    const terminal = yield* _(Terminal.Terminal);
    yield* _(terminal.display(`${message}\n`));
  });

const prompt = Effect.gen(function* (_) {
  const terminal = yield* _(Terminal.Terminal);
  yield* _(terminal.display("Enter a guess: "));
  return yield* _(terminal.readLine);
});

const answer: Effect.Effect<
  number,
  Terminal.QuitException | PlatformError,
  Terminal.Terminal
> = Effect.gen(function* (_) {
  const input = yield* _(prompt);
  const guess = parseGuess(input);
  if (Option.isNone(guess)) {
    yield* _(display("You must enter an integer from 1 to 100"));
    return yield* _(answer);
  }
  return guess.value;
});

const check = <A, E, R>(
  secret: number,
  guess: number,
  ok: Effect.Effect<A, E, R>,
  ko: Effect.Effect<A, E, R>
): Effect.Effect<A, E | PlatformError, R | Terminal.Terminal> =>
  Effect.gen(function* (_) {
    if (guess > secret) {
      yield* _(display("Too high"));
      return yield* _(ko);
    } else if (guess < secret) {
      yield* _(display("Too low"));
      return yield* _(ko);
    } else {
      return yield* _(ok);
    }
  });

const end = display("You guessed it!");

const loop = (
  secret: number
): Effect.Effect<
  void,
  Terminal.QuitException | PlatformError,
  Terminal.Terminal
> =>
  Effect.gen(function* (_) {
    const guess = yield* _(answer);
    return yield* _(
      check(
        secret,
        guess,
        end,
        Effect.suspend(() => loop(secret))
      )
    );
  });

export const game = Effect.gen(function* (_) {
  yield* _(
    display(
      "We have selected a random number between 1 and 100. See if you can guess it in 10 turns or fewer. We'll tell you if your guess was too high or too low."
    )
  );
  yield* _(loop(yield* _(secret)));
});
```

Let's run the game in Node.js:

```ts
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import * as Effect from "effect/Effect";
import { game } from "./game.js";

NodeRuntime.runMain(game.pipe(Effect.provide(NodeTerminal.layer)));
```

Let's run the game in Bun:

```ts
import { BunRuntime, BunTerminal } from "@effect/platform-bun";
import * as Effect from "effect/Effect";
import { game } from "./game.js";

BunRuntime.runMain(game.pipe(Effect.provide(BunTerminal.layer)));
```

# Command

As an example of using the `@effect/platform/Command` module, let's see how to run the TypeScript compiler `tsc`:

```ts
import { Command, CommandExecutor } from "@effect/platform";
import {
  NodeCommandExecutor,
  NodeFileSystem,
  NodeRuntime,
} from "@effect/platform-node";
import { Effect } from "effect";

// const program: Effect.Effect<string, PlatformError, CommandExecutor.CommandExecutor>
const program = Effect.gen(function* (_) {
  const executor = yield* _(CommandExecutor.CommandExecutor);

  // Creating a command to run the TypeScript compiler
  const command = Command.make("tsc", "--noEmit");
  console.log("Running tsc...");

  // Executing the command and capturing the output
  const output = yield* _(executor.string(command));
  console.log(output);
  return output;
});

// Running the program with the necessary runtime and executor layers
NodeRuntime.runMain(
  program.pipe(
    Effect.provide(NodeCommandExecutor.layer),
    Effect.provide(NodeFileSystem.layer)
  )
);
```

## Obtaining Information About the Running Process

Here, we'll explore how to retrieve information about a running process.

```ts
import { Command, CommandExecutor } from "@effect/platform";
import {
  NodeCommandExecutor,
  NodeFileSystem,
  NodeRuntime,
} from "@effect/platform-node";
import { Effect, Stream, String } from "effect";

const runString = <E, R>(
  stream: Stream.Stream<Uint8Array, E, R>
): Effect.Effect<string, E, R> =>
  stream.pipe(Stream.decodeText(), Stream.runFold(String.empty, String.concat));

const program = Effect.gen(function* (_) {
  const executor = yield* _(CommandExecutor.CommandExecutor);

  const command = Command.make("ls");

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
          runString(process.stderr),
        ],
        { concurrency: 3 }
      )
    )
  );
  console.log({ exitCode, stdout, stderr });
});

NodeRuntime.runMain(
  Effect.scoped(program).pipe(
    Effect.provide(NodeCommandExecutor.layer),
    Effect.provide(NodeFileSystem.layer)
  )
);
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
import { FileSystem } from "@effect/platform";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

// const readFileString: Effect.Effect<void, PlatformError, FileSystem.FileSystem>
const readFileString = Effect.gen(function* (_) {
  const fs = yield* _(FileSystem.FileSystem);

  // Reading the content of the same file where this code is written
  const content = yield* _(fs.readFileString("./index.ts", "utf8"));
  console.log(content);
});

NodeRuntime.runMain(readFileString.pipe(Effect.provide(NodeFileSystem.layer)));
```

# HTTP Client

## Retrieving Data (GET)

In this section, we'll explore how to retrieve data using the `HttpClient` module from `@effect/platform`.

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const getPostAsJson = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(Http.client.fetch(), Http.response.json);

NodeRuntime.runMain(
  getPostAsJson.pipe(Effect.andThen((post) => Console.log(typeof post, post)))
);
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
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const getPostAsText = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(Http.client.fetch(), Http.response.text);

NodeRuntime.runMain(
  getPostAsText.pipe(Effect.andThen((post) => Console.log(typeof post, post)))
);
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
import * as Http from "@effect/platform/HttpClient";

const getPost = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(
    // Setting a single header
    Http.request.setHeader("Content-type", "application/json; charset=UTF-8"),
    // Setting multiple headers
    Http.request.setHeaders({
      "Content-type": "application/json; charset=UTF-8",
      Foo: "Bar",
    }),
    Http.client.fetch()
  );
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClient` module is integrated with `@effect/schema`.

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Schema } from "@effect/schema";
import { Console, Effect } from "effect";

const Post = Schema.struct({
  id: Schema.number,
  title: Schema.string,
});

/*
const getPostAndValidate: Effect.Effect<{
    readonly id: number;
    readonly title: string;
}, Http.error.HttpClientError | ParseError, never>
*/
const getPostAndValidate = Http.request
  .get("https://jsonplaceholder.typicode.com/posts/1")
  .pipe(
    Http.client.fetch(),
    Effect.andThen(Http.response.schemaBodyJson(Post)),
    Effect.scoped
  );

NodeRuntime.runMain(getPostAndValidate.pipe(Effect.andThen(Console.log)));
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
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.fetch(), Http.response.text);

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)));
/*
Output:
{}
*/
```

However, if we use `Http.client.filterStatusOk`, an error is logged:

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.filterStatusOk(Http.client.fetch()), Http.response.text);

NodeRuntime.runMain(getText.pipe(Effect.andThen(Console.log)));
/*
Output:
timestamp=2024-03-25T10:21:16.972Z level=ERROR fiber=#0 cause="ResponseError: StatusCode error (404 GET https://jsonplaceholder.typicode.com/non-existing-page): non 2xx status code
*/
```

Note that you can use `Http.client.fetchOk` as a shortcut for `Http.client.filterStatusOk(Http.client.fetch())`:

```ts
const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(Http.client.fetchOk(), Http.response.text);
```

You can also create your own status-based filters. In fact, `Http.client.filterStatusOk` is just a shortcut for the following filter:

```ts
const getText = Http.request
  .get("https://jsonplaceholder.typicode.com/non-existing-page")
  .pipe(
    Http.client.filterStatus(
      Http.client.fetch(),
      (status) => status >= 200 && status < 300
    ),
    Http.response.text
  );
```

## POST

To make a POST request, you can use the `Http.request.post` function provided by the `HttpClient` module. Here's an example of how to create and send a POST request:

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.jsonBody({
      title: "foo",
      body: "bar",
      userId: 1,
    }),
    Effect.andThen(Http.client.fetch()),
    Http.response.json
  );

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)));
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

If you need to send data in a format other than JSON, such as plain text, you can use different APIs provided by `Http.request`.

In the following example, we send the data as text:

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Console, Effect } from "effect";

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.textBody(
      JSON.stringify({
        title: "foo",
        body: "bar",
        userId: 1,
      }),
      "application/json; charset=UTF-8"
    ),
    Http.client.fetch(),
    Http.response.json
  );

NodeRuntime.runMain(Effect.andThen(addPost, Console.log));
/*
Output:
{ title: 'foo', body: 'bar', userId: 1, id: 101 }
*/
```

### Decoding Data with Schemas

A common use case when fetching data is to validate the received format. For this purpose, the `HttpClient` module is integrated with `@effect/schema`.

```ts
import { NodeRuntime } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpClient";
import { Schema } from "@effect/schema";
import { Console, Effect } from "effect";

const Post = Schema.struct({
  id: Schema.number,
  title: Schema.string,
});

const addPost = Http.request
  .post("https://jsonplaceholder.typicode.com/posts")
  .pipe(
    Http.request.jsonBody({
      title: "foo",
      body: "bar",
      userId: 1,
    }),
    Effect.andThen(Http.client.fetch()),
    Effect.andThen(Http.response.schemaBodyJson(Post)),
    Effect.scoped
  );

NodeRuntime.runMain(addPost.pipe(Effect.andThen(Console.log)));
/*
Output:
{ id: 101, title: 'foo' }
*/
```
