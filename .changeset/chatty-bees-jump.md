---
"@effect/platform": patch
---

add ServerResponse.html api

It uses the Template module to create html responses

Example:

```ts
import { Effect } from "effect";
import * as Http from "@effect/platform/HttpServer";

Http.response.html`<html>${Effect.succeed(123)}</html>`;
```
