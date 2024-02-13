---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform": minor
---

add Scope to Http client

This change adds a scope to the default http client, ensuring connections are
cleaned up if you abort the request at any point.

Some response helpers have been added to reduce the noise.

```ts
import * as Http from "@effect/platform/HttpClient";
import { Effect } from "effect";

// instead of
Http.request.get("/").pipe(
  Http.client.fetchOk(),
  Effect.flatMap((_) => _.json),
  Effect.scoped
);

// you can do
Http.request.get("/").pipe(Http.client.fetchOk(), Http.response.json);

// other helpers include
Http.response.text;
Http.response.stream;
Http.response.arrayBuffer;
Http.response.urlParamsBody;
Http.response.formData;
Http.response.schema * Effect;
```
