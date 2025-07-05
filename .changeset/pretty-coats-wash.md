---
"@effect/platform-node": minor
---

Consistent naming of `ClusterShardManager` options between `Bun` and `Node`.

If you are currently using `NodeClusterShardManagerHttp`, please rename `options.protocol` to `options.transport`:

```ts
import * as NodeClusterShardManagerHttp from "@effect/platform-node/NodeClusterShardManagerHttp"

// Before:
const manager = new NodeClusterShardManagerHttp.layer({
  protocol: "http",
  // ...
});

// Before:
const manager = new NodeClusterShardManagerHttp.layer({
  transport: "http",
  // ...
});
```
