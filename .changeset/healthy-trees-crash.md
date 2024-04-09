---
"@effect/platform": patch
---

add Http.middleware.withTracerDisabledForUrls

Allows you to disable the http server tracer for the given urls:

```ts
import * as Http from "@effect/platform/HttpServer";

Http.router.empty.pipe(
  Http.router.get("/health"),
  Http.server.serve(),
  Http.middleware.withTracerDisabledForUrls(["/health"])
);
```
