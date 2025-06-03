---
"@effect/cluster": minor
---

add shard groups, to allow entities to target specific runners

If you need to migrate an existing cluster, you can run the following PostgreSQL queries:

```sql
ALTER TABLE cluster_messages
  ALTER COLUMN shard_id TYPE VARCHAR(50) USING format('default:%s', shard_id);

ALTER TABLE cluster_shards
  ALTER COLUMN shard_id TYPE VARCHAR(50) USING format('default:%s', shard_id);

ALTER TABLE cluster_locks
  ALTER COLUMN shard_id TYPE VARCHAR(50) USING format('default:%s', shard_id);
```

To use shard groups, you can add a `ShardGroup` annotation when creating an
entity. You can then assign shard groups to specific runners in your layer
setup:

```typescript
import { ClusterSchema, Entity } from "@effect/cluster"
import {
  NodeClusterRunnerSocket,
  NodeClusterShardManagerSocket
} from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { Schema } from "effect"

const Counter = Entity.make("Counter", [
  Rpc.make("Increment", {
    payload: { id: Schema.String, amount: Schema.Number },
    primaryKey: ({ id }) => id,
    success: Schema.Number
  })
])
  .annotate(ClusterSchema.ShardGroup, (_entityId) => "someGroupName")
  .annotateRpcs(ClusterSchema.Persisted, true)

// Assign the shard group to a specific runner in your layer setup.
//
// Make sure to include the "default" shard group, if you want to run entities
// without a specific group.
//
NodeClusterRunnerSocket.layer({
  shardingConfig: {
    shardGroups: ["default", "someGroupName"]
  }
})
```
