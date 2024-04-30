---
"@effect/platform": patch
---

allow http client trace propagation to be controlled

To disable trace propagation:

```ts
import { HttpClient as Http } from "@effect/platform"

Http.request
  .get("https://example.com")
  .pipe(Http.client.fetchOk, Http.client.withTracerPropagation(false))
```
