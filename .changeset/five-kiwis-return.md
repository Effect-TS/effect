---
"@effect/platform": patch
---

allow passing Context to HttpApp web handlers

This allows you to pass request-scoped data to your handlers.

```ts
import { Context, Effect } from "effect"
import { HttpApp, HttpServerResponse } from "@effect/platform"

class Env extends Context.Reference<Env>()("Env", {
  defaultValue: () => ({ foo: "bar" })
}) {}

const handler = HttpApp.toWebHandler(
  Effect.gen(function* () {
    const env = yield* Env
    return yield* HttpServerResponse.json(env)
  })
)

const response = await handler(
  new Request("http://localhost:3000/"),
  Env.context({ foo: "baz" })
)

assert.deepStrictEqual(await response.json(), {
  foo: "baz"
})
```
