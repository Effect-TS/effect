---
"@effect/platform-node": patch
---

Make the `redis` peer dependency optional and remove `NodeRedis` from the root `@effect/platform-node` export, so the package entry point loads, type-checks and bundles without `redis` installed.

Import `NodeRedis` from its subpath instead:

```ts
// before
import { NodeRedis } from "@effect/platform-node"

// after
import * as NodeRedis from "@effect/platform-node/NodeRedis"
```
