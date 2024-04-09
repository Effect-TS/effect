---
"@effect/platform": minor
---

make Http.middleware.withTracerDisabledWhen a Layer api

And add Http.middleware.withTracerDisabledWhenEffect to operate on Effect's.

Usage is now:

```ts
import * as Http from "@effect/platform/HttpServer";

Http.router.empty.pipe(
  Http.router.get("/health"),
  Http.server.serve(),
  Http.middleware.withTracerDisabledWhen(
    (request) => request.url === "/no-tracing",
  ),
);
```
