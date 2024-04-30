---
"@effect/platform": patch
---

allow http client trace propagation to be controlled

To disable trace propagation:

```ts
import { HttpClient } from "@effect/platform"

HttpClient.request
  .get("https://example.com")
  .pipe(
    HttpClient.client.fetchOk,
    HttpClient.client.withTracerPropagation(false)
  )
```
