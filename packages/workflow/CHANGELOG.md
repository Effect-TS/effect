# @effect/workflow

## 0.16.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/platform@0.94.0
  - @effect/experimental@0.58.0
  - @effect/rpc@0.73.0

## 0.15.2

### Patch Changes

- [#5880](https://github.com/Effect-TS/effect/pull/5880) [`cc4d2c3`](https://github.com/Effect-TS/effect/commit/cc4d2c3821fa060986d16ea04fca50a14f8ac6ff) Thanks @tim-smart! - ensure no more Activites are attempted before suspending

- Updated dependencies [[`bd08028`](https://github.com/Effect-TS/effect/commit/bd080284febb620e7e71f661bf9d850c402bb87f), [`6c5c2ba`](https://github.com/Effect-TS/effect/commit/6c5c2ba50ce49386e8d1e657230492ee900a6ec7)]:
  - effect@3.19.10

## 0.15.1

### Patch Changes

- [#5846](https://github.com/Effect-TS/effect/pull/5846) [`7c7d2e0`](https://github.com/Effect-TS/effect/commit/7c7d2e04913663ad98563dfc9ebffdf09c11c7db) Thanks @tim-smart! - add Workflow.scope, a seperate Scope that only closes on completion

- Updated dependencies [[`96c9537`](https://github.com/Effect-TS/effect/commit/96c9537f73a87a651c348488bdce7efbfd8360d1)]:
  - @effect/experimental@0.57.10

## 0.15.0

### Minor Changes

- [#5837](https://github.com/Effect-TS/effect/pull/5837) [`811852a`](https://github.com/Effect-TS/effect/commit/811852a61868136bb7b3367450f02e5a8fb8a3f9) Thanks @tim-smart! - add Activity.idempotencyKey

### Patch Changes

- Updated dependencies [[`811852a`](https://github.com/Effect-TS/effect/commit/811852a61868136bb7b3367450f02e5a8fb8a3f9)]:
  - @effect/experimental@0.57.9

## 0.14.0

### Minor Changes

- [#5827](https://github.com/Effect-TS/effect/pull/5827) [`7bd4e82`](https://github.com/Effect-TS/effect/commit/7bd4e827bc246a39d71b48a105e0853352efdc3b) Thanks @tim-smart! - remove schedule option from Activity.retry

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.57.7

## 0.13.1

### Patch Changes

- [#5821](https://github.com/Effect-TS/effect/pull/5821) [`2519056`](https://github.com/Effect-TS/effect/commit/2519056cb3aabd3dfffa0c874dabd74e2ad98655) Thanks @tim-smart! - add DurableQueue module

  A `DurableQueue` wraps a `PersistedQueue`, providing a way to wait for items
  to finish processing using a `DurableDeferred`.

  ```ts
  import { DurableQueue, Workflow } from "@effect/workflow"
  import { Effect, Schema } from "effect"

  // Define a DurableQueue that can be used to derive workers and offer items for
  // processing.
  const ApiQueue = DurableQueue.make({
    name: "ApiQueue",
    payload: {
      id: Schema.String
    },
    success: Schema.Void,
    error: Schema.Never,
    idempotencyKey(payload) {
      return payload.id
    }
  })

  const MyWorkflow = Workflow.make({
    name: "MyWorkflow",
    payload: {
      id: Schema.String
    },
    idempotencyKey: ({ id }) => id
  })

  const MyWorkflowLayer = MyWorkflow.toLayer(
    Effect.fn(function* () {
      // Add an item to the DurableQueue defined above.
      //
      // When the worker has finished processing the item, the workflow will
      // resume.
      //
      yield* DurableQueue.process(ApiQueue, { id: "api-call-1" })

      yield* Effect.log("Workflow succeeded!")
    })
  )

  // Define a worker layer that can process items from the DurableQueue.
  const ApiWorker = DurableQueue.worker(
    ApiQueue,
    Effect.fn(function* ({ id }) {
      yield* Effect.log(`Worker processing API call with id: ${id}`)
    }),
    { concurrency: 5 } // Process up to 5 items concurrently
  )
  ```

- Updated dependencies [[`ebfbbd6`](https://github.com/Effect-TS/effect/commit/ebfbbd62e1daf235d1f25b825d80ae4880408df3)]:
  - @effect/platform@0.93.5

## 0.13.0

### Minor Changes

- [#5771](https://github.com/Effect-TS/effect/pull/5771) [`794c790`](https://github.com/Effect-TS/effect/commit/794c790d736f62784bff800fda5a656026d93749) Thanks @tim-smart! - add WorkflowEngine.makeUnsafe, which abstracts the serialization boundary

### Patch Changes

- [#5771](https://github.com/Effect-TS/effect/pull/5771) [`794c790`](https://github.com/Effect-TS/effect/commit/794c790d736f62784bff800fda5a656026d93749) Thanks @tim-smart! - add in-memory WorkflowEngine layer

- Updated dependencies [[`794c790`](https://github.com/Effect-TS/effect/commit/794c790d736f62784bff800fda5a656026d93749), [`079975c`](https://github.com/Effect-TS/effect/commit/079975c69d80c62461da5c51fe89e02c44dfa2ea), [`62f7636`](https://github.com/Effect-TS/effect/commit/62f76361ee01ed816687774c5302e7f8c5ff6a42)]:
  - @effect/rpc@0.72.2
  - effect@3.19.5
  - @effect/experimental@0.57.3

## 0.12.5

### Patch Changes

- [#5744](https://github.com/Effect-TS/effect/pull/5744) [`7f3c781`](https://github.com/Effect-TS/effect/commit/7f3c781c11ceea5291d61adf107d0e098e5d1e07) Thanks @tim-smart! - remove auto-resumption of child workflows

## 0.12.4

### Patch Changes

- [#5742](https://github.com/Effect-TS/effect/pull/5742) [`8c49696`](https://github.com/Effect-TS/effect/commit/8c49696f374dafa4fa628bec3957597f923a148d) Thanks @tim-smart! - don't try resume a child workflow if it has a defect

## 0.12.3

### Patch Changes

- [#5731](https://github.com/Effect-TS/effect/pull/5731) [`796a3b5`](https://github.com/Effect-TS/effect/commit/796a3b5aa3f6e0bd85583cc59f39bc059403345a) Thanks @tim-smart! - add in memory threshold to DurableClock.sleep

- [#5731](https://github.com/Effect-TS/effect/pull/5731) [`796a3b5`](https://github.com/Effect-TS/effect/commit/796a3b5aa3f6e0bd85583cc59f39bc059403345a) Thanks @tim-smart! - add DurableRateLimiter module to @effect/workflow

- Updated dependencies [[`796a3b5`](https://github.com/Effect-TS/effect/commit/796a3b5aa3f6e0bd85583cc59f39bc059403345a)]:
  - @effect/experimental@0.57.1

## 0.12.2

### Patch Changes

- [#5695](https://github.com/Effect-TS/effect/pull/5695) [`63f2bf3`](https://github.com/Effect-TS/effect/commit/63f2bf393ef4bb3e46db59abdf1b2160e8ee71d4) Thanks @tim-smart! - tie cluster Entity lifetimes to Layer scope

- Updated dependencies [[`63f2bf3`](https://github.com/Effect-TS/effect/commit/63f2bf393ef4bb3e46db59abdf1b2160e8ee71d4)]:
  - effect@3.19.1

## 0.12.1

### Patch Changes

- [#5684](https://github.com/Effect-TS/effect/pull/5684) [`15100f6`](https://github.com/Effect-TS/effect/commit/15100f6ed1ae554c295fb8034623e942dcdc6a72) Thanks @tim-smart! - retry interrupted workflow activities

- Updated dependencies [[`d43577b`](https://github.com/Effect-TS/effect/commit/d43577be59ae510812287b1cbffe6da15c040452)]:
  - @effect/rpc@0.72.1

## 0.12.0

### Minor Changes

- [#5606](https://github.com/Effect-TS/effect/pull/5606) [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433) Thanks @tim-smart! - backport @effect/cluster from effect v4

  @effect/cluster no longer requires a Shard Manager, and instead relies on the
  `RunnerStorage` service to track runner state.

  To migrate, remove any Shard Manager deployments and use the updated layers in
  `@effect/platform-node` or `@effect/platform-bun`.

  # Breaking Changes
  - `ShardManager` module has been removed
  - `EntityNotManagedByRunner` error has been removed
  - Shard locks now use database advisory locks, which requires stable sessions
    for database connections. This means load balancers or proxies that rotate
    connections may cause issues.
  - `@effect/platform-node/NodeClusterSocketRunner` is now
    `@effect/cluster/NodeClusterSocket`
  - `@effect/platform-node/NodeClusterHttpRunner` is now
    `@effect/cluster/NodeClusterHttp`
  - `@effect/platform-bun/BunClusterSocketRunner` is now
    `@effect/cluster/BunClusterSocket`
  - `@effect/platform-bun/BunClusterHttpRunner` is now
    `@effect/cluster/BunClusterHttp`

  # New Features
  - `RunnerHealth.layerK8s` has been added, which uses the Kubernetes API to track
    runner health and liveness. To use it, you will need a service account with
    permissions to read pod information.

### Patch Changes

- [#5606](https://github.com/Effect-TS/effect/pull/5606) [`27863ab`](https://github.com/Effect-TS/effect/commit/27863abed9047a3cb5d47b4136ff69d5456e2c74) Thanks @vinassefranche! - Add Workflow type utils

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/rpc@0.72.0
  - @effect/platform@0.93.0

## 0.11.5

### Patch Changes

- [#5642](https://github.com/Effect-TS/effect/pull/5642) [`b8e3c6d`](https://github.com/Effect-TS/effect/commit/b8e3c6d510aec858ac34bfe5eb2b8fc5506fd669) Thanks @tim-smart! - fix ReferenceError in NodeSocket.fromNet

- Updated dependencies [[`b8e3c6d`](https://github.com/Effect-TS/effect/commit/b8e3c6d510aec858ac34bfe5eb2b8fc5506fd669)]:
  - @effect/rpc@0.71.1

## 0.11.4

### Patch Changes

- [#5640](https://github.com/Effect-TS/effect/pull/5640) [`85ea731`](https://github.com/Effect-TS/effect/commit/85ea731c8305c040fc50b82c204f3e20371c50a4) Thanks @tim-smart! - use external interruption for workflow suspend

## 0.11.3

### Patch Changes

- [#5602](https://github.com/Effect-TS/effect/pull/5602) [`64b764b`](https://github.com/Effect-TS/effect/commit/64b764b3207eb13cacb13da31343aaf425e966bf) Thanks @tim-smart! - guard against race conditions in NodeSocketServer

## 0.11.2

### Patch Changes

- [#5590](https://github.com/Effect-TS/effect/pull/5590) [`f4c4702`](https://github.com/Effect-TS/effect/commit/f4c4702ab01900c42c0af4662dfb7a5973619646) Thanks @tim-smart! - add openTimeout options to NodeSocket.makeNet

- Updated dependencies [[`f6987c0`](https://github.com/Effect-TS/effect/commit/f6987c04ebf1386dc37729dfea1631ce364a5a96)]:
  - @effect/platform@0.92.1

## 0.11.1

### Patch Changes

- [#5585](https://github.com/Effect-TS/effect/pull/5585) [`cf17f2f`](https://github.com/Effect-TS/effect/commit/cf17f2f0319a57a886558b01549fea675cd78b69) Thanks @tim-smart! - keep socket error listener attached in NodeSocket

- Updated dependencies [[`07802f7`](https://github.com/Effect-TS/effect/commit/07802f78fd410d800f0231129ee0866977399152)]:
  - effect@3.18.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0
  - @effect/platform@0.92.0
  - @effect/rpc@0.71.0

## 0.10.3

### Patch Changes

- [#5581](https://github.com/Effect-TS/effect/pull/5581) [`dd7b459`](https://github.com/Effect-TS/effect/commit/dd7b4591b79ed88f3c0fcc607f9e42f22883f9bd) Thanks @tim-smart! - persist activity interrupts as "Suspended"

- Updated dependencies [[`dd7b459`](https://github.com/Effect-TS/effect/commit/dd7b4591b79ed88f3c0fcc607f9e42f22883f9bd)]:
  - @effect/rpc@0.70.2

## 0.10.2

### Patch Changes

- [#5577](https://github.com/Effect-TS/effect/pull/5577) [`c9e1e40`](https://github.com/Effect-TS/effect/commit/c9e1e4064cef4c4324318ec76b35bbbdc026dace) Thanks @tim-smart! - ignore non-client interrupts in workflow activities

- Updated dependencies [[`c9e1e40`](https://github.com/Effect-TS/effect/commit/c9e1e4064cef4c4324318ec76b35bbbdc026dace)]:
  - @effect/rpc@0.70.1

## 0.10.1

### Patch Changes

- [#5575](https://github.com/Effect-TS/effect/pull/5575) [`d0e97d7`](https://github.com/Effect-TS/effect/commit/d0e97d74a9e4d4a436ac8d148db81144cf872cc6) Thanks @tim-smart! - fix SqlMessageStorage last reply for sqlite

## 0.10.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/rpc@0.70.0

## 0.9.6

### Patch Changes

- [#5543](https://github.com/Effect-TS/effect/pull/5543) [`2b9db9e`](https://github.com/Effect-TS/effect/commit/2b9db9e7f930d3ae269b123286c881ea34d3afca) Thanks @tim-smart! - propagate workflow interruption to unfinished children

## 0.9.5

### Patch Changes

- [#5488](https://github.com/Effect-TS/effect/pull/5488) [`92fd3ca`](https://github.com/Effect-TS/effect/commit/92fd3caac581160ee4add14c16cd3a393be0bcc0) Thanks @tim-smart! - return executionId from Workflow.execute + discard

## 0.9.4

### Patch Changes

- [#5486](https://github.com/Effect-TS/effect/pull/5486) [`85a60a0`](https://github.com/Effect-TS/effect/commit/85a60a0f06e596991dec1d64bdfccac8df880f84) Thanks @tim-smart! - add Workflow.poll api

## 0.9.3

### Patch Changes

- [#5470](https://github.com/Effect-TS/effect/pull/5470) [`e0d79c6`](https://github.com/Effect-TS/effect/commit/e0d79c63c9b824ac3dbd345ef0eda6facea1ad6d) Thanks @tim-smart! - suspend workflow execution to ensure defects don't escape

## 0.9.2

### Patch Changes

- [#5415](https://github.com/Effect-TS/effect/pull/5415) [`4cb3af5`](https://github.com/Effect-TS/effect/commit/4cb3af5aeae8535a04f84fb0f64c3f2be19e2aed) Thanks @tim-smart! - fix rpc msgpack serialization when chunk contains partial frames

- Updated dependencies [[`4cb3af5`](https://github.com/Effect-TS/effect/commit/4cb3af5aeae8535a04f84fb0f64c3f2be19e2aed)]:
  - @effect/rpc@0.69.1

## 0.9.1

### Patch Changes

- [#5394](https://github.com/Effect-TS/effect/pull/5394) [`59547d9`](https://github.com/Effect-TS/effect/commit/59547d94dc625b19da62b5d1f3ddffa59efb0ff2) Thanks @tim-smart! - add DurableDeferred.withActivityAttempt, for scoping it to the current activity run

## 0.9.0

### Patch Changes

- Updated dependencies [[`3e163b2`](https://github.com/Effect-TS/effect/commit/3e163b24cc2b647e25566ba29ef25c3f57609042)]:
  - @effect/rpc@0.69.0

## 0.8.3

### Patch Changes

- [#5350](https://github.com/Effect-TS/effect/pull/5350) [`d0b5fd1`](https://github.com/Effect-TS/effect/commit/d0b5fd1f7a292a47b9eeb058e5df57ace9a5ab14) Thanks @tim-smart! - add Migrator.fromRecord api

## 0.8.2

### Patch Changes

- [#5345](https://github.com/Effect-TS/effect/pull/5345) [`58d56d5`](https://github.com/Effect-TS/effect/commit/58d56d549fa49d6d06cfedb975a046872ac44f85) Thanks @tim-smart! - log defects in Entity & Workflow proxy for HttpApi endpoints

## 0.8.1

### Patch Changes

- [#5265](https://github.com/Effect-TS/effect/pull/5265) [`c887902`](https://github.com/Effect-TS/effect/commit/c887902e29350996bb8330097a9cf7fc01d25577) Thanks @jrmdayn! - Add a new endpoint to the Workflow Proxy to resume a workflow that has been suspended

- [#5271](https://github.com/Effect-TS/effect/pull/5271) [`88e219f`](https://github.com/Effect-TS/effect/commit/88e219f8a89058e2a68902aba181ea6929c0813b) Thanks @tim-smart! - track the Cause for workflow SuspendOnFailure

## 0.8.0

### Patch Changes

- Updated dependencies [[`5a0f4f1`](https://github.com/Effect-TS/effect/commit/5a0f4f176687a39d9fa46bb894bb7ac3175b0e87), [`e9cbd26`](https://github.com/Effect-TS/effect/commit/e9cbd2673401723aa811b0535202e4f57baf6d2c)]:
  - effect@3.17.1
  - @effect/rpc@0.68.0

## 0.7.1

### Patch Changes

- [#5260](https://github.com/Effect-TS/effect/pull/5260) [`0b17343`](https://github.com/Effect-TS/effect/commit/0b17343e55a191f7621cc9efe98696c4fa2ec11e) Thanks @tim-smart! - don't capture non-suspended interrupts in Workflow.intoResult

## 0.7.0

### Patch Changes

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0
  - @effect/rpc@0.67.0

## 0.6.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/platform@0.89.0
  - @effect/rpc@0.66.0

## 0.5.1

### Patch Changes

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/platform@0.88.1
  - @effect/rpc@0.65.1

## 0.5.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0
  - @effect/rpc@0.65.0

## 0.4.14

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`5b7cd92`](https://github.com/Effect-TS/effect/commit/5b7cd923e786c38a0802faf0fe75498ab3cccf28), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/rpc@0.64.14
  - @effect/platform@0.87.13

## 0.4.13

### Patch Changes

- [#5191](https://github.com/Effect-TS/effect/pull/5191) [`ad6e968`](https://github.com/Effect-TS/effect/commit/ad6e9688d78db27a80396ad79d376bb7eaf668bf) Thanks @tim-smart! - Support proper suspension of workflows when nesting child workflows

- [#5195](https://github.com/Effect-TS/effect/pull/5195) [`a28efb8`](https://github.com/Effect-TS/effect/commit/a28efb8913d9a7ac65c1cb783b17f382b185f8be) Thanks @tim-smart! - add Workflow.SuspendOnFailure annotation

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12
  - @effect/rpc@0.64.13

## 0.4.12

### Patch Changes

- Updated dependencies [[`79a1947`](https://github.com/Effect-TS/effect/commit/79a1947359cbd89a47ea315cdd86a3d250f28f43), [`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/rpc@0.64.12
  - @effect/platform@0.87.11

## 0.4.11

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10
  - @effect/rpc@0.64.11

## 0.4.10

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9
  - @effect/rpc@0.64.10

## 0.4.9

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8
  - @effect/rpc@0.64.9

## 0.4.8

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/rpc@0.64.8

## 0.4.7

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/platform@0.87.6
  - @effect/rpc@0.64.7

## 0.4.6

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/rpc@0.64.6

## 0.4.5

### Patch Changes

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4
  - @effect/rpc@0.64.5

## 0.4.4

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e)]:
  - @effect/platform@0.87.3
  - @effect/rpc@0.64.4

## 0.4.3

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/rpc@0.64.3

## 0.4.2

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/platform@0.87.1
  - @effect/rpc@0.64.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`112a93a`](https://github.com/Effect-TS/effect/commit/112a93a9bab73e95e79f7b3502d1a7b1acd668fc)]:
  - @effect/rpc@0.64.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba)]:
  - @effect/rpc@0.64.0
  - @effect/platform@0.87.0

## 0.3.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0
  - @effect/rpc@0.63.0

## 0.2.4

### Patch Changes

- Updated dependencies [[`a8d99b2`](https://github.com/Effect-TS/effect/commit/a8d99b2ec2f55d9aa6e7d00a5138e80380716877)]:
  - @effect/rpc@0.62.4

## 0.2.3

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2
  - @effect/rpc@0.62.3

## 0.2.2

### Patch Changes

- Updated dependencies [[`ddfd1e4`](https://github.com/Effect-TS/effect/commit/ddfd1e43db60e3b779d18a221344423c5f3c7416)]:
  - @effect/rpc@0.62.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/platform@0.85.1
  - @effect/rpc@0.62.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0
  - @effect/rpc@0.62.0

## 0.1.14

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294), [`cbac1ac`](https://github.com/Effect-TS/effect/commit/cbac1ac61a4e15ad15828563b39eef412bcee66e)]:
  - effect@3.16.7
  - @effect/rpc@0.61.15
  - @effect/platform@0.84.11

## 0.1.13

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/platform@0.84.10
  - @effect/rpc@0.61.14

## 0.1.12

### Patch Changes

- Updated dependencies [[`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126), [`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126)]:
  - @effect/rpc@0.61.13

## 0.1.11

### Patch Changes

- Updated dependencies [[`e0d3d42`](https://github.com/Effect-TS/effect/commit/e0d3d424d8f4e6a8ada017160406991f02b3c068)]:
  - @effect/rpc@0.61.12

## 0.1.10

### Patch Changes

- [#4750](https://github.com/Effect-TS/effect/pull/4750) [`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53) Thanks @tim-smart! - add Workflow.CaptureDefects annotation, to configure defect behaviour

- Updated dependencies [[`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53)]:
  - @effect/rpc@0.61.11

## 0.1.9

### Patch Changes

- [#5018](https://github.com/Effect-TS/effect/pull/5018) [`d350176`](https://github.com/Effect-TS/effect/commit/d3501768d42d7ff3ebc2d414c95cc1fcce15894a) Thanks @tim-smart! - prevent shadowing of Workflow context

## 0.1.8

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/platform@0.84.9
  - @effect/rpc@0.61.10

## 0.1.7

### Patch Changes

- Updated dependencies [[`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2), [`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2)]:
  - @effect/rpc@0.61.9

## 0.1.6

### Patch Changes

- [#5009](https://github.com/Effect-TS/effect/pull/5009) [`2a9a0ef`](https://github.com/Effect-TS/effect/commit/2a9a0ef1181a4419e239edb2abfd95f359a4b7f7) Thanks @tim-smart! - remove Workflow.Registration type

## 0.1.5

### Patch Changes

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8
  - @effect/rpc@0.61.8

## 0.1.4

### Patch Changes

- [#4995](https://github.com/Effect-TS/effect/pull/4995) [`34333ab`](https://github.com/Effect-TS/effect/commit/34333ab08de42a5269ddb13f66de1536ad6f249f) Thanks @tim-smart! - add DurableDeferred.into

- [#4995](https://github.com/Effect-TS/effect/pull/4995) [`34333ab`](https://github.com/Effect-TS/effect/commit/34333ab08de42a5269ddb13f66de1536ad6f249f) Thanks @tim-smart! - add Activity.raceAll

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/platform@0.84.7
  - @effect/rpc@0.61.7

## 0.1.3

### Patch Changes

- [#4977](https://github.com/Effect-TS/effect/pull/4977) [`d244b63`](https://github.com/Effect-TS/effect/commit/d244b6345ea1d2ac88812562b0c170683913d502) Thanks @tim-smart! - add WorkflowProxy & WorkflowProxyServer, for deriving rpc & HttpApi servers from workflows

- Updated dependencies [[`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/platform@0.84.6
  - @effect/rpc@0.61.6

## 0.1.2

### Patch Changes

- [#4955](https://github.com/Effect-TS/effect/pull/4955) [`b8aec45`](https://github.com/Effect-TS/effect/commit/b8aec45288834c499caeb3478a634ea5043fd611) Thanks @tim-smart! - add `withCompensation` api to Workflow instances

- [#4955](https://github.com/Effect-TS/effect/pull/4955) [`b8aec45`](https://github.com/Effect-TS/effect/commit/b8aec45288834c499caeb3478a634ea5043fd611) Thanks @tim-smart! - remove Activity.onError

## 0.1.1

### Patch Changes

- [#4953](https://github.com/Effect-TS/effect/pull/4953) [`fd60c73`](https://github.com/Effect-TS/effect/commit/fd60c73ea6d51c9b83279da60e7b6d605698b1d8) Thanks @tim-smart! - add Activity.onError

## 0.1.0

### Minor Changes

- [#4945](https://github.com/Effect-TS/effect/pull/4945) [`a116aea`](https://github.com/Effect-TS/effect/commit/a116aeade97c83d8c96f17cdc5cf3b5a0bd9be74) Thanks @tim-smart! - add @effect/workflow package

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3
