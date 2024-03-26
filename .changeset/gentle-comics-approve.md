---
"@effect/platform-node": patch
"@effect/platform": patch
---

make /platform ClientRequest implement Effect

ClientRequest now implements `Effect<ClientResponse, HttpClientError, Client.Default | Scope>`

This makes it easier to quickly create a request and execute it in a single line.

```ts
import * as Http from "@effect/platform/HttpClient";

Http.request
  .get("https://jsonplaceholder.typicode.com/todos/1")
  .pipe(Http.response.json);
```
