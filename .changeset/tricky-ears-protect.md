---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform": minor
---

add HttpClient accessor apis

These apis allow you to easily send requests without first accessing the `HttpClient` service.

Below is an example of using the `get` accessor api to send a GET request:

```ts
import { FetchHttpClient, HttpClient } from "@effect/platform"
import { Effect } from "effect"

const program = HttpClient.get(
  "https://jsonplaceholder.typicode.com/posts/1"
).pipe(
  Effect.andThen((response) => response.json),
  Effect.scoped,
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
