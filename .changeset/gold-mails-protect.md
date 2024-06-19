---
"@effect/platform-node-shared": minor
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform": minor
"@effect/rpc-http": minor
"@effect/rpc": minor
---

restructure platform http to use flattened modules

Instead of using the previous re-exports, you now use the modules directly.

Before:

```ts
import { HttpClient } from "@effect/platform";

HttpClient.request.get("/").pipe(HttpClient.client.fetchOk);
```

After:

```ts
import { HttpClient, HttpClientRequest } from "@effect/platform";

HttpClientRequest.get("/").pipe(HttpClient.fetchOk);
```
