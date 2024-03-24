---
"@effect/platform-node-shared": patch
"@effect/platform-browser": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform": patch
---

add Cookies module to /platform http

To add cookies to a http response:

```ts
import * as Http from "@effect/platform/HttpServer";

Http.response.empty().pipe(
  Http.response.setCookies([
    ["name", "value"],
    ["foo", "bar", { httpOnly: true }],
  ]),
);
```

You can also use cookies with the http client:

```ts
import * as Http from "@effect/platform/HttpClient";
import { Effect, Ref } from "effect";

Effect.gen(function* (_) {
  const ref = yield* _(Ref.make(Http.cookies.empty));
  const defaultClient = yield* _(Http.client.Client);
  const clientWithCookies = defaultClient.pipe(
    Http.client.withCookiesRef(ref),
    Http.client.filterStatusOk,
  );

  // cookies will be stored in the ref and sent in any subsequent requests
  yield* _(
    Http.request.get("https://www.google.com/"),
    clientWithCookies,
    Effect.scoped,
  );
});
```
