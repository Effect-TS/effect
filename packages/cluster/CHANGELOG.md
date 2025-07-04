# @effect/cluster

## 0.41.11

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/rpc@0.64.8
  - @effect/sql@0.40.8
  - @effect/workflow@0.4.8

## 0.41.10

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/platform@0.87.6
  - @effect/rpc@0.64.7
  - @effect/sql@0.40.7
  - @effect/workflow@0.4.7

## 0.41.9

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.40.6

## 0.41.8

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/rpc@0.64.6
  - @effect/sql@0.40.5
  - @effect/workflow@0.4.6

## 0.41.7

### Patch Changes

- [#5140](https://github.com/Effect-TS/effect/pull/5140) [`b01d2e0`](https://github.com/Effect-TS/effect/commit/b01d2e0d591418e10e9e362698205d848e97a9b7) Thanks @tim-smart! - remove dynamic cluster metrics that could cause memory leaks

## 0.41.6

### Patch Changes

- [#5139](https://github.com/Effect-TS/effect/pull/5139) [`7fdc16b`](https://github.com/Effect-TS/effect/commit/7fdc16bd88b872f5918384e4acda3731aab018da) Thanks @tim-smart! - only register new runners if they are not present in the ShardManager state

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4
  - @effect/rpc@0.64.5
  - @effect/sql@0.40.4
  - @effect/workflow@0.4.5

## 0.41.5

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e), [`46c3216`](https://github.com/Effect-TS/effect/commit/46c321657d93393506278327418e36f8e7a77f86)]:
  - @effect/platform@0.87.3
  - @effect/sql@0.40.3
  - @effect/rpc@0.64.4
  - @effect/workflow@0.4.4

## 0.41.4

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/rpc@0.64.3
  - @effect/sql@0.40.2
  - @effect/workflow@0.4.3

## 0.41.3

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/platform@0.87.1
  - @effect/rpc@0.64.2
  - @effect/sql@0.40.1
  - @effect/workflow@0.4.2

## 0.41.2

### Patch Changes

- Updated dependencies [[`112a93a`](https://github.com/Effect-TS/effect/commit/112a93a9bab73e95e79f7b3502d1a7b1acd668fc)]:
  - @effect/rpc@0.64.1
  - @effect/workflow@0.4.1

## 0.41.1

### Patch Changes

- [#5091](https://github.com/Effect-TS/effect/pull/5091) [`d5fd2c1`](https://github.com/Effect-TS/effect/commit/d5fd2c1526f06228853ed8317d9688c4af5f285a) Thanks @tim-smart! - fix unwrapping of DurableDeferred results

- [#5089](https://github.com/Effect-TS/effect/pull/5089) [`9d189d7`](https://github.com/Effect-TS/effect/commit/9d189d744aa3307e055094c66f580453d95ff99d) Thanks @tim-smart! - propagate fiber refs to workflow activities

## 0.41.0

### Minor Changes

- [#5086](https://github.com/Effect-TS/effect/pull/5086) [`867919c`](https://github.com/Effect-TS/effect/commit/867919c8be9a2f770699c0db852a3f566017ffd6) Thanks @tim-smart! - add Type generic to cluster entities

### Patch Changes

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba)]:
  - @effect/rpc@0.64.0
  - @effect/platform@0.87.0
  - @effect/workflow@0.4.0
  - @effect/sql@0.40.0

## 0.40.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0
  - @effect/rpc@0.63.0
  - @effect/sql@0.39.0
  - @effect/workflow@0.3.0

## 0.39.5

### Patch Changes

- [#5070](https://github.com/Effect-TS/effect/pull/5070) [`ff90206`](https://github.com/Effect-TS/effect/commit/ff90206fc56f5c1eb1675603652462a83a27421d) Thanks @tim-smart! - use FIFO queue for shard assignment, to reduce churn

## 0.39.4

### Patch Changes

- Updated dependencies [[`a8d99b2`](https://github.com/Effect-TS/effect/commit/a8d99b2ec2f55d9aa6e7d00a5138e80380716877)]:
  - @effect/rpc@0.62.4
  - @effect/workflow@0.2.4

## 0.39.3

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2
  - @effect/rpc@0.62.3
  - @effect/sql@0.38.2
  - @effect/workflow@0.2.3

## 0.39.2

### Patch Changes

- Updated dependencies [[`ddfd1e4`](https://github.com/Effect-TS/effect/commit/ddfd1e43db60e3b779d18a221344423c5f3c7416)]:
  - @effect/rpc@0.62.2
  - @effect/workflow@0.2.2

## 0.39.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/platform@0.85.1
  - @effect/rpc@0.62.1
  - @effect/sql@0.38.1
  - @effect/workflow@0.2.1

## 0.39.0

### Patch Changes

- [#5044](https://github.com/Effect-TS/effect/pull/5044) [`b7cc5c7`](https://github.com/Effect-TS/effect/commit/b7cc5c7b6b012f1c90458ce8d83ae287ea58a3d1) Thanks @tim-smart! - simplify and increase rebalance rate for ShardManager

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0
  - @effect/rpc@0.62.0
  - @effect/sql@0.38.0
  - @effect/workflow@0.2.0

## 0.38.16

### Patch Changes

- [#5036](https://github.com/Effect-TS/effect/pull/5036) [`cbac1ac`](https://github.com/Effect-TS/effect/commit/cbac1ac61a4e15ad15828563b39eef412bcee66e) Thanks @tim-smart! - add .of helpers to RpcGroup, Entity and AiToolkit

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294), [`cbac1ac`](https://github.com/Effect-TS/effect/commit/cbac1ac61a4e15ad15828563b39eef412bcee66e)]:
  - effect@3.16.7
  - @effect/rpc@0.61.15
  - @effect/platform@0.84.11
  - @effect/sql@0.37.12
  - @effect/workflow@0.1.14

## 0.38.15

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/platform@0.84.10
  - @effect/rpc@0.61.14
  - @effect/sql@0.37.11
  - @effect/workflow@0.1.13

## 0.38.14

### Patch Changes

- Updated dependencies [[`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126), [`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126)]:
  - @effect/rpc@0.61.13
  - @effect/workflow@0.1.12

## 0.38.13

### Patch Changes

- Updated dependencies [[`e0d3d42`](https://github.com/Effect-TS/effect/commit/e0d3d424d8f4e6a8ada017160406991f02b3c068)]:
  - @effect/rpc@0.61.12
  - @effect/workflow@0.1.11

## 0.38.12

### Patch Changes

- [#4750](https://github.com/Effect-TS/effect/pull/4750) [`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53) Thanks @tim-smart! - add disableFatalDefects option to cluster entities

- Updated dependencies [[`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53), [`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53)]:
  - @effect/rpc@0.61.11
  - @effect/workflow@0.1.10

## 0.38.11

### Patch Changes

- [#5017](https://github.com/Effect-TS/effect/pull/5017) [`cc283b9`](https://github.com/Effect-TS/effect/commit/cc283b968235da3caf6c3e3a09b525fe09618fee) Thanks @tim-smart! - add more spans to ClusterWorkflowEngine

- Updated dependencies [[`d350176`](https://github.com/Effect-TS/effect/commit/d3501768d42d7ff3ebc2d414c95cc1fcce15894a)]:
  - @effect/workflow@0.1.9

## 0.38.10

### Patch Changes

- [#5016](https://github.com/Effect-TS/effect/pull/5016) [`6e2e886`](https://github.com/Effect-TS/effect/commit/6e2e886f060c4ac057926b68d2e441c279480c30) Thanks @tim-smart! - fix ShardManager metrics

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/platform@0.84.9
  - @effect/rpc@0.61.10
  - @effect/sql@0.37.10
  - @effect/workflow@0.1.8

## 0.38.9

### Patch Changes

- Updated dependencies [[`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2), [`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2)]:
  - @effect/rpc@0.61.9
  - @effect/workflow@0.1.7

## 0.38.8

### Patch Changes

- Updated dependencies [[`2a9a0ef`](https://github.com/Effect-TS/effect/commit/2a9a0ef1181a4419e239edb2abfd95f359a4b7f7)]:
  - @effect/workflow@0.1.6

## 0.38.7

### Patch Changes

- [#4999](https://github.com/Effect-TS/effect/pull/4999) [`22166f8`](https://github.com/Effect-TS/effect/commit/22166f80c677cad6b4719e0e0253a9d06f964626) Thanks @tim-smart! - make registerEntity a no-op on clientOnly cluster

## 0.38.6

### Patch Changes

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8
  - @effect/rpc@0.61.8
  - @effect/sql@0.37.9
  - @effect/workflow@0.1.5

## 0.38.5

### Patch Changes

- Updated dependencies [[`34333ab`](https://github.com/Effect-TS/effect/commit/34333ab08de42a5269ddb13f66de1536ad6f249f), [`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28), [`34333ab`](https://github.com/Effect-TS/effect/commit/34333ab08de42a5269ddb13f66de1536ad6f249f)]:
  - @effect/workflow@0.1.4
  - effect@3.16.4
  - @effect/platform@0.84.7
  - @effect/rpc@0.61.7
  - @effect/sql@0.37.8

## 0.38.4

### Patch Changes

- [#4984](https://github.com/Effect-TS/effect/pull/4984) [`7e59d0e`](https://github.com/Effect-TS/effect/commit/7e59d0e2e004d86b8d0778e99c6fcd173fcb682a) Thanks @tim-smart! - expose Sharding.pollStorage api

## 0.38.3

### Patch Changes

- [#4983](https://github.com/Effect-TS/effect/pull/4983) [`59575c5`](https://github.com/Effect-TS/effect/commit/59575c5bf17a32c8b76c42e3794222b20e766581) Thanks @tim-smart! - do not resume already running workflows

- Updated dependencies []:
  - @effect/sql@0.37.7

## 0.38.2

### Patch Changes

- [#4977](https://github.com/Effect-TS/effect/pull/4977) [`d244b63`](https://github.com/Effect-TS/effect/commit/d244b6345ea1d2ac88812562b0c170683913d502) Thanks @tim-smart! - add EntityProxy & EntityProxyServer, for deriving Rpc & HttpApi servers from cluster entities

- Updated dependencies [[`d244b63`](https://github.com/Effect-TS/effect/commit/d244b6345ea1d2ac88812562b0c170683913d502), [`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/workflow@0.1.3
  - @effect/platform@0.84.6
  - @effect/rpc@0.61.6
  - @effect/sql@0.37.6

## 0.38.1

### Patch Changes

- [#4973](https://github.com/Effect-TS/effect/pull/4973) [`612c739`](https://github.com/Effect-TS/effect/commit/612c73979abc44825feae573c8902b6484923aaa) Thanks @tim-smart! - ignore runners that cannot be parsed

## 0.38.0

### Minor Changes

- [#4969](https://github.com/Effect-TS/effect/pull/4969) [`3086405`](https://github.com/Effect-TS/effect/commit/308640563041004d790f08d2ba75cc3a85fdf752) Thanks @tim-smart! - add shard groups, to allow entities to target specific runners

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

### Patch Changes

- [#4972](https://github.com/Effect-TS/effect/pull/4972) [`d0067ca`](https://github.com/Effect-TS/effect/commit/d0067caef053b2855d93dcef59ea585d0fad9d8c) Thanks @tim-smart! - optimize for requests with a WithExit reply

- [#4966](https://github.com/Effect-TS/effect/pull/4966) [`8c79abe`](https://github.com/Effect-TS/effect/commit/8c79abeb47d070d8880b652d31626497d3005a4e) Thanks @tim-smart! - add ClusterCron module

- Updated dependencies [[`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a), [`71e1e6c`](https://github.com/Effect-TS/effect/commit/71e1e6c535c11a3ec498540a3af3c1a313a5319b)]:
  - @effect/platform@0.84.5
  - @effect/rpc@0.61.5
  - @effect/sql@0.37.5

## 0.37.2

### Patch Changes

- [#4958](https://github.com/Effect-TS/effect/pull/4958) [`6dfbae9`](https://github.com/Effect-TS/effect/commit/6dfbae946ea12ecee7234f5785335f3e7f8335b4) Thanks @tim-smart! - ensure Workflow.interrupt triggers compensation

- Updated dependencies [[`b8aec45`](https://github.com/Effect-TS/effect/commit/b8aec45288834c499caeb3478a634ea5043fd611), [`b8aec45`](https://github.com/Effect-TS/effect/commit/b8aec45288834c499caeb3478a634ea5043fd611)]:
  - @effect/workflow@0.1.2

## 0.37.1

### Patch Changes

- Updated dependencies [[`fd60c73`](https://github.com/Effect-TS/effect/commit/fd60c73ea6d51c9b83279da60e7b6d605698b1d8)]:
  - @effect/workflow@0.1.1

## 0.37.0

### Patch Changes

- [#4945](https://github.com/Effect-TS/effect/pull/4945) [`a116aea`](https://github.com/Effect-TS/effect/commit/a116aeade97c83d8c96f17cdc5cf3b5a0bd9be74) Thanks @tim-smart! - add @effect/workflow package

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f), [`a116aea`](https://github.com/Effect-TS/effect/commit/a116aeade97c83d8c96f17cdc5cf3b5a0bd9be74), [`a116aea`](https://github.com/Effect-TS/effect/commit/a116aeade97c83d8c96f17cdc5cf3b5a0bd9be74)]:
  - effect@3.16.3
  - @effect/rpc@0.61.4
  - @effect/workflow@0.1.0
  - @effect/platform@0.84.4
  - @effect/sql@0.37.4

## 0.36.3

### Patch Changes

- Updated dependencies [[`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e)]:
  - @effect/platform@0.84.3
  - @effect/rpc@0.61.3
  - @effect/sql@0.37.3

## 0.36.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897), [`a77afb1`](https://github.com/Effect-TS/effect/commit/a77afb1f7191a57a68b09fcdee5e9f27a0682b0a)]:
  - effect@3.16.2
  - @effect/rpc@0.61.2
  - @effect/platform@0.84.2
  - @effect/sql@0.37.2

## 0.36.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - @effect/platform@0.84.1
  - effect@3.16.1
  - @effect/rpc@0.61.1
  - @effect/sql@0.37.1

## 0.36.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/platform@0.84.0
  - @effect/rpc@0.61.0
  - @effect/sql@0.37.0

## 0.35.0

### Patch Changes

- Updated dependencies [[`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd), [`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - @effect/platform@0.83.0
  - effect@3.15.5
  - @effect/rpc@0.60.0
  - @effect/sql@0.36.0

## 0.34.5

### Patch Changes

- [#4929](https://github.com/Effect-TS/effect/pull/4929) [`58c5fd3`](https://github.com/Effect-TS/effect/commit/58c5fd3dd30eceb6c8afea90406768b0e348f48f) Thanks @tim-smart! - disable tracing for internal sql queries

- Updated dependencies [[`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524)]:
  - @effect/platform@0.82.8
  - @effect/rpc@0.59.9
  - @effect/sql@0.35.8

## 0.34.4

### Patch Changes

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561), [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6), [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2)]:
  - effect@3.15.4
  - @effect/platform@0.82.7
  - @effect/rpc@0.59.8
  - @effect/sql@0.35.7

## 0.34.3

### Patch Changes

- Updated dependencies [[`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36)]:
  - @effect/platform@0.82.6
  - @effect/rpc@0.59.7
  - @effect/sql@0.35.6

## 0.34.2

### Patch Changes

- Updated dependencies [[`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a), [`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a), [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7)]:
  - @effect/platform@0.82.5
  - effect@3.15.3
  - @effect/rpc@0.59.6
  - @effect/sql@0.35.5

## 0.34.1

### Patch Changes

- [#4906](https://github.com/Effect-TS/effect/pull/4906) [`1627a02`](https://github.com/Effect-TS/effect/commit/1627a0299a07c3538ca15293f1ac3ffa7eeb45f3) Thanks @tim-smart! - add Entity.makeTestClient, for testing entity handlers

- Updated dependencies [[`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225), [`89657ac`](https://github.com/Effect-TS/effect/commit/89657ac2fbda9ba38ac2962ce96949e536a464f9), [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087)]:
  - @effect/platform@0.82.4
  - @effect/sql@0.35.4
  - @effect/rpc@0.59.5

## 0.34.0

### Minor Changes

- [#4883](https://github.com/Effect-TS/effect/pull/4883) [`eaf8405`](https://github.com/Effect-TS/effect/commit/eaf8405ab9bb52423050eb0d23dd7d3c21c18141) Thanks @tim-smart! - add EntityNotAssignedToRunner error

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961), [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328)]:
  - effect@3.15.2
  - @effect/platform@0.82.3
  - @effect/rpc@0.59.4
  - @effect/sql@0.35.3

## 0.33.3

### Patch Changes

- Updated dependencies [[`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc)]:
  - @effect/platform@0.82.2
  - @effect/rpc@0.59.3
  - @effect/sql@0.35.2

## 0.33.2

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/platform@0.82.1
  - @effect/rpc@0.59.2
  - @effect/sql@0.35.1

## 0.33.1

### Patch Changes

- Updated dependencies [[`6495440`](https://github.com/Effect-TS/effect/commit/64954405eb57313722023b87c0d92761980e2713)]:
  - @effect/rpc@0.59.1

## 0.33.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/platform@0.82.0
  - @effect/rpc@0.59.0
  - @effect/sql@0.35.0

## 0.32.0

### Patch Changes

- Updated dependencies [[`cd6cd0e`](https://github.com/Effect-TS/effect/commit/cd6cd0eacd6b09d6dd48b30b32edeb4a3c3075f9)]:
  - @effect/rpc@0.58.0

## 0.31.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/platform@0.81.1
  - @effect/rpc@0.57.1
  - @effect/sql@0.34.1

## 0.31.0

### Patch Changes

- Updated dependencies [[`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8)]:
  - @effect/platform@0.81.0
  - @effect/rpc@0.57.0
  - @effect/sql@0.34.0

## 0.30.11

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/platform@0.80.21
  - @effect/rpc@0.56.9
  - @effect/sql@0.33.21

## 0.30.10

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/platform@0.80.20
  - @effect/rpc@0.56.8
  - @effect/sql@0.33.20

## 0.30.9

### Patch Changes

- [#4829](https://github.com/Effect-TS/effect/pull/4829) [`2d55bc5`](https://github.com/Effect-TS/effect/commit/2d55bc52c596afd8381f8ad1badc69efa0be8a78) Thanks @tim-smart! - sending persisted messages without MessageStorage is now a defect

## 0.30.8

### Patch Changes

- [#4825](https://github.com/Effect-TS/effect/pull/4825) [`1b30f61`](https://github.com/Effect-TS/effect/commit/1b30f616e75580933284657cb2cefab5a7903323) Thanks @tim-smart! - ensure clientOnly mode without storage falls back to network messaging

## 0.30.7

### Patch Changes

- [#4823](https://github.com/Effect-TS/effect/pull/4823) [`146af39`](https://github.com/Effect-TS/effect/commit/146af39d8d3b4e82aceb13de9749e6c4120c580b) Thanks @tim-smart! - fix sqlite SqlMessagetStorage.repliesFor

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19
  - @effect/platform@0.80.19
  - @effect/rpc@0.56.7
  - @effect/sql@0.33.19

## 0.30.6

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/platform@0.80.18
  - @effect/rpc@0.56.6
  - @effect/sql@0.33.18

## 0.30.5

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/platform@0.80.17
  - @effect/rpc@0.56.5
  - @effect/sql@0.33.17

## 0.30.4

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495), [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a)]:
  - effect@3.14.16
  - @effect/platform@0.80.16
  - @effect/rpc@0.56.4
  - @effect/sql@0.33.16

## 0.30.3

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/platform@0.80.15
  - @effect/rpc@0.56.3
  - @effect/sql@0.33.15

## 0.30.2

### Patch Changes

- [#4779](https://github.com/Effect-TS/effect/pull/4779) [`664293f`](https://github.com/Effect-TS/effect/commit/664293f975a282920a7208e966adaf4634c42ef4) Thanks @fubhy! - Fix `FiberRef` module import

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14
  - @effect/platform@0.80.14
  - @effect/rpc@0.56.2
  - @effect/sql@0.33.14

## 0.30.1

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/platform@0.80.13
  - @effect/rpc@0.56.1
  - @effect/sql@0.33.13

## 0.30.0

### Patch Changes

- Updated dependencies [[`d6e1156`](https://github.com/Effect-TS/effect/commit/d6e115617fc1a26a846b55f407965a330145dbee), [`2c66c16`](https://github.com/Effect-TS/effect/commit/2c66c16375dc2fe128f7b4e78c5f5c27c25c0d19)]:
  - @effect/rpc@0.56.0

## 0.29.22

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/platform@0.80.12
  - @effect/rpc@0.55.17
  - @effect/sql@0.33.12

## 0.29.21

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b), [`b5ad11e`](https://github.com/Effect-TS/effect/commit/b5ad11e511424c6d5c32e34e7ee9d04f0110617d)]:
  - effect@3.14.11
  - @effect/rpc@0.55.16
  - @effect/platform@0.80.11
  - @effect/sql@0.33.11

## 0.29.20

### Patch Changes

- Updated dependencies [[`d3df84e`](https://github.com/Effect-TS/effect/commit/d3df84e8af8e00a297e2329faeae625de0a95a71)]:
  - @effect/rpc@0.55.15

## 0.29.19

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/platform@0.80.10
  - @effect/rpc@0.55.14
  - @effect/sql@0.33.10

## 0.29.18

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/platform@0.80.9
  - @effect/rpc@0.55.13
  - @effect/sql@0.33.9

## 0.29.17

### Patch Changes

- Updated dependencies [[`58eaca9`](https://github.com/Effect-TS/effect/commit/58eaca9ef14032fc310f4a0e3c09513bac1cb50a)]:
  - @effect/rpc@0.55.12

## 0.29.16

### Patch Changes

- [#4719](https://github.com/Effect-TS/effect/pull/4719) [`a79b732`](https://github.com/Effect-TS/effect/commit/a79b732bddea8bfca091c4fed0dd87aa0b1ab1f0) Thanks @tim-smart! - expire shard locks after 15 seconds

- [#4719](https://github.com/Effect-TS/effect/pull/4719) [`a79b732`](https://github.com/Effect-TS/effect/commit/a79b732bddea8bfca091c4fed0dd87aa0b1ab1f0) Thanks @tim-smart! - ensure more persisted messages are eligible for the fast path

## 0.29.15

### Patch Changes

- [#4714](https://github.com/Effect-TS/effect/pull/4714) [`6966708`](https://github.com/Effect-TS/effect/commit/6966708a3061a3eb4bcfcb4d5877657fb41a019a) Thanks @tim-smart! - reset shard last_read on acquistion

## 0.29.14

### Patch Changes

- [#4712](https://github.com/Effect-TS/effect/pull/4712) [`da21953`](https://github.com/Effect-TS/effect/commit/da21953a3831bf5974ab6add8fcc7fad1c0ba472) Thanks @tim-smart! - attempt to use network for persisted messages where possible

## 0.29.13

### Patch Changes

- [#4710](https://github.com/Effect-TS/effect/pull/4710) [`896fbbf`](https://github.com/Effect-TS/effect/commit/896fbbf6ed6c11e099747e8aafb67b28edc4e466) Thanks @tim-smart! - tighten cluster health checks to improve worst case recovery time

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8
  - @effect/platform@0.80.8
  - @effect/rpc@0.55.11
  - @effect/sql@0.33.8

## 0.29.12

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7
  - @effect/platform@0.80.7
  - @effect/rpc@0.55.10
  - @effect/sql@0.33.7

## 0.29.11

### Patch Changes

- Updated dependencies [[`a1d4673`](https://github.com/Effect-TS/effect/commit/a1d4673a423dfed050c0a762664d9d64002cfa90)]:
  - @effect/rpc@0.55.9

## 0.29.10

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6
  - @effect/platform@0.80.6
  - @effect/rpc@0.55.8
  - @effect/sql@0.33.6

## 0.29.9

### Patch Changes

- Updated dependencies [[`4414042`](https://github.com/Effect-TS/effect/commit/44140423a2fb185f92f7db4d5b383f9b62a97bf9)]:
  - @effect/rpc@0.55.7

## 0.29.8

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`85fba81`](https://github.com/Effect-TS/effect/commit/85fba815ac07eb13d4227a69ac76a18e4b94df18), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5
  - @effect/platform@0.80.5
  - @effect/rpc@0.55.6
  - @effect/sql@0.33.5

## 0.29.7

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef), [`e3e5873`](https://github.com/Effect-TS/effect/commit/e3e5873f30080bb0e5eed8a876170acaa6ed47ff), [`26c060c`](https://github.com/Effect-TS/effect/commit/26c060c65914a623220a20356991784f974bfe18)]:
  - effect@3.14.4
  - @effect/rpc@0.55.5
  - @effect/platform@0.80.4
  - @effect/sql@0.33.4

## 0.29.6

### Patch Changes

- [#4670](https://github.com/Effect-TS/effect/pull/4670) [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6) Thanks @tim-smart! - fix Data.TaggedEnum with generics regression

- Updated dependencies [[`0ec5e03`](https://github.com/Effect-TS/effect/commit/0ec5e0353a1db5d27c3500deba0df61001258e76), [`05c4d77`](https://github.com/Effect-TS/effect/commit/05c4d772acc42b7425add7b22f914c5ee3ff84bd), [`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - @effect/rpc@0.55.4
  - effect@3.14.3
  - @effect/platform@0.80.3
  - @effect/sql@0.33.3

## 0.29.5

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2
  - @effect/platform@0.80.2
  - @effect/rpc@0.55.3
  - @effect/sql@0.33.2

## 0.29.4

### Patch Changes

- Updated dependencies [[`d2f11e5`](https://github.com/Effect-TS/effect/commit/d2f11e557de4639762124951252170fbf4d7c906)]:
  - @effect/rpc@0.55.2

## 0.29.3

### Patch Changes

- [#4637](https://github.com/Effect-TS/effect/pull/4637) [`18a7936`](https://github.com/Effect-TS/effect/commit/18a7936832158daa69e3c09a6caae55e3d6c0b86) Thanks @tim-smart! - fix clientOnly mode for SocketRunner

## 0.29.2

### Patch Changes

- [#4626](https://github.com/Effect-TS/effect/pull/4626) [`3a99a2d`](https://github.com/Effect-TS/effect/commit/3a99a2dbaa38348c1f6e210a531fcfb99b5e73c5) Thanks @tim-smart! - add Sharding.activeEntityCount

## 0.29.1

### Patch Changes

- [#4621](https://github.com/Effect-TS/effect/pull/4621) [`814733f`](https://github.com/Effect-TS/effect/commit/814733fe62bb3dc91c6cd632d16a8d2076b3755b) Thanks @tim-smart! - remove Sharding.make export

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1
  - @effect/platform@0.80.1
  - @effect/rpc@0.55.1
  - @effect/sql@0.33.1

## 0.29.0

### Minor Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c) Thanks @tim-smart! - refactor of @effect/cluster packages

### Patch Changes

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0
  - @effect/platform@0.80.0
  - @effect/rpc@0.55.0
  - @effect/sql@0.33.0

## 0.28.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.32.4

## 0.28.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12
  - @effect/sql@0.32.3

## 0.28.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11
  - @effect/sql@0.32.2

## 0.28.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10
  - @effect/sql@0.32.1

## 0.28.0

### Patch Changes

- Updated dependencies [[`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - effect@3.13.9
  - @effect/sql@0.32.0

## 0.27.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8
  - @effect/sql@0.31.1

## 0.27.0

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.31.0

## 0.26.7

### Patch Changes

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64)]:
  - effect@3.13.7
  - @effect/sql@0.30.7

## 0.26.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6
  - @effect/sql@0.30.6

## 0.26.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5
  - @effect/sql@0.30.5

## 0.26.4

### Patch Changes

- Updated dependencies [[`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - effect@3.13.4
  - @effect/sql@0.30.4

## 0.26.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3
  - @effect/sql@0.30.3

## 0.26.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/sql@0.30.2

## 0.26.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1
  - @effect/sql@0.30.1

## 0.26.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0
  - @effect/sql@0.30.0

## 0.25.1

### Patch Changes

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12
  - @effect/sql@0.29.1

## 0.25.0

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e)]:
  - effect@3.12.11
  - @effect/sql@0.29.0

## 0.24.4

### Patch Changes

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10
  - @effect/sql@0.28.4

## 0.24.3

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9
  - @effect/sql@0.28.3

## 0.24.2

### Patch Changes

- Updated dependencies [[`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - effect@3.12.8
  - @effect/sql@0.28.2

## 0.24.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7
  - @effect/sql@0.28.1

## 0.24.0

### Patch Changes

- Updated dependencies [[`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - effect@3.12.6
  - @effect/sql@0.28.0

## 0.23.0

### Patch Changes

- Updated dependencies [[`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b)]:
  - @effect/sql@0.27.0
  - effect@3.12.5

## 0.22.1

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718)]:
  - effect@3.12.4
  - @effect/sql@0.26.1

## 0.22.0

### Patch Changes

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5)]:
  - effect@3.12.3
  - @effect/sql@0.26.0

## 0.21.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2
  - @effect/sql@0.25.2

## 0.21.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1
  - @effect/sql@0.25.1

## 0.21.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0
  - @effect/sql@0.25.0

## 0.20.3

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10
  - @effect/sql@0.24.3

## 0.20.2

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9
  - @effect/sql@0.24.2

## 0.20.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.24.1

## 0.20.0

### Patch Changes

- Updated dependencies [[`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - effect@3.11.8
  - @effect/sql@0.24.0

## 0.19.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.23.3

## 0.19.2

### Patch Changes

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7
  - @effect/sql@0.23.2

## 0.19.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.23.1

## 0.19.0

### Patch Changes

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6
  - @effect/sql@0.23.0

## 0.18.7

### Patch Changes

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5
  - @effect/sql@0.22.7

## 0.18.6

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.22.6

## 0.18.5

### Patch Changes

- Updated dependencies [[`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - effect@3.11.4
  - @effect/sql@0.22.5

## 0.18.4

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3
  - @effect/sql@0.22.4

## 0.18.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.22.3

## 0.18.2

### Patch Changes

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41)]:
  - effect@3.11.2
  - @effect/sql@0.22.2

## 0.18.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1
  - @effect/sql@0.22.1

## 0.18.0

### Patch Changes

- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0
  - @effect/sql@0.22.0

## 0.17.4

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20
  - @effect/sql@0.21.4

## 0.17.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.21.3

## 0.17.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.21.2

## 0.17.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.21.1

## 0.17.0

### Patch Changes

- Updated dependencies [[`e9dfea3`](https://github.com/Effect-TS/effect/commit/e9dfea3f394444ebd8929e5cfe05ce740cf84d6e), [`1b1ba09`](https://github.com/Effect-TS/effect/commit/1b1ba099bca49ff48ffe931cc1b607314a5eaafa)]:
  - @effect/sql@0.21.0

## 0.16.12

### Patch Changes

- Updated dependencies [[`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7)]:
  - effect@3.10.19
  - @effect/sql@0.20.12

## 0.16.11

### Patch Changes

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de)]:
  - effect@3.10.18
  - @effect/sql@0.20.11

## 0.16.10

### Patch Changes

- Updated dependencies [[`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - effect@3.10.17
  - @effect/sql@0.20.10

## 0.16.9

### Patch Changes

- Updated dependencies [[`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232)]:
  - effect@3.10.16
  - @effect/sql@0.20.9

## 0.16.8

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.20.8

## 0.16.7

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.20.7

## 0.16.6

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15
  - @effect/sql@0.20.6

## 0.16.5

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14
  - @effect/sql@0.20.5

## 0.16.4

### Patch Changes

- Updated dependencies [[`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - effect@3.10.13
  - @effect/sql@0.20.4

## 0.16.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.20.3

## 0.16.2

### Patch Changes

- Updated dependencies [[`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - effect@3.10.12
  - @effect/sql@0.20.2

## 0.16.1

### Patch Changes

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11
  - @effect/sql@0.20.1

## 0.16.0

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.20.0

## 0.15.0

### Patch Changes

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6)]:
  - effect@3.10.10
  - @effect/sql@0.19.0

## 0.14.16

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.16

## 0.14.15

### Patch Changes

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9
  - @effect/sql@0.18.15

## 0.14.14

### Patch Changes

- Updated dependencies [[`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - effect@3.10.8
  - @effect/sql@0.18.14

## 0.14.13

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7
  - @effect/sql@0.18.13

## 0.14.12

### Patch Changes

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552)]:
  - effect@3.10.6
  - @effect/sql@0.18.12

## 0.14.11

### Patch Changes

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5
  - @effect/sql@0.18.11

## 0.14.10

### Patch Changes

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - effect@3.10.4
  - @effect/sql@0.18.10

## 0.14.9

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.9

## 0.14.8

### Patch Changes

- Updated dependencies [[`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5)]:
  - effect@3.10.3
  - @effect/sql@0.18.8

## 0.14.7

### Patch Changes

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37)]:
  - effect@3.10.2
  - @effect/sql@0.18.7

## 0.14.6

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - effect@3.10.1
  - @effect/sql@0.18.6

## 0.14.5

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.5

## 0.14.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.4

## 0.14.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.3

## 0.14.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.2

## 0.14.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.1

## 0.14.0

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0
  - @effect/sql@0.18.0

## 0.13.0

### Patch Changes

- [#3760](https://github.com/Effect-TS/effect/pull/3760) [`dacbf7d`](https://github.com/Effect-TS/effect/commit/dacbf7db59899065aee4e5dd95a6459880e09ceb) Thanks @tim-smart! - add sql-clickhouse & clickhouse dialect

- Updated dependencies [[`dacbf7d`](https://github.com/Effect-TS/effect/commit/dacbf7db59899065aee4e5dd95a6459880e09ceb)]:
  - @effect/sql@0.17.0

## 0.12.6

### Patch Changes

- Updated dependencies [[`382556f`](https://github.com/Effect-TS/effect/commit/382556f8930780c0634de681077706113a8c8239), [`97cb014`](https://github.com/Effect-TS/effect/commit/97cb0145114b2cd2f378e98f6c4ff5bf2c1865f5)]:
  - @effect/schema@0.75.5
  - @effect/sql@0.16.6

## 0.12.5

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.16.5

## 0.12.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.16.4

## 0.12.3

### Patch Changes

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d)]:
  - effect@3.9.2
  - @effect/schema@0.75.4
  - @effect/sql@0.16.3

## 0.12.2

### Patch Changes

- Updated dependencies [[`360ec14`](https://github.com/Effect-TS/effect/commit/360ec14dd4102c526aef7433a8881ad4d9beab75)]:
  - @effect/schema@0.75.3
  - @effect/sql@0.16.2

## 0.12.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.16.1

## 0.12.0

### Patch Changes

- Updated dependencies [[`f02b354`](https://github.com/Effect-TS/effect/commit/f02b354ab5b0451143b82bb73dc866be29adec85)]:
  - @effect/schema@0.75.2
  - @effect/sql@0.16.0

## 0.11.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - effect@3.9.1
  - @effect/schema@0.75.1
  - @effect/sql@0.15.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/schema@0.75.0
  - @effect/sql@0.15.0

## 0.10.1

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/schema@0.74.2
  - @effect/sql@0.14.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`f100e20`](https://github.com/Effect-TS/effect/commit/f100e2087172d7e4ab8c0d1ee9a5780b9712382a)]:
  - @effect/sql@0.14.0

## 0.9.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.13.4

## 0.9.3

### Patch Changes

- Updated dependencies [[`0a68746`](https://github.com/Effect-TS/effect/commit/0a68746c89651c364db2ee8c72dcfe552e1782ea), [`734eae6`](https://github.com/Effect-TS/effect/commit/734eae654f215e4adca457d04d2a1728b1a55c83), [`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`ad7e1de`](https://github.com/Effect-TS/effect/commit/ad7e1de948745c0751bfdac96671028ff4b7a727), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/sql@0.13.3
  - @effect/schema@0.74.1
  - effect@3.8.4

## 0.9.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.13.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`d5c8e7e`](https://github.com/Effect-TS/effect/commit/d5c8e7e47373f9fd78637f24e36d6fb61ee35eb4)]:
  - @effect/sql@0.13.1

## 0.9.0

### Patch Changes

- Updated dependencies [[`de48aa5`](https://github.com/Effect-TS/effect/commit/de48aa54e98d97722a8a4c2c8f9e1fe1d4560ea2)]:
  - @effect/schema@0.74.0
  - @effect/sql@0.13.0

## 0.8.6

### Patch Changes

- Updated dependencies [[`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - effect@3.8.3
  - @effect/sql@0.12.6
  - @effect/schema@0.73.4

## 0.8.5

### Patch Changes

- Updated dependencies [[`e6440a7`](https://github.com/Effect-TS/effect/commit/e6440a74fb3f12f6422ed794c07cb44af91cbacc)]:
  - @effect/schema@0.73.3
  - @effect/sql@0.12.5

## 0.8.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.12.4

## 0.8.3

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2
  - @effect/schema@0.73.2
  - @effect/sql@0.12.3

## 0.8.2

### Patch Changes

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`f56ab78`](https://github.com/Effect-TS/effect/commit/f56ab785cbee0c1c43bd2c182c35602f486f61f0), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1
  - @effect/schema@0.73.1
  - @effect/sql@0.12.2

## 0.8.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.12.1

## 0.8.0

### Patch Changes

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`7fdf9d9`](https://github.com/Effect-TS/effect/commit/7fdf9d9aa1e2c1c125cbf87991e6efbf4abb7b07), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0
  - @effect/schema@0.73.0
  - @effect/sql@0.12.0

## 0.7.3

### Patch Changes

- Updated dependencies [[`ccd67df`](https://github.com/Effect-TS/effect/commit/ccd67df6b44ae7075a03759bc7866f6bc9ebb03e)]:
  - @effect/sql@0.11.3

## 0.7.2

### Patch Changes

- Updated dependencies [[`d8aff79`](https://github.com/Effect-TS/effect/commit/d8aff79d4cbedee33d0552ec43fdced007cae358), [`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be), [`d8aff79`](https://github.com/Effect-TS/effect/commit/d8aff79d4cbedee33d0552ec43fdced007cae358)]:
  - @effect/sql@0.11.2
  - effect@3.7.3
  - @effect/schema@0.72.4

## 0.7.1

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.11.1

## 0.7.0

### Patch Changes

- Updated dependencies [[`f6acb71`](https://github.com/Effect-TS/effect/commit/f6acb71b17a0e6b0d449e7f661c9e2c3d335fcac)]:
  - @effect/schema@0.72.3
  - @effect/sql@0.11.0

## 0.6.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.10.4

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.10.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2
  - @effect/schema@0.72.2
  - @effect/sql@0.10.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1
  - @effect/schema@0.72.1
  - @effect/sql@0.10.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0
  - @effect/schema@0.72.0
  - @effect/sql@0.10.0

## 0.5.7

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8
  - @effect/schema@0.71.4
  - @effect/sql@0.9.7

## 0.5.6

### Patch Changes

- Updated dependencies [[`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - effect@3.6.7
  - @effect/sql@0.9.6
  - @effect/schema@0.71.3

## 0.5.5

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6
  - @effect/schema@0.71.2
  - @effect/sql@0.9.5

## 0.5.4

### Patch Changes

- Updated dependencies [[`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`35be739`](https://github.com/Effect-TS/effect/commit/35be739a413e32ed251f775714af2f87355e8664), [`f8326cc`](https://github.com/Effect-TS/effect/commit/f8326cc1095630a3fbee3f25d6b4e74edb905903), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae), [`8dd3959`](https://github.com/Effect-TS/effect/commit/8dd3959e967ca2b38ba601d94a80f1c50e9445e0), [`2cb6ebb`](https://github.com/Effect-TS/effect/commit/2cb6ebbf782b79643befa061c6adcf0366a7b8b3), [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794), [`83a108a`](https://github.com/Effect-TS/effect/commit/83a108a254341721d20a82633b1e1d406d2368a3), [`f2c8dbb`](https://github.com/Effect-TS/effect/commit/f2c8dbb77e196c9a36cb3bf2ae3b82ce68e9874d), [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794)]:
  - effect@3.6.5
  - @effect/sql@0.9.4
  - @effect/schema@0.71.1

## 0.5.3

### Patch Changes

- Updated dependencies [[`c3446d3`](https://github.com/Effect-TS/effect/commit/c3446d3e57b0cbfe9341d6f2aebf5f5d6fefefe3)]:
  - @effect/sql@0.9.3

## 0.5.2

### Patch Changes

- Updated dependencies [[`cfcfbdf`](https://github.com/Effect-TS/effect/commit/cfcfbdfe586b011a5edc28083fd5391edeee0023)]:
  - @effect/sql@0.9.2

## 0.5.1

### Patch Changes

- Updated dependencies [[`e9da539`](https://github.com/Effect-TS/effect/commit/e9da5396bba99b2ddc20c97c7955154e6da4cab5), [`4fabf75`](https://github.com/Effect-TS/effect/commit/4fabf75b44ea98b1773059bd589167d5d8f64f06)]:
  - @effect/sql@0.9.1

## 0.5.0

### Patch Changes

- Updated dependencies [[`c1987e2`](https://github.com/Effect-TS/effect/commit/c1987e25c8f5c48bdc9ad223d7a6f2c32f93f5a1), [`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`1ceed14`](https://github.com/Effect-TS/effect/commit/1ceed149dc64f4874e64b5cf2f954eba0a5a1f12), [`a07990d`](https://github.com/Effect-TS/effect/commit/a07990de977fb60ab4af1e8f3a2250454dedbb34), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4), [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1)]:
  - @effect/schema@0.71.0
  - effect@3.6.4
  - @effect/sql@0.9.0

## 0.4.7

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/schema@0.70.4
  - @effect/sql@0.8.7

## 0.4.6

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.8.6

## 0.4.5

### Patch Changes

- Updated dependencies [[`99ad841`](https://github.com/Effect-TS/effect/commit/99ad8415293a82d08bd7043c563b29e2b468ca74), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/schema@0.70.3
  - effect@3.6.2
  - @effect/sql@0.8.5

## 0.4.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.8.4

## 0.4.3

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.8.3

## 0.4.2

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/schema@0.70.2
  - @effect/sql@0.8.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`3dce357`](https://github.com/Effect-TS/effect/commit/3dce357efe4a4451d7d29859d08ac11713999b1a), [`657fc48`](https://github.com/Effect-TS/effect/commit/657fc48bb32daf2dc09c9335b3cbc3152bcbdd3b)]:
  - @effect/schema@0.70.1
  - @effect/sql@0.8.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`42d0706`](https://github.com/Effect-TS/effect/commit/42d07067e9823ceb8977eff9672d9a290941dad5)]:
  - @effect/sql@0.8.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/schema@0.70.0
  - @effect/sql@0.7.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`7c0da50`](https://github.com/Effect-TS/effect/commit/7c0da5050d30cb804f4eacb15995d0fb7f3a28d2), [`2fc0ff4`](https://github.com/Effect-TS/effect/commit/2fc0ff4c59c25977018f6ac70ced99b04a8c7b2b), [`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`f262665`](https://github.com/Effect-TS/effect/commit/f262665c2773492c01e5dd0e8d6db235aafaaad8), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`9bbe7a6`](https://github.com/Effect-TS/effect/commit/9bbe7a681430ebf5c10167bb7140ba3742e46bb7), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - @effect/schema@0.69.3
  - effect@3.5.9
  - @effect/sql@0.6.3

## 0.2.2

### Patch Changes

- Updated dependencies [[`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231)]:
  - effect@3.5.8
  - @effect/sql@0.6.2
  - @effect/schema@0.69.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`f241154`](https://github.com/Effect-TS/effect/commit/f241154added5d91e95866c39481f09cdb13bd4d)]:
  - @effect/schema@0.69.1
  - @effect/sql@0.6.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`20807a4`](https://github.com/Effect-TS/effect/commit/20807a45edeb4334e903dca5d708cd62a71702d8)]:
  - @effect/schema@0.69.0
  - @effect/sql@0.6.0

## 0.1.3

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc), [`6921c4f`](https://github.com/Effect-TS/effect/commit/6921c4fb8c45badff09b493043b85ca71302b560)]:
  - effect@3.5.7
  - @effect/schema@0.68.27
  - @effect/sql@0.5.3

## 0.1.2

### Patch Changes

- Updated dependencies [[`f0285d3`](https://github.com/Effect-TS/effect/commit/f0285d3af6a18829123bc1818331c67206becbc4), [`8ec4955`](https://github.com/Effect-TS/effect/commit/8ec49555ed3b3c98093fa4d135a4c57a3f16ebd1), [`3ac2d76`](https://github.com/Effect-TS/effect/commit/3ac2d76048da09e876cf6c3aee3397febd843fe9), [`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - @effect/schema@0.68.26
  - effect@3.5.6
  - @effect/sql@0.5.2

## 0.1.1

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39)]:
  - effect@3.5.5
  - @effect/schema@0.68.25
  - @effect/sql@0.5.1

## 0.1.0

### Patch Changes

- Updated dependencies [[`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c), [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - @effect/sql@0.5.0
  - effect@3.5.4
  - @effect/schema@0.68.24

## 0.0.32

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/schema@0.68.23
  - @effect/sql@0.4.27

## 0.0.31

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/schema@0.68.22
  - @effect/sql@0.4.26

## 0.0.30

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.25

## 0.0.29

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/schema@0.68.21
  - @effect/sql@0.4.24

## 0.0.28

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/schema@0.68.20
  - @effect/sql@0.4.23

## 0.0.27

### Patch Changes

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9
  - @effect/schema@0.68.19
  - @effect/sql@0.4.22

## 0.0.26

### Patch Changes

- Updated dependencies [[`5d5cc6c`](https://github.com/Effect-TS/effect/commit/5d5cc6cfd7d63b07081290fb189b364999201fc5), [`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`359ff8a`](https://github.com/Effect-TS/effect/commit/359ff8aa2e4e6389bf56d759baa804e2a7674a16), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c), [`f7534b9`](https://github.com/Effect-TS/effect/commit/f7534b94cba06b143a3d4f29275d92874a939559)]:
  - @effect/schema@0.68.18
  - effect@3.4.8
  - @effect/sql@0.4.21

## 0.0.25

### Patch Changes

- Updated dependencies [[`15967cf`](https://github.com/Effect-TS/effect/commit/15967cf18931fb6ede3083eb687a8dfff371cc56), [`2328e17`](https://github.com/Effect-TS/effect/commit/2328e17577112db17c29b7756942a0ff64a70ee0), [`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - @effect/schema@0.68.17
  - effect@3.4.7
  - @effect/sql@0.4.20

## 0.0.24

### Patch Changes

- Updated dependencies [[`d006cec`](https://github.com/Effect-TS/effect/commit/d006cec022e8524dbfd6dc6df751fe4c86b10042), [`cb22726`](https://github.com/Effect-TS/effect/commit/cb2272656881aa5878a1c3fc0b12d8fbc66eb63c), [`e911cfd`](https://github.com/Effect-TS/effect/commit/e911cfdc79418462d7e9000976fded15ea6b738d)]:
  - @effect/schema@0.68.16
  - @effect/sql@0.4.19

## 0.0.23

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.18

## 0.0.22

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`34faeb6`](https://github.com/Effect-TS/effect/commit/34faeb6305ba52af4d6f8bdd2e633bb6a5a7a35b), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6
  - @effect/schema@0.68.15
  - @effect/sql@0.4.17

## 0.0.21

### Patch Changes

- Updated dependencies [[`61e5964`](https://github.com/Effect-TS/effect/commit/61e59640fd993216cca8ace0ac8abd9104e213ce)]:
  - @effect/schema@0.68.14
  - @effect/sql@0.4.16

## 0.0.20

### Patch Changes

- Updated dependencies [[`cb76bcb`](https://github.com/Effect-TS/effect/commit/cb76bcb2f8858a90db4f785efee262cea1b9844e)]:
  - @effect/schema@0.68.13
  - @effect/sql@0.4.15

## 0.0.19

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.14

## 0.0.18

### Patch Changes

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91), [`d990544`](https://github.com/Effect-TS/effect/commit/d9905444b9e800850cb65899114ca0e502e68fe8)]:
  - effect@3.4.5
  - @effect/schema@0.68.12
  - @effect/sql@0.4.13

## 0.0.17

### Patch Changes

- Updated dependencies [[`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c), [`d71c192`](https://github.com/Effect-TS/effect/commit/d71c192b89fd1162423acddc5fd3d6270fbf2ef6)]:
  - effect@3.4.4
  - @effect/schema@0.68.11
  - @effect/sql@0.4.12

## 0.0.16

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.11

## 0.0.15

### Patch Changes

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - effect@3.4.3
  - @effect/schema@0.68.10
  - @effect/sql@0.4.10

## 0.0.14

### Patch Changes

- Updated dependencies [[`0b47fdf`](https://github.com/Effect-TS/effect/commit/0b47fdfe449f42de89e0e88b61ae5140f629e5c4)]:
  - @effect/schema@0.68.9
  - @effect/sql@0.4.9

## 0.0.13

### Patch Changes

- Updated dependencies [[`192261b`](https://github.com/Effect-TS/effect/commit/192261b2aec94e9913ceed83683fdcfbc9fca66f), [`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - @effect/schema@0.68.8
  - effect@3.4.2
  - @effect/sql@0.4.8

## 0.0.12

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.7

## 0.0.11

### Patch Changes

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a)]:
  - effect@3.4.1
  - @effect/schema@0.68.7
  - @effect/sql@0.4.6

## 0.0.10

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.5

## 0.0.9

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.4

## 0.0.8

### Patch Changes

- Updated dependencies [[`530fa9e`](https://github.com/Effect-TS/effect/commit/530fa9e36b8532589b948fc4faa37593f36b7f42)]:
  - @effect/schema@0.68.6
  - @effect/sql@0.4.3

## 0.0.7

### Patch Changes

- Updated dependencies [[`1d62815`](https://github.com/Effect-TS/effect/commit/1d62815a50f34115606940ffa397442d75a20c81)]:
  - @effect/schema@0.68.5
  - @effect/sql@0.4.2

## 0.0.6

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.4.1

## 0.0.5

### Patch Changes

- [#3035](https://github.com/Effect-TS/effect/pull/3035) [`d33d8b0`](https://github.com/Effect-TS/effect/commit/d33d8b050b8e3c87dcde9587083e6c1cf733f72b) Thanks @tim-smart! - restructure sql modules to have flat imports

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`d33d8b0`](https://github.com/Effect-TS/effect/commit/d33d8b050b8e3c87dcde9587083e6c1cf733f72b), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0
  - @effect/sql@0.4.0
  - @effect/schema@0.68.4

## 0.0.4

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.3.18

## 0.0.3

### Patch Changes

- Updated dependencies [[`d473800`](https://github.com/Effect-TS/effect/commit/d47380012c3241d7287b66968d33a2414275ce7b)]:
  - @effect/schema@0.68.3
  - @effect/sql@0.3.17

## 0.0.2

### Patch Changes

- Updated dependencies [[`eb341b3`](https://github.com/Effect-TS/effect/commit/eb341b3eb34ad64499371bc08b7f59e429979d8a)]:
  - @effect/schema@0.68.2
  - @effect/sql@0.3.16
