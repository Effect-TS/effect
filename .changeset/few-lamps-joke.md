---
"@effect/platform": minor
---

move http search params apis to ServerRequest module

If you want to access the search params for a request, you can now use the `Http.request.ParsedSearchParams` tag.

```ts
import * as Http from "@effect/platform/HttpServer"
import { Effect } from "effect"

Effect.gen(function* () {
  const searchParams = yield* Http.request.ParsedSearchParams
  console.log(searchParams)
})
```

The schema method has also been moved to the `ServerRequest` module. It is now available as `Http.request.schemaSearchParams`.
