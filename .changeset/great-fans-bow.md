---
"@effect/platform": minor
---

replace HttpApi.empty with HttpApi.make(identifier)

This ensures if you have multiple HttpApi instances, the HttpApiGroup's are
implemented correctly.

```ts
import { HttpApi } from "@effect/platform"

// Before
class Api extends HttpApi.empty.add(...) {}

// After
class Api extends HttpApi.make("api").add(...) {}
```
