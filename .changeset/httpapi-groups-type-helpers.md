---
"effect": patch
---

Add `HttpApi.Groups` and `HttpApi.GroupsWithIdentifier` utility types for extracting groups from an `HttpApi`.

```ts
import type { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

type User = HttpApiEndpoint.SuccessWithIdentifier<
  HttpApiGroup.Endpoints<HttpApi.GroupsWithIdentifier<typeof Api, "users">>,
  "getUser"
>
```
