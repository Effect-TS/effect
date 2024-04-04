---
"@effect/platform": minor
"@effect/rpc-http": minor
---

move fetch options to a FiberRef

This change makes adjusting options to fetch more composable. You can now do:

```ts
import { pipe } from "effect";
import * as Http from "@effect/platform/HttpClient";

pipe(
  Http.request.get("https://example.com"),
  Http.client.fetchOk,
  Http.client.withFetchOptions({ credentials: "include" }),
  Http.response.text
);
```
