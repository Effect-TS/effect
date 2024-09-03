---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform": minor
"@effect/rpc-http": minor
---

refactor /platform HttpClient

#### HttpClient.fetch removed

The `HttpClient.fetch` client implementation has been removed. Instead, you can
access a `HttpClient` using the corresponding `Context.Tag`.

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  // make a get request
  yield* client.get("https://jsonplaceholder.typicode.com/todos/1")
}).pipe(
  Effect.scoped,
  // the fetch client has been moved to the `FetchHttpClient` module
  Effect.provide(FetchHttpClient.layer)
)
```

#### `HttpClient` interface now uses methods

Instead of being a function that returns the response, the `HttpClient`
interface now uses methods to make requests.

Some shorthand methods have been added to the `HttpClient` interface to make
less complex requests easier.

```ts
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest
} from "@effect/platform"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  // make a get request
  yield* client.get("https://jsonplaceholder.typicode.com/todos/1")
  // make a post request
  yield* client.post("https://jsonplaceholder.typicode.com/todos")

  // execute a request instance
  yield* client.execute(
    HttpClientRequest.get("https://jsonplaceholder.typicode.com/todos/1")
  )
})
```

#### Scoped `HttpClientResponse` helpers removed

The `HttpClientResponse` helpers that also eliminated the `Scope` have been removed.

Instead, you can use the `HttpClientResponse` methods directly, and explicitly
add a `Effect.scoped` to the pipeline.

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  yield* client.get("https://jsonplaceholder.typicode.com/todos/1").pipe(
    Effect.flatMap((response) => response.json),
    Effect.scoped // eliminate the `Scope`
  )
})
```

#### Some apis have been renamed

Including the `HttpClientRequest` body apis, which is to make them more
discoverable.
