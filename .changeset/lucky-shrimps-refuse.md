---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform": minor
---

remove Scope from HttpClient requirements

Before:

```ts
import { HttpClient } from "@effect/platform"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get("https://api.github.com/users/octocat")
  return yield* response.json
}).pipe(Effect.scoped)
```

After:

```ts
import { HttpClient } from "@effect/platform"
import { Effect } from "effect"

Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const response = yield* client.get("https://api.github.com/users/octocat")
  return yield* response.json
}) // no need to add Effect.scoped
```
