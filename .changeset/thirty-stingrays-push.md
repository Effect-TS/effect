---
"@effect/platform": patch
---

add HttpClientResponse.matchStatus\* apis

Which allows you to pattern match on the status code of a response.

```ts
HttpClientRequest.get("/todos/1").pipe(
  HttpClient.fetch,
  HttpClientResponse.matchStatusScoped({
    "2xx": (_response) => Effect.succeed("ok"),
    404: (_response) => Effect.fail("not found"),
    orElse: (_response) => Effect.fail("boom"),
  }),
);
```
