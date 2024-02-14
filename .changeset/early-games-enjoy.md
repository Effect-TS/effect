---
"effect": patch
---

add RequestResolver.aroundRequests api

This can be used to run side effects that introspect the requests being
executed.

Example:

```ts
import { Effect, Request, RequestResolver } from "effect";

interface GetUserById extends Request.Request<unknown> {
  readonly id: number;
}

declare const resolver: RequestResolver.RequestResolver<GetUserById>;

RequestResolver.aroundRequests(
  resolver,
  (requests) => Effect.log(`got ${requests.length} requests`),
  (requests, _) => Effect.log(`finised running ${requests.length} requests`),
);
```
