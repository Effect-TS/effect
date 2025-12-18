# @effect/platform-node-shared

## 0.57.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/platform@0.94.0
  - @effect/cluster@0.56.0
  - @effect/rpc@0.73.0
  - @effect/sql@0.49.0

## 0.56.0

### Patch Changes

- Updated dependencies [[`811852a`](https://github.com/Effect-TS/effect/commit/811852a61868136bb7b3367450f02e5a8fb8a3f9)]:
  - @effect/sql@0.48.6
  - @effect/cluster@0.55.0

## 0.55.0

### Patch Changes

- Updated dependencies []:
  - @effect/cluster@0.54.0

## 0.54.0

### Patch Changes

- Updated dependencies [[`794c790`](https://github.com/Effect-TS/effect/commit/794c790d736f62784bff800fda5a656026d93749), [`079975c`](https://github.com/Effect-TS/effect/commit/079975c69d80c62461da5c51fe89e02c44dfa2ea), [`62f7636`](https://github.com/Effect-TS/effect/commit/62f76361ee01ed816687774c5302e7f8c5ff6a42)]:
  - @effect/rpc@0.72.2
  - effect@3.19.5
  - @effect/cluster@0.53.0

## 0.53.0

### Patch Changes

- Updated dependencies [[`571025c`](https://github.com/Effect-TS/effect/commit/571025ceaff6ef432a61bf65735a5a0f45118313), [`d43577b`](https://github.com/Effect-TS/effect/commit/d43577be59ae510812287b1cbffe6da15c040452)]:
  - @effect/cluster@0.52.0
  - @effect/sql@0.48.0
  - @effect/rpc@0.72.1

## 0.52.0

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

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/cluster@0.51.0
  - @effect/rpc@0.72.0
  - @effect/platform@0.93.0
  - @effect/sql@0.47.0

## 0.51.6

### Patch Changes

- [#5642](https://github.com/Effect-TS/effect/pull/5642) [`b8e3c6d`](https://github.com/Effect-TS/effect/commit/b8e3c6d510aec858ac34bfe5eb2b8fc5506fd669) Thanks @tim-smart! - fix ReferenceError in NodeSocket.fromNet

- Updated dependencies [[`b8e3c6d`](https://github.com/Effect-TS/effect/commit/b8e3c6d510aec858ac34bfe5eb2b8fc5506fd669)]:
  - @effect/cluster@0.50.6
  - @effect/rpc@0.71.1

## 0.51.5

### Patch Changes

- [#5638](https://github.com/Effect-TS/effect/pull/5638) [`c11019d`](https://github.com/Effect-TS/effect/commit/c11019ddff54558e7537acbb4aca3e0d5a494839) Thanks @tim-smart! - don't use removeAllListeners in NodeSocket.fromNet

## 0.51.4

### Patch Changes

- [#5595](https://github.com/Effect-TS/effect/pull/5595) [`12c3ce1`](https://github.com/Effect-TS/effect/commit/12c3ce129f5092778be224fc129f4b84d319f2f9) Thanks @code-alexander! - Fixing stat error when `blksize` is undefined.

## 0.51.3

### Patch Changes

- [#5602](https://github.com/Effect-TS/effect/pull/5602) [`64b764b`](https://github.com/Effect-TS/effect/commit/64b764b3207eb13cacb13da31343aaf425e966bf) Thanks @tim-smart! - guard against race conditions in NodeSocketServer

- Updated dependencies [[`64b764b`](https://github.com/Effect-TS/effect/commit/64b764b3207eb13cacb13da31343aaf425e966bf)]:
  - @effect/cluster@0.50.3

## 0.51.2

### Patch Changes

- [#5590](https://github.com/Effect-TS/effect/pull/5590) [`f4c4702`](https://github.com/Effect-TS/effect/commit/f4c4702ab01900c42c0af4662dfb7a5973619646) Thanks @tim-smart! - add openTimeout options to NodeSocket.makeNet

- Updated dependencies [[`f4c4702`](https://github.com/Effect-TS/effect/commit/f4c4702ab01900c42c0af4662dfb7a5973619646), [`f6987c0`](https://github.com/Effect-TS/effect/commit/f6987c04ebf1386dc37729dfea1631ce364a5a96)]:
  - @effect/cluster@0.50.2
  - @effect/platform@0.92.1

## 0.51.1

### Patch Changes

- [#5585](https://github.com/Effect-TS/effect/pull/5585) [`cf17f2f`](https://github.com/Effect-TS/effect/commit/cf17f2f0319a57a886558b01549fea675cd78b69) Thanks @tim-smart! - keep socket error listener attached in NodeSocket

- Updated dependencies [[`07802f7`](https://github.com/Effect-TS/effect/commit/07802f78fd410d800f0231129ee0866977399152), [`cf17f2f`](https://github.com/Effect-TS/effect/commit/cf17f2f0319a57a886558b01549fea675cd78b69)]:
  - effect@3.18.1
  - @effect/cluster@0.50.1

## 0.51.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0
  - @effect/platform@0.92.0
  - @effect/cluster@0.50.0
  - @effect/rpc@0.71.0
  - @effect/sql@0.46.0

## 0.50.1

### Patch Changes

- [#5557](https://github.com/Effect-TS/effect/pull/5557) [`978b6ff`](https://github.com/Effect-TS/effect/commit/978b6ffc0b124d67d62a797211eff795f22cd1e6) Thanks @tim-smart! - allow NodeSocket.makeNet open to be interrupted

- Updated dependencies [[`978b6ff`](https://github.com/Effect-TS/effect/commit/978b6ffc0b124d67d62a797211eff795f22cd1e6)]:
  - @effect/cluster@0.49.1

## 0.50.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/rpc@0.70.0
  - @effect/cluster@0.49.0
  - @effect/sql@0.45.0

## 0.49.2

### Patch Changes

- [#5517](https://github.com/Effect-TS/effect/pull/5517) [`de07e58`](https://github.com/Effect-TS/effect/commit/de07e5805496b80226ba6a5efc2b4c05e1aba4b8) Thanks @tim-smart! - backport cluster improvements from effect 4

- Updated dependencies [[`de07e58`](https://github.com/Effect-TS/effect/commit/de07e5805496b80226ba6a5efc2b4c05e1aba4b8), [`de07e58`](https://github.com/Effect-TS/effect/commit/de07e5805496b80226ba6a5efc2b4c05e1aba4b8)]:
  - @effect/cluster@0.48.10
  - @effect/platform@0.90.10
  - @effect/rpc@0.69.3

## 0.49.1

### Patch Changes

- [#5481](https://github.com/Effect-TS/effect/pull/5481) [`333be04`](https://github.com/Effect-TS/effect/commit/333be046b50e8300f5cb70b871448e0628b7b37c) Thanks @jpowersdev! - Allow user to set extension of file created using `FileSystem.makeTempFile`

- Updated dependencies [[`333be04`](https://github.com/Effect-TS/effect/commit/333be046b50e8300f5cb70b871448e0628b7b37c), [`0a9ec23`](https://github.com/Effect-TS/effect/commit/0a9ec23dca104ac6fd7ea5841e98f5fa7796be40)]:
  - @effect/platform@0.90.8
  - @effect/cluster@0.48.4

## 0.49.0

### Patch Changes

- Updated dependencies [[`3e163b2`](https://github.com/Effect-TS/effect/commit/3e163b24cc2b647e25566ba29ef25c3f57609042)]:
  - @effect/rpc@0.69.0
  - @effect/cluster@0.48.0

## 0.48.1

### Patch Changes

- [#5383](https://github.com/Effect-TS/effect/pull/5383) [`5c67e29`](https://github.com/Effect-TS/effect/commit/5c67e29945f3acf7c1146fdf3684966c8740d3b6) Thanks @IMax153! - Ensure that user input is always offered to the terminal input mailbox

## 0.48.0

### Patch Changes

- Updated dependencies [[`a949539`](https://github.com/Effect-TS/effect/commit/a94953971c2e908890dfda00f8560d317306c328), [`a949539`](https://github.com/Effect-TS/effect/commit/a94953971c2e908890dfda00f8560d317306c328)]:
  - @effect/cluster@0.47.0
  - effect@3.17.7

## 0.47.2

### Patch Changes

- [#5347](https://github.com/Effect-TS/effect/pull/5347) [`20f0d69`](https://github.com/Effect-TS/effect/commit/20f0d6978e0e98464f23b6582c37c6ce12319f29) Thanks @tim-smart! - update Cluster layer conditional storage types

- Updated dependencies [[`d0b5fd1`](https://github.com/Effect-TS/effect/commit/d0b5fd1f7a292a47b9eeb058e5df57ace9a5ab14)]:
  - @effect/cluster@0.46.4
  - @effect/sql@0.44.1

## 0.47.1

### Patch Changes

- [#5327](https://github.com/Effect-TS/effect/pull/5327) [`695bc1a`](https://github.com/Effect-TS/effect/commit/695bc1ab8612cb5b326ecb57c80bd6e36dfd63ee) Thanks @fubhy! - Improved child process cleanup

- [#5339](https://github.com/Effect-TS/effect/pull/5339) [`f1ad6c5`](https://github.com/Effect-TS/effect/commit/f1ad6c5ffc349d45ce64b285f2d0cf4ea77f9897) Thanks @fubhy! - Added `stderr` and `stdout` as `NodeStream` and `stderr` and `stdin` as `NodeSink`

## 0.47.0

### Patch Changes

- Updated dependencies [[`5a0f4f1`](https://github.com/Effect-TS/effect/commit/5a0f4f176687a39d9fa46bb894bb7ac3175b0e87), [`e9cbd26`](https://github.com/Effect-TS/effect/commit/e9cbd2673401723aa811b0535202e4f57baf6d2c)]:
  - effect@3.17.1
  - @effect/rpc@0.68.0
  - @effect/cluster@0.46.0

## 0.46.0

### Patch Changes

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0
  - @effect/cluster@0.45.0
  - @effect/rpc@0.67.0
  - @effect/sql@0.44.0

## 0.45.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/cluster@0.44.0
  - @effect/platform@0.89.0
  - @effect/rpc@0.66.0
  - @effect/sql@0.43.0

## 0.44.0

### Patch Changes

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/sql@0.42.0
  - @effect/platform@0.88.1
  - @effect/cluster@0.43.0
  - @effect/rpc@0.65.1

## 0.43.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0
  - @effect/cluster@0.42.0
  - @effect/rpc@0.65.0
  - @effect/sql@0.41.0

## 0.42.18

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`5b7cd92`](https://github.com/Effect-TS/effect/commit/5b7cd923e786c38a0802faf0fe75498ab3cccf28), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/rpc@0.64.14
  - @effect/cluster@0.41.18
  - @effect/platform@0.87.13
  - @effect/sql@0.40.14

## 0.42.17

### Patch Changes

- Updated dependencies [[`56b33c3`](https://github.com/Effect-TS/effect/commit/56b33c357cfc5f8976486f48e93032058c02d876)]:
  - @effect/cluster@0.41.17

## 0.42.16

### Patch Changes

- [#5174](https://github.com/Effect-TS/effect/pull/5174) [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7) Thanks @schickling! - feat(platform): add recursive option to FileSystem.watch

  Added a `recursive` option to `FileSystem.watch` that allows watching for changes in subdirectories. When set to `true`, the watcher will monitor changes in all nested directories.

  Note: The recursive option is only supported on macOS and Windows. On other platforms, it will be ignored.

  Example:

  ```ts
  import { FileSystem } from "@effect/platform"
  import { Effect, Stream } from "effect"

  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // Watch directory and all subdirectories
    yield* fs
      .watch("src", { recursive: true })
      .pipe(Stream.runForEach(console.log))
  })
  ```

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12
  - @effect/cluster@0.41.16
  - @effect/rpc@0.64.13
  - @effect/sql@0.40.13

## 0.42.15

### Patch Changes

- Updated dependencies [[`79a1947`](https://github.com/Effect-TS/effect/commit/79a1947359cbd89a47ea315cdd86a3d250f28f43), [`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/rpc@0.64.12
  - @effect/platform@0.87.11
  - @effect/cluster@0.41.15
  - @effect/sql@0.40.12

## 0.42.14

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10
  - @effect/cluster@0.41.14
  - @effect/rpc@0.64.11
  - @effect/sql@0.40.11

## 0.42.13

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9
  - @effect/cluster@0.41.13
  - @effect/rpc@0.64.10
  - @effect/sql@0.40.10

## 0.42.12

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8
  - @effect/cluster@0.41.12
  - @effect/rpc@0.64.9
  - @effect/sql@0.40.9

## 0.42.11

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/cluster@0.41.11
  - @effect/rpc@0.64.8
  - @effect/sql@0.40.8

## 0.42.10

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/cluster@0.41.10
  - @effect/platform@0.87.6
  - @effect/rpc@0.64.7
  - @effect/sql@0.40.7

## 0.42.9

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.40.6
  - @effect/cluster@0.41.9

## 0.42.8

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/cluster@0.41.8
  - @effect/rpc@0.64.6
  - @effect/sql@0.40.5

## 0.42.7

### Patch Changes

- Updated dependencies [[`b01d2e0`](https://github.com/Effect-TS/effect/commit/b01d2e0d591418e10e9e362698205d848e97a9b7)]:
  - @effect/cluster@0.41.7

## 0.42.6

### Patch Changes

- Updated dependencies [[`7fdc16b`](https://github.com/Effect-TS/effect/commit/7fdc16bd88b872f5918384e4acda3731aab018da), [`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/cluster@0.41.6
  - @effect/platform@0.87.4
  - @effect/rpc@0.64.5
  - @effect/sql@0.40.4

## 0.42.5

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e), [`46c3216`](https://github.com/Effect-TS/effect/commit/46c321657d93393506278327418e36f8e7a77f86)]:
  - @effect/platform@0.87.3
  - @effect/sql@0.40.3
  - @effect/cluster@0.41.5
  - @effect/rpc@0.64.4

## 0.42.4

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/cluster@0.41.4
  - @effect/rpc@0.64.3
  - @effect/sql@0.40.2

## 0.42.3

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/cluster@0.41.3
  - @effect/platform@0.87.1
  - @effect/rpc@0.64.2
  - @effect/sql@0.40.1

## 0.42.2

### Patch Changes

- Updated dependencies [[`112a93a`](https://github.com/Effect-TS/effect/commit/112a93a9bab73e95e79f7b3502d1a7b1acd668fc)]:
  - @effect/rpc@0.64.1
  - @effect/cluster@0.41.2

## 0.42.1

### Patch Changes

- Updated dependencies [[`d5fd2c1`](https://github.com/Effect-TS/effect/commit/d5fd2c1526f06228853ed8317d9688c4af5f285a), [`9d189d7`](https://github.com/Effect-TS/effect/commit/9d189d744aa3307e055094c66f580453d95ff99d)]:
  - @effect/cluster@0.41.1

## 0.42.0

### Patch Changes

- [#5084](https://github.com/Effect-TS/effect/pull/5084) [`f90813f`](https://github.com/Effect-TS/effect/commit/f90813f7573329fbb8af11fc460d811d8788955a) Thanks @tim-smart! - correctly propagate fs.watch errors when the stat fails

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba), [`867919c`](https://github.com/Effect-TS/effect/commit/867919c8be9a2f770699c0db852a3f566017ffd6)]:
  - @effect/rpc@0.64.0
  - @effect/platform@0.87.0
  - @effect/cluster@0.41.0
  - @effect/sql@0.40.0

## 0.41.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0
  - @effect/cluster@0.40.0
  - @effect/rpc@0.63.0
  - @effect/sql@0.39.0

## 0.40.5

### Patch Changes

- Updated dependencies [[`ff90206`](https://github.com/Effect-TS/effect/commit/ff90206fc56f5c1eb1675603652462a83a27421d)]:
  - @effect/cluster@0.39.5

## 0.40.4

### Patch Changes

- Updated dependencies [[`a8d99b2`](https://github.com/Effect-TS/effect/commit/a8d99b2ec2f55d9aa6e7d00a5138e80380716877)]:
  - @effect/rpc@0.62.4
  - @effect/cluster@0.39.4

## 0.40.3

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2
  - @effect/cluster@0.39.3
  - @effect/rpc@0.62.3
  - @effect/sql@0.38.2

## 0.40.2

### Patch Changes

- Updated dependencies [[`ddfd1e4`](https://github.com/Effect-TS/effect/commit/ddfd1e43db60e3b779d18a221344423c5f3c7416)]:
  - @effect/rpc@0.62.2
  - @effect/cluster@0.39.2

## 0.40.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/cluster@0.39.1
  - @effect/platform@0.85.1
  - @effect/rpc@0.62.1
  - @effect/sql@0.38.1

## 0.40.0

### Patch Changes

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0
  - @effect/cluster@0.39.0
  - @effect/rpc@0.62.0
  - @effect/sql@0.38.0

## 0.39.16

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294), [`cbac1ac`](https://github.com/Effect-TS/effect/commit/cbac1ac61a4e15ad15828563b39eef412bcee66e)]:
  - effect@3.16.7
  - @effect/cluster@0.38.16
  - @effect/rpc@0.61.15
  - @effect/platform@0.84.11
  - @effect/sql@0.37.12

## 0.39.15

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/platform@0.84.10
  - @effect/cluster@0.38.15
  - @effect/rpc@0.61.14
  - @effect/sql@0.37.11

## 0.39.14

### Patch Changes

- Updated dependencies [[`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126), [`ee3a197`](https://github.com/Effect-TS/effect/commit/ee3a1973f54d7611ae99979edfed3020e94e1126)]:
  - @effect/rpc@0.61.13
  - @effect/cluster@0.38.14

## 0.39.13

### Patch Changes

- Updated dependencies [[`e0d3d42`](https://github.com/Effect-TS/effect/commit/e0d3d424d8f4e6a8ada017160406991f02b3c068)]:
  - @effect/rpc@0.61.12
  - @effect/cluster@0.38.13

## 0.39.12

### Patch Changes

- Updated dependencies [[`dca92fd`](https://github.com/Effect-TS/effect/commit/dca92fd8cf41f07561f55d863def5a9f62275f53)]:
  - @effect/cluster@0.38.12
  - @effect/rpc@0.61.11

## 0.39.11

### Patch Changes

- Updated dependencies [[`cc283b9`](https://github.com/Effect-TS/effect/commit/cc283b968235da3caf6c3e3a09b525fe09618fee)]:
  - @effect/cluster@0.38.11

## 0.39.10

### Patch Changes

- Updated dependencies [[`6e2e886`](https://github.com/Effect-TS/effect/commit/6e2e886f060c4ac057926b68d2e441c279480c30), [`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - @effect/cluster@0.38.10
  - effect@3.16.5
  - @effect/platform@0.84.9
  - @effect/rpc@0.61.10
  - @effect/sql@0.37.10

## 0.39.9

### Patch Changes

- Updated dependencies [[`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2), [`7bf6cb9`](https://github.com/Effect-TS/effect/commit/7bf6cb943810e403f472a901ed29ccbbf76a46b2)]:
  - @effect/rpc@0.61.9
  - @effect/cluster@0.38.9

## 0.39.8

### Patch Changes

- Updated dependencies []:
  - @effect/cluster@0.38.8

## 0.39.7

### Patch Changes

- Updated dependencies [[`22166f8`](https://github.com/Effect-TS/effect/commit/22166f80c677cad6b4719e0e0253a9d06f964626)]:
  - @effect/cluster@0.38.7

## 0.39.6

### Patch Changes

- [#4998](https://github.com/Effect-TS/effect/pull/4998) [`f8ff7dc`](https://github.com/Effect-TS/effect/commit/f8ff7dccfe6ebd3409ab95c57f61764643d19a2b) Thanks @tim-smart! - expose MessageStorage in cluster clientOnly layers

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8
  - @effect/cluster@0.38.6
  - @effect/rpc@0.61.8
  - @effect/sql@0.37.9

## 0.39.5

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/cluster@0.38.5
  - @effect/platform@0.84.7
  - @effect/rpc@0.61.7
  - @effect/sql@0.37.8

## 0.39.4

### Patch Changes

- Updated dependencies [[`7e59d0e`](https://github.com/Effect-TS/effect/commit/7e59d0e2e004d86b8d0778e99c6fcd173fcb682a)]:
  - @effect/cluster@0.38.4

## 0.39.3

### Patch Changes

- Updated dependencies [[`59575c5`](https://github.com/Effect-TS/effect/commit/59575c5bf17a32c8b76c42e3794222b20e766581)]:
  - @effect/cluster@0.38.3
  - @effect/sql@0.37.7

## 0.39.2

### Patch Changes

- Updated dependencies [[`d244b63`](https://github.com/Effect-TS/effect/commit/d244b6345ea1d2ac88812562b0c170683913d502), [`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/cluster@0.38.2
  - @effect/platform@0.84.6
  - @effect/rpc@0.61.6
  - @effect/sql@0.37.6

## 0.39.1

### Patch Changes

- Updated dependencies [[`612c739`](https://github.com/Effect-TS/effect/commit/612c73979abc44825feae573c8902b6484923aaa)]:
  - @effect/cluster@0.38.1

## 0.39.0

### Patch Changes

- Updated dependencies [[`3086405`](https://github.com/Effect-TS/effect/commit/308640563041004d790f08d2ba75cc3a85fdf752), [`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a), [`71e1e6c`](https://github.com/Effect-TS/effect/commit/71e1e6c535c11a3ec498540a3af3c1a313a5319b), [`d0067ca`](https://github.com/Effect-TS/effect/commit/d0067caef053b2855d93dcef59ea585d0fad9d8c), [`8c79abe`](https://github.com/Effect-TS/effect/commit/8c79abeb47d070d8880b652d31626497d3005a4e)]:
  - @effect/cluster@0.38.0
  - @effect/platform@0.84.5
  - @effect/rpc@0.61.5
  - @effect/sql@0.37.5

## 0.38.2

### Patch Changes

- Updated dependencies [[`6dfbae9`](https://github.com/Effect-TS/effect/commit/6dfbae946ea12ecee7234f5785335f3e7f8335b4)]:
  - @effect/cluster@0.37.2

## 0.38.1

### Patch Changes

- Updated dependencies []:
  - @effect/cluster@0.37.1

## 0.38.0

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f), [`a116aea`](https://github.com/Effect-TS/effect/commit/a116aeade97c83d8c96f17cdc5cf3b5a0bd9be74)]:
  - effect@3.16.3
  - @effect/rpc@0.61.4
  - @effect/cluster@0.37.0
  - @effect/platform@0.84.4
  - @effect/sql@0.37.4

## 0.37.3

### Patch Changes

- Updated dependencies [[`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e)]:
  - @effect/platform@0.84.3
  - @effect/cluster@0.36.3
  - @effect/rpc@0.61.3
  - @effect/sql@0.37.3

## 0.37.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897), [`a77afb1`](https://github.com/Effect-TS/effect/commit/a77afb1f7191a57a68b09fcdee5e9f27a0682b0a)]:
  - effect@3.16.2
  - @effect/rpc@0.61.2
  - @effect/cluster@0.36.2
  - @effect/platform@0.84.2
  - @effect/sql@0.37.2

## 0.37.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - @effect/platform@0.84.1
  - effect@3.16.1
  - @effect/cluster@0.36.1
  - @effect/rpc@0.61.1
  - @effect/sql@0.37.1

## 0.37.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/cluster@0.36.0
  - @effect/platform@0.84.0
  - @effect/rpc@0.61.0
  - @effect/sql@0.37.0

## 0.36.0

### Patch Changes

- Updated dependencies [[`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd), [`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - @effect/platform@0.83.0
  - effect@3.15.5
  - @effect/cluster@0.35.0
  - @effect/rpc@0.60.0
  - @effect/sql@0.36.0

## 0.35.5

### Patch Changes

- Updated dependencies [[`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524), [`58c5fd3`](https://github.com/Effect-TS/effect/commit/58c5fd3dd30eceb6c8afea90406768b0e348f48f)]:
  - @effect/platform@0.82.8
  - @effect/cluster@0.34.5
  - @effect/rpc@0.59.9
  - @effect/sql@0.35.8

## 0.35.4

### Patch Changes

- [#4921](https://github.com/Effect-TS/effect/pull/4921) [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6) Thanks @tim-smart! - update /platform dependencies

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561), [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6), [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2)]:
  - effect@3.15.4
  - @effect/platform@0.82.7
  - @effect/cluster@0.34.4
  - @effect/rpc@0.59.8
  - @effect/sql@0.35.7

## 0.35.3

### Patch Changes

- Updated dependencies [[`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36)]:
  - @effect/platform@0.82.6
  - @effect/cluster@0.34.3
  - @effect/rpc@0.59.7
  - @effect/sql@0.35.6

## 0.35.2

### Patch Changes

- Updated dependencies [[`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a), [`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a), [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7)]:
  - @effect/platform@0.82.5
  - effect@3.15.3
  - @effect/cluster@0.34.2
  - @effect/rpc@0.59.6
  - @effect/sql@0.35.5

## 0.35.1

### Patch Changes

- Updated dependencies [[`1627a02`](https://github.com/Effect-TS/effect/commit/1627a0299a07c3538ca15293f1ac3ffa7eeb45f3), [`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225), [`89657ac`](https://github.com/Effect-TS/effect/commit/89657ac2fbda9ba38ac2962ce96949e536a464f9), [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087)]:
  - @effect/cluster@0.34.1
  - @effect/platform@0.82.4
  - @effect/sql@0.35.4
  - @effect/rpc@0.59.5

## 0.35.0

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961), [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328), [`eaf8405`](https://github.com/Effect-TS/effect/commit/eaf8405ab9bb52423050eb0d23dd7d3c21c18141)]:
  - effect@3.15.2
  - @effect/platform@0.82.3
  - @effect/cluster@0.34.0
  - @effect/rpc@0.59.4
  - @effect/sql@0.35.3

## 0.34.3

### Patch Changes

- Updated dependencies [[`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc)]:
  - @effect/platform@0.82.2
  - @effect/cluster@0.33.3
  - @effect/rpc@0.59.3
  - @effect/sql@0.35.2

## 0.34.2

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/cluster@0.33.2
  - @effect/platform@0.82.1
  - @effect/rpc@0.59.2
  - @effect/sql@0.35.1

## 0.34.1

### Patch Changes

- Updated dependencies [[`6495440`](https://github.com/Effect-TS/effect/commit/64954405eb57313722023b87c0d92761980e2713)]:
  - @effect/rpc@0.59.1
  - @effect/cluster@0.33.1

## 0.34.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/platform@0.82.0
  - @effect/cluster@0.33.0
  - @effect/rpc@0.59.0
  - @effect/sql@0.35.0

## 0.33.0

### Patch Changes

- Updated dependencies [[`cd6cd0e`](https://github.com/Effect-TS/effect/commit/cd6cd0eacd6b09d6dd48b30b32edeb4a3c3075f9)]:
  - @effect/rpc@0.58.0
  - @effect/cluster@0.32.0

## 0.32.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/cluster@0.31.1
  - @effect/platform@0.81.1
  - @effect/rpc@0.57.1
  - @effect/sql@0.34.1

## 0.32.0

### Patch Changes

- Updated dependencies [[`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8)]:
  - @effect/platform@0.81.0
  - @effect/cluster@0.31.0
  - @effect/rpc@0.57.0
  - @effect/sql@0.34.0

## 0.31.11

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/cluster@0.30.11
  - @effect/platform@0.80.21
  - @effect/rpc@0.56.9
  - @effect/sql@0.33.21

## 0.31.10

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/cluster@0.30.10
  - @effect/platform@0.80.20
  - @effect/rpc@0.56.8
  - @effect/sql@0.33.20

## 0.31.9

### Patch Changes

- [#4827](https://github.com/Effect-TS/effect/pull/4827) [`114dad9`](https://github.com/Effect-TS/effect/commit/114dad9a93613986eb5d306cbcfda3fb37ec1a1b) Thanks @mlegenhausen! - Fix `StreamAdapter` error forwarding

- Updated dependencies [[`2d55bc5`](https://github.com/Effect-TS/effect/commit/2d55bc52c596afd8381f8ad1badc69efa0be8a78)]:
  - @effect/cluster@0.30.9

## 0.31.8

### Patch Changes

- Updated dependencies [[`1b30f61`](https://github.com/Effect-TS/effect/commit/1b30f616e75580933284657cb2cefab5a7903323)]:
  - @effect/cluster@0.30.8

## 0.31.7

### Patch Changes

- Updated dependencies [[`146af39`](https://github.com/Effect-TS/effect/commit/146af39d8d3b4e82aceb13de9749e6c4120c580b), [`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - @effect/cluster@0.30.7
  - effect@3.14.19
  - @effect/platform@0.80.19
  - @effect/rpc@0.56.7
  - @effect/sql@0.33.19

## 0.31.6

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/cluster@0.30.6
  - @effect/platform@0.80.18
  - @effect/rpc@0.56.6
  - @effect/sql@0.33.18

## 0.31.5

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/cluster@0.30.5
  - @effect/platform@0.80.17
  - @effect/rpc@0.56.5
  - @effect/sql@0.33.17

## 0.31.4

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495), [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a)]:
  - effect@3.14.16
  - @effect/platform@0.80.16
  - @effect/cluster@0.30.4
  - @effect/rpc@0.56.4
  - @effect/sql@0.33.16

## 0.31.3

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/cluster@0.30.3
  - @effect/platform@0.80.15
  - @effect/rpc@0.56.3
  - @effect/sql@0.33.15

## 0.31.2

### Patch Changes

- Updated dependencies [[`664293f`](https://github.com/Effect-TS/effect/commit/664293f975a282920a7208e966adaf4634c42ef4), [`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - @effect/cluster@0.30.2
  - effect@3.14.14
  - @effect/platform@0.80.14
  - @effect/rpc@0.56.2
  - @effect/sql@0.33.14

## 0.31.1

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/cluster@0.30.1
  - @effect/platform@0.80.13
  - @effect/rpc@0.56.1
  - @effect/sql@0.33.13

## 0.31.0

### Patch Changes

- Updated dependencies [[`d6e1156`](https://github.com/Effect-TS/effect/commit/d6e115617fc1a26a846b55f407965a330145dbee), [`2c66c16`](https://github.com/Effect-TS/effect/commit/2c66c16375dc2fe128f7b4e78c5f5c27c25c0d19)]:
  - @effect/rpc@0.56.0
  - @effect/cluster@0.30.0

## 0.30.22

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/cluster@0.29.22
  - @effect/platform@0.80.12
  - @effect/rpc@0.55.17
  - @effect/sql@0.33.12

## 0.30.21

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b), [`b5ad11e`](https://github.com/Effect-TS/effect/commit/b5ad11e511424c6d5c32e34e7ee9d04f0110617d)]:
  - effect@3.14.11
  - @effect/rpc@0.55.16
  - @effect/cluster@0.29.21
  - @effect/platform@0.80.11
  - @effect/sql@0.33.11

## 0.30.20

### Patch Changes

- Updated dependencies [[`d3df84e`](https://github.com/Effect-TS/effect/commit/d3df84e8af8e00a297e2329faeae625de0a95a71)]:
  - @effect/rpc@0.55.15
  - @effect/cluster@0.29.20

## 0.30.19

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/cluster@0.29.19
  - @effect/platform@0.80.10
  - @effect/rpc@0.55.14
  - @effect/sql@0.33.10

## 0.30.18

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/cluster@0.29.18
  - @effect/platform@0.80.9
  - @effect/rpc@0.55.13
  - @effect/sql@0.33.9

## 0.30.17

### Patch Changes

- Updated dependencies [[`58eaca9`](https://github.com/Effect-TS/effect/commit/58eaca9ef14032fc310f4a0e3c09513bac1cb50a)]:
  - @effect/rpc@0.55.12
  - @effect/cluster@0.29.17

## 0.30.16

### Patch Changes

- Updated dependencies [[`a79b732`](https://github.com/Effect-TS/effect/commit/a79b732bddea8bfca091c4fed0dd87aa0b1ab1f0), [`a79b732`](https://github.com/Effect-TS/effect/commit/a79b732bddea8bfca091c4fed0dd87aa0b1ab1f0)]:
  - @effect/cluster@0.29.16

## 0.30.15

### Patch Changes

- Updated dependencies [[`6966708`](https://github.com/Effect-TS/effect/commit/6966708a3061a3eb4bcfcb4d5877657fb41a019a)]:
  - @effect/cluster@0.29.15

## 0.30.14

### Patch Changes

- Updated dependencies [[`da21953`](https://github.com/Effect-TS/effect/commit/da21953a3831bf5974ab6add8fcc7fad1c0ba472)]:
  - @effect/cluster@0.29.14

## 0.30.13

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378), [`896fbbf`](https://github.com/Effect-TS/effect/commit/896fbbf6ed6c11e099747e8aafb67b28edc4e466)]:
  - effect@3.14.8
  - @effect/cluster@0.29.13
  - @effect/platform@0.80.8
  - @effect/rpc@0.55.11
  - @effect/sql@0.33.8

## 0.30.12

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7
  - @effect/cluster@0.29.12
  - @effect/platform@0.80.7
  - @effect/rpc@0.55.10
  - @effect/sql@0.33.7

## 0.30.11

### Patch Changes

- Updated dependencies [[`a1d4673`](https://github.com/Effect-TS/effect/commit/a1d4673a423dfed050c0a762664d9d64002cfa90)]:
  - @effect/rpc@0.55.9
  - @effect/cluster@0.29.11

## 0.30.10

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6
  - @effect/cluster@0.29.10
  - @effect/platform@0.80.6
  - @effect/rpc@0.55.8
  - @effect/sql@0.33.6

## 0.30.9

### Patch Changes

- Updated dependencies [[`4414042`](https://github.com/Effect-TS/effect/commit/44140423a2fb185f92f7db4d5b383f9b62a97bf9)]:
  - @effect/rpc@0.55.7
  - @effect/cluster@0.29.9

## 0.30.8

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`85fba81`](https://github.com/Effect-TS/effect/commit/85fba815ac07eb13d4227a69ac76a18e4b94df18), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5
  - @effect/platform@0.80.5
  - @effect/cluster@0.29.8
  - @effect/rpc@0.55.6
  - @effect/sql@0.33.5

## 0.30.7

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef), [`e3e5873`](https://github.com/Effect-TS/effect/commit/e3e5873f30080bb0e5eed8a876170acaa6ed47ff), [`26c060c`](https://github.com/Effect-TS/effect/commit/26c060c65914a623220a20356991784f974bfe18)]:
  - effect@3.14.4
  - @effect/rpc@0.55.5
  - @effect/cluster@0.29.7
  - @effect/platform@0.80.4
  - @effect/sql@0.33.4

## 0.30.6

### Patch Changes

- Updated dependencies [[`0ec5e03`](https://github.com/Effect-TS/effect/commit/0ec5e0353a1db5d27c3500deba0df61001258e76), [`05c4d77`](https://github.com/Effect-TS/effect/commit/05c4d772acc42b7425add7b22f914c5ee3ff84bd), [`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - @effect/rpc@0.55.4
  - effect@3.14.3
  - @effect/cluster@0.29.6
  - @effect/platform@0.80.3
  - @effect/sql@0.33.3

## 0.30.5

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2
  - @effect/cluster@0.29.5
  - @effect/platform@0.80.2
  - @effect/rpc@0.55.3
  - @effect/sql@0.33.2

## 0.30.4

### Patch Changes

- Updated dependencies [[`d2f11e5`](https://github.com/Effect-TS/effect/commit/d2f11e557de4639762124951252170fbf4d7c906)]:
  - @effect/rpc@0.55.2
  - @effect/cluster@0.29.4

## 0.30.3

### Patch Changes

- Updated dependencies [[`18a7936`](https://github.com/Effect-TS/effect/commit/18a7936832158daa69e3c09a6caae55e3d6c0b86)]:
  - @effect/cluster@0.29.3

## 0.30.2

### Patch Changes

- Updated dependencies [[`3a99a2d`](https://github.com/Effect-TS/effect/commit/3a99a2dbaa38348c1f6e210a531fcfb99b5e73c5)]:
  - @effect/cluster@0.29.2

## 0.30.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c), [`814733f`](https://github.com/Effect-TS/effect/commit/814733fe62bb3dc91c6cd632d16a8d2076b3755b)]:
  - effect@3.14.1
  - @effect/cluster@0.29.1
  - @effect/platform@0.80.1
  - @effect/rpc@0.55.1
  - @effect/sql@0.33.1

## 0.30.0

### Minor Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c) Thanks @tim-smart! - refactor of @effect/cluster packages

### Patch Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce) Thanks @tim-smart! - Move SocketServer modules to @effect/platform

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0
  - @effect/platform@0.80.0
  - @effect/cluster@0.29.0
  - @effect/rpc@0.55.0
  - @effect/sql@0.33.0

## 0.29.4

### Patch Changes

- Updated dependencies [[`5662363`](https://github.com/Effect-TS/effect/commit/566236361e270e575ef1cbf308ad1967c82a362c), [`5f1fd15`](https://github.com/Effect-TS/effect/commit/5f1fd15308ab154791580059b89877d19a2055c2), [`8bb1460`](https://github.com/Effect-TS/effect/commit/8bb1460c824f66f0f25ebd899c5e74e388089c37)]:
  - @effect/platform@0.79.4

## 0.29.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12
  - @effect/platform@0.79.3

## 0.29.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11
  - @effect/platform@0.79.2

## 0.29.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10
  - @effect/platform@0.79.1

## 0.29.0

### Patch Changes

- Updated dependencies [[`88fe129`](https://github.com/Effect-TS/effect/commit/88fe12923740765c0335a6e6203fdcc6a463edca), [`d630249`](https://github.com/Effect-TS/effect/commit/d630249426113088abe8b382db4f14d80f2160c2), [`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - @effect/platform@0.79.0
  - effect@3.13.9

## 0.28.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8
  - @effect/platform@0.78.1

## 0.28.0

### Patch Changes

- [#4560](https://github.com/Effect-TS/effect/pull/4560) [`6cd4a10`](https://github.com/Effect-TS/effect/commit/6cd4a102f5d8e88c313dfa75c039617e8831b70e) Thanks @tim-smart! - ensure empty Chunk's don't cause NodeStream.toReadable to hang

- Updated dependencies [[`c5bcf53`](https://github.com/Effect-TS/effect/commit/c5bcf53b7cb49dacffdd2a6cd8eb48cc452b417e)]:
  - @effect/platform@0.78.0

## 0.27.7

### Patch Changes

- [#4558](https://github.com/Effect-TS/effect/pull/4558) [`05306d5`](https://github.com/Effect-TS/effect/commit/05306d5cc55b94a23c175de798fc6a5e93a3ab74) Thanks @tim-smart! - refactor NodeStream.toReadable

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64), [`f910880`](https://github.com/Effect-TS/effect/commit/f91088069057f3b4529753f5bc5532b028d726df), [`0d01480`](https://github.com/Effect-TS/effect/commit/0d014803e4f688f74386a80abd65485e1a319244)]:
  - @effect/platform@0.77.7
  - effect@3.13.7

## 0.27.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6
  - @effect/platform@0.77.6

## 0.27.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5
  - @effect/platform@0.77.5

## 0.27.4

### Patch Changes

- Updated dependencies [[`e0746f9`](https://github.com/Effect-TS/effect/commit/e0746f9aa398b69c6542e375910683bf17f49f46), [`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - @effect/platform@0.77.4
  - effect@3.13.4

## 0.27.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3
  - @effect/platform@0.77.3

## 0.27.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f), [`3e7ce97`](https://github.com/Effect-TS/effect/commit/3e7ce97f8a41756a039cf635d0b3d9a75d781097), [`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/platform@0.77.2

## 0.27.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1
  - @effect/platform@0.77.1

## 0.27.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0
  - @effect/platform@0.77.0

## 0.26.1

### Patch Changes

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`c407726`](https://github.com/Effect-TS/effect/commit/c407726f79df4a567a9631cddd8effaa16b3535d), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12
  - @effect/platform@0.76.1

## 0.26.0

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e), [`2473ad5`](https://github.com/Effect-TS/effect/commit/2473ad5cf23582e3a41338091fa526ffe611288d)]:
  - effect@3.12.11
  - @effect/platform@0.76.0

## 0.25.4

### Patch Changes

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`7d57ecd`](https://github.com/Effect-TS/effect/commit/7d57ecdaf5da2345ebbf9c22df50317578bde0f5), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10
  - @effect/platform@0.75.4

## 0.25.3

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9
  - @effect/platform@0.75.3

## 0.25.2

### Patch Changes

- [#4345](https://github.com/Effect-TS/effect/pull/4345) [`c9175ae`](https://github.com/Effect-TS/effect/commit/c9175aef41cb1e3b689d0ac0a4f53d8107376b58) Thanks @ethanniser! - Addition of `sync` property to `FileSystem.File` representing the `fsync` syscall.

- Updated dependencies [[`59b3cfb`](https://github.com/Effect-TS/effect/commit/59b3cfbbd5713dd9475998e95fad5534c0b21466), [`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`bb05fb8`](https://github.com/Effect-TS/effect/commit/bb05fb83457355b1ca567228a9e041edfb6fd85d), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`8f6006a`](https://github.com/Effect-TS/effect/commit/8f6006a610fb6d6c7b8d14209a7323338a8964ff), [`c45b559`](https://github.com/Effect-TS/effect/commit/c45b5592b5fd1189a5c932cfe05bd7d5f6d68508), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`c9175ae`](https://github.com/Effect-TS/effect/commit/c9175aef41cb1e3b689d0ac0a4f53d8107376b58), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - @effect/platform@0.75.2
  - effect@3.12.8

## 0.25.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7
  - @effect/platform@0.75.1

## 0.25.0

### Patch Changes

- Updated dependencies [[`5e43ce5`](https://github.com/Effect-TS/effect/commit/5e43ce50bae116865906112e7f88d390739d778b), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`76eb7d0`](https://github.com/Effect-TS/effect/commit/76eb7d0fbce3c009c8f77e84c178cb15bbed9709), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`eb264ed`](https://github.com/Effect-TS/effect/commit/eb264ed8a6e8c92a9dc7006f766c6ca2e5d29e03), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - @effect/platform@0.75.0
  - effect@3.12.6

## 0.24.0

### Patch Changes

- Updated dependencies [[`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8653072`](https://github.com/Effect-TS/effect/commit/86530720d7a03e118d2c5a8bf5a997cee7e7f3d6), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e)]:
  - effect@3.12.5
  - @effect/platform@0.74.0

## 0.23.1

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718), [`c9e5e1b`](https://github.com/Effect-TS/effect/commit/c9e5e1be17c0c84d3d4e2abc3c60215cdb56bbbe), [`7b3d58d`](https://github.com/Effect-TS/effect/commit/7b3d58d7aec2152ec282460871d3e9de45ed254d)]:
  - effect@3.12.4
  - @effect/platform@0.73.1

## 0.23.0

### Patch Changes

- [#4242](https://github.com/Effect-TS/effect/pull/4242) [`c1a0339`](https://github.com/Effect-TS/effect/commit/c1a0339034a291fd4463371afbcfc8adcf8994ae) Thanks @fubhy! - Add missing exports

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`c110032`](https://github.com/Effect-TS/effect/commit/c110032322450a8824ba38ae24335a538cd2ce9a), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`23ac740`](https://github.com/Effect-TS/effect/commit/23ac740c7dd4610b7d265c2071b88b0968419e9a), [`8cd7319`](https://github.com/Effect-TS/effect/commit/8cd7319b6568bfc7a30ca16c104d189e37eac3a0)]:
  - effect@3.12.3
  - @effect/platform@0.73.0

## 0.22.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`f852cb0`](https://github.com/Effect-TS/effect/commit/f852cb02040ea2f165e9b449615b8b1366add5d5), [`7276ae2`](https://github.com/Effect-TS/effect/commit/7276ae21062896adbb7508ac5b2dece95316322f), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2
  - @effect/platform@0.72.2

## 0.22.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1
  - @effect/platform@0.72.1

## 0.22.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`ef64c6f`](https://github.com/Effect-TS/effect/commit/ef64c6fec0d47da573c04230dde9ea729366d871), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0
  - @effect/platform@0.72.0

## 0.21.7

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10
  - @effect/platform@0.71.7

## 0.21.6

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9
  - @effect/platform@0.71.6

## 0.21.5

### Patch Changes

- Updated dependencies [[`05d71f8`](https://github.com/Effect-TS/effect/commit/05d71f85622305705d8316817694a09762e60865), [`e66b920`](https://github.com/Effect-TS/effect/commit/e66b9205f25ab425d30640886eb3fb2c4715bc26)]:
  - @effect/platform@0.71.5

## 0.21.4

### Patch Changes

- Updated dependencies [[`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - @effect/platform@0.71.4
  - effect@3.11.8

## 0.21.3

### Patch Changes

- Updated dependencies [[`6984508`](https://github.com/Effect-TS/effect/commit/6984508c87f1bd91213b44c19b25ab5e2dcc1ce0), [`883639c`](https://github.com/Effect-TS/effect/commit/883639cc8ce47757f1cd39439391a8028c0812fe)]:
  - @effect/platform@0.71.3

## 0.21.2

### Patch Changes

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7
  - @effect/platform@0.71.2

## 0.21.1

### Patch Changes

- Updated dependencies [[`1d3df5b`](https://github.com/Effect-TS/effect/commit/1d3df5bc4324e88a392c348db35fd9d029c7b25e)]:
  - @effect/platform@0.71.1

## 0.21.0

### Patch Changes

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`11fc401`](https://github.com/Effect-TS/effect/commit/11fc401f436f99bf4be95f56d50b0e4bdfe5edea), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6
  - @effect/platform@0.71.0

## 0.20.7

### Patch Changes

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5
  - @effect/platform@0.70.7

## 0.20.6

### Patch Changes

- Updated dependencies [[`9a5b8e3`](https://github.com/Effect-TS/effect/commit/9a5b8e36d184bd4967a88752cb6e755e1be263af)]:
  - @effect/platform@0.70.6

## 0.20.5

### Patch Changes

- [#4087](https://github.com/Effect-TS/effect/pull/4087) [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2) Thanks @tim-smart! - remove Socket write indirection

- Updated dependencies [[`415f4c9`](https://github.com/Effect-TS/effect/commit/415f4c98321868531727a83cbaad70164f5e4c40), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - @effect/platform@0.70.5
  - effect@3.11.4

## 0.20.4

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3
  - @effect/platform@0.70.4

## 0.20.3

### Patch Changes

- Updated dependencies [[`7044730`](https://github.com/Effect-TS/effect/commit/70447306be1aeeb7d87c230b2a96ec87b993ede9)]:
  - @effect/platform@0.70.3

## 0.20.2

### Patch Changes

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41), [`c2249ea`](https://github.com/Effect-TS/effect/commit/c2249ea13fd98ab7d9aa628787931356d8ec2860), [`1358aa5`](https://github.com/Effect-TS/effect/commit/1358aa5326eaa85ef13ee8d1fed0b4a4288ed3eb), [`1de3fe7`](https://github.com/Effect-TS/effect/commit/1de3fe7d1cbafd6391eaa38c2300b99e332cc2aa)]:
  - effect@3.11.2
  - @effect/platform@0.70.2

## 0.20.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1
  - @effect/platform@0.70.1

## 0.20.0

### Patch Changes

- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`672bde5`](https://github.com/Effect-TS/effect/commit/672bde5bec51c7d6f9862828e6a654cb2cb6f93d), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0
  - @effect/platform@0.70.0

## 0.19.33

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20
  - @effect/platform@0.69.32

## 0.19.32

### Patch Changes

- Updated dependencies [[`e6d4a37`](https://github.com/Effect-TS/effect/commit/e6d4a37c1d7e657b5ea44063a1cf586808228fe5)]:
  - @effect/platform@0.69.31

## 0.19.31

### Patch Changes

- Updated dependencies [[`270f199`](https://github.com/Effect-TS/effect/commit/270f199b31810fd643e4c22818698adcbdb5d396)]:
  - @effect/platform@0.69.30

## 0.19.30

### Patch Changes

- Updated dependencies [[`24cc35e`](https://github.com/Effect-TS/effect/commit/24cc35e26d6ed4a076470bc687ffd99cc50991b3)]:
  - @effect/platform@0.69.29

## 0.19.29

### Patch Changes

- Updated dependencies [[`edd72be`](https://github.com/Effect-TS/effect/commit/edd72be57b904d60c9cbffc2537901821a9da537), [`a3e2771`](https://github.com/Effect-TS/effect/commit/a3e277170a1f7cf61fd629acb60304c7e81d9498), [`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7), [`a9e00e4`](https://github.com/Effect-TS/effect/commit/a9e00e43f0b5dd22c1f9d5b78be6383daea09c20)]:
  - @effect/platform@0.69.28
  - effect@3.10.19

## 0.19.28

### Patch Changes

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de), [`beaccae`](https://github.com/Effect-TS/effect/commit/beaccae2d15931e9fe475fb50a0b3638243fe3f7)]:
  - effect@3.10.18
  - @effect/platform@0.69.27

## 0.19.27

### Patch Changes

- Updated dependencies [[`c963886`](https://github.com/Effect-TS/effect/commit/c963886d5817986fcbd6bfa4ddf50aca8b6c8184), [`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - @effect/platform@0.69.26
  - effect@3.10.17

## 0.19.26

### Patch Changes

- Updated dependencies [[`320557a`](https://github.com/Effect-TS/effect/commit/320557ab18d13c5e22fc7dc0d2a157eae461012f), [`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232), [`7b93dd6`](https://github.com/Effect-TS/effect/commit/7b93dd622e2ab79c7072d79d0d9611e446202201)]:
  - @effect/platform@0.69.25
  - effect@3.10.16

## 0.19.25

### Patch Changes

- Updated dependencies [[`3cc6514`](https://github.com/Effect-TS/effect/commit/3cc6514d2dd64e010cb760cc29bfce98c349bb10)]:
  - @effect/platform@0.69.24

## 0.19.24

### Patch Changes

- Updated dependencies [[`3aff4d3`](https://github.com/Effect-TS/effect/commit/3aff4d38837c213bb2987973dc4b98febb9f92d2)]:
  - @effect/platform@0.69.23

## 0.19.23

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15
  - @effect/platform@0.69.22

## 0.19.22

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14
  - @effect/platform@0.69.21

## 0.19.21

### Patch Changes

- Updated dependencies [[`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - effect@3.10.13
  - @effect/platform@0.69.20

## 0.19.20

### Patch Changes

- Updated dependencies [[`eb8c52d`](https://github.com/Effect-TS/effect/commit/eb8c52d8b4c5e067ebf0a81eb742f5822e6439b5)]:
  - @effect/platform@0.69.19

## 0.19.19

### Patch Changes

- [#3906](https://github.com/Effect-TS/effect/pull/3906) [`a0584ec`](https://github.com/Effect-TS/effect/commit/a0584ece92ed784bfb139e9c5a699f02d1e71c2d) Thanks @tim-smart! - ensure Socket send queue is not ended

- Updated dependencies [[`a0584ec`](https://github.com/Effect-TS/effect/commit/a0584ece92ed784bfb139e9c5a699f02d1e71c2d), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - @effect/platform@0.69.18
  - effect@3.10.12

## 0.19.18

### Patch Changes

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a), [`8240b1c`](https://github.com/Effect-TS/effect/commit/8240b1c10d45312fc863cb679b1a1e8441af0c1a), [`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11
  - @effect/platform@0.69.17

## 0.19.17

### Patch Changes

- [#3894](https://github.com/Effect-TS/effect/pull/3894) [`3ff8e5b`](https://github.com/Effect-TS/effect/commit/3ff8e5b4138c89b56111c075b290e4084d7d169c) Thanks @tim-smart! - remove debug logging from NodeSocket

## 0.19.16

### Patch Changes

- [#3893](https://github.com/Effect-TS/effect/pull/3893) [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28) Thanks @tim-smart! - refactor Socket internal code

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6), [`7d89650`](https://github.com/Effect-TS/effect/commit/7d8965036cd2ea435c8441ffec3345488baebf85)]:
  - effect@3.10.10
  - @effect/platform@0.69.16

## 0.19.15

### Patch Changes

- Updated dependencies [[`8a30e1d`](https://github.com/Effect-TS/effect/commit/8a30e1dfa3a7103bf5414fc6a7fca3088d8c8c00)]:
  - @effect/platform@0.69.15

## 0.19.14

### Patch Changes

- [#3882](https://github.com/Effect-TS/effect/pull/3882) [`257ab1b`](https://github.com/Effect-TS/effect/commit/257ab1b539fa6e930b7ae2583a188376372200d7) Thanks @tim-smart! - simplify Socket internal code

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`07c493a`](https://github.com/Effect-TS/effect/commit/07c493a598e096c7810cd06def8cfa43493c46b1), [`257ab1b`](https://github.com/Effect-TS/effect/commit/257ab1b539fa6e930b7ae2583a188376372200d7), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9
  - @effect/platform@0.69.14

## 0.19.13

### Patch Changes

- Updated dependencies [[`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - effect@3.10.8
  - @effect/platform@0.69.13

## 0.19.12

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7
  - @effect/platform@0.69.12

## 0.19.11

### Patch Changes

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552), [`81ddd45`](https://github.com/Effect-TS/effect/commit/81ddd45fc074b98206fafab416d9a5a28b31e07a)]:
  - effect@3.10.6
  - @effect/platform@0.69.11

## 0.19.10

### Patch Changes

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5
  - @effect/platform@0.69.10

## 0.19.9

### Patch Changes

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - @effect/platform@0.69.9
  - effect@3.10.4

## 0.19.8

### Patch Changes

- Updated dependencies [[`522f7c5`](https://github.com/Effect-TS/effect/commit/522f7c518a5acfb55ef96d6796869f002cc3eaf8)]:
  - @effect/platform@0.69.8

## 0.19.7

### Patch Changes

- Updated dependencies [[`690d6c5`](https://github.com/Effect-TS/effect/commit/690d6c54d2145adb0af545c447db7d4755bf3c6b), [`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5), [`279fe3a`](https://github.com/Effect-TS/effect/commit/279fe3a7168fe84e520c2cc88ba189a15f03a2bc)]:
  - @effect/platform@0.69.7
  - effect@3.10.3

## 0.19.6

### Patch Changes

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37), [`42cd72a`](https://github.com/Effect-TS/effect/commit/42cd72a44ca9593e4d81fbb50e8111625fd0fb81)]:
  - effect@3.10.2
  - @effect/platform@0.69.6

## 0.19.5

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - effect@3.10.1
  - @effect/platform@0.69.5

## 0.19.4

### Patch Changes

- Updated dependencies [[`c86b1d7`](https://github.com/Effect-TS/effect/commit/c86b1d7cd47b66df190ef9775a475467c1abdbd6)]:
  - @effect/platform@0.69.4

## 0.19.3

### Patch Changes

- Updated dependencies [[`d5fba63`](https://github.com/Effect-TS/effect/commit/d5fba6391e1005e374aa0238f13edfbd65848313), [`1eb2c30`](https://github.com/Effect-TS/effect/commit/1eb2c30ba064398db5790e376dedcfad55b7b005), [`02d413e`](https://github.com/Effect-TS/effect/commit/02d413e7b6bc1c64885969c37cc3e4e690c94d7d)]:
  - @effect/platform@0.69.3

## 0.19.2

### Patch Changes

- Updated dependencies [[`e7afc47`](https://github.com/Effect-TS/effect/commit/e7afc47ce83e381c3f4aed2b2974e3b3d86a2340)]:
  - @effect/platform@0.69.2

## 0.19.1

### Patch Changes

- Updated dependencies [[`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8), [`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8)]:
  - @effect/platform@0.69.1

## 0.19.0

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`6d9de6b`](https://github.com/Effect-TS/effect/commit/6d9de6b871c5c08e6509a4e830c3d74758faa198), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0
  - @effect/platform@0.69.0

## 0.18.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.68.6

## 0.18.5

### Patch Changes

- Updated dependencies [[`2036402`](https://github.com/Effect-TS/effect/commit/20364020b8b75a684791aa93d90626758023e9e9)]:
  - @effect/platform@0.68.5

## 0.18.4

### Patch Changes

- Updated dependencies [[`1b1ef29`](https://github.com/Effect-TS/effect/commit/1b1ef29ae302322f69dc938f9337aa97b4c63266)]:
  - @effect/platform@0.68.4

## 0.18.3

### Patch Changes

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d), [`8c33087`](https://github.com/Effect-TS/effect/commit/8c330879425e80bed2f65e407cd59e991f0d7bec)]:
  - effect@3.9.2
  - @effect/platform@0.68.3

## 0.18.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.68.2

## 0.18.1

### Patch Changes

- Updated dependencies [[`b75ac5d`](https://github.com/Effect-TS/effect/commit/b75ac5d0909115507bedc90f18f2d34deb217769)]:
  - @effect/platform@0.68.1

## 0.18.0

### Patch Changes

- Updated dependencies [[`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363)]:
  - @effect/platform@0.68.0

## 0.17.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - @effect/platform@0.67.1
  - effect@3.9.1

## 0.17.0

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/platform@0.67.0

## 0.16.4

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`8e94585`](https://github.com/Effect-TS/effect/commit/8e94585abe62753bf3af28bfae77926a7c570ac3), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/platform@0.66.3

## 0.16.3

### Patch Changes

- [#3679](https://github.com/Effect-TS/effect/pull/3679) [`660cd0f`](https://github.com/Effect-TS/effect/commit/660cd0f93610e5e5588f25b852ae7cf4f1dd05bc) Thanks @tim-smart! - add support for watch mode in .runMain

## 0.16.2

### Patch Changes

- Updated dependencies [[`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/platform@0.66.2
  - effect@3.8.4

## 0.16.1

### Patch Changes

- [#3666](https://github.com/Effect-TS/effect/pull/3666) [`0e0af6d`](https://github.com/Effect-TS/effect/commit/0e0af6d6593d041bd2cdbced9fdaf8265ce166f2) Thanks @tim-smart! - revert #3656

- Updated dependencies [[`3812788`](https://github.com/Effect-TS/effect/commit/3812788d79caaab8f559a62fd443018a04ac5647)]:
  - @effect/platform@0.66.1

## 0.16.0

### Patch Changes

- [#3656](https://github.com/Effect-TS/effect/pull/3656) [`6d4d861`](https://github.com/Effect-TS/effect/commit/6d4d861db6860846da4ac0a25eaf41ced90eb97a) Thanks @tim-smart! - only call process.exit in runMain if signal has been intercepted

- Updated dependencies []:
  - @effect/platform@0.66.0

## 0.15.5

### Patch Changes

- Updated dependencies [[`321b201`](https://github.com/Effect-TS/effect/commit/321b201adcb6bbbeb806b3467dd0b4cf063ccda8), [`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - @effect/platform@0.65.5
  - effect@3.8.3

## 0.15.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.65.4

## 0.15.3

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2
  - @effect/platform@0.65.3

## 0.15.2

### Patch Changes

- [#3616](https://github.com/Effect-TS/effect/pull/3616) [`cd75658`](https://github.com/Effect-TS/effect/commit/cd756584c352064cb1654be7118a925d57475d49) Thanks @tim-smart! - use Mailbox for NodeStream module

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1
  - @effect/platform@0.65.2

## 0.15.1

### Patch Changes

- Updated dependencies [[`e44c5f2`](https://github.com/Effect-TS/effect/commit/e44c5f228215738fe4e75023c7461bf9521249cb)]:
  - @effect/platform@0.65.1

## 0.15.0

### Patch Changes

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`6a128f6`](https://github.com/Effect-TS/effect/commit/6a128f63f9b41fec2db70790b3bbb96cb9afa1ab), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`7041393`](https://github.com/Effect-TS/effect/commit/7041393cff132e96566d3f36da0483a6ff6195e4), [`e0d21a5`](https://github.com/Effect-TS/effect/commit/e0d21a54c8323728fbb75a32f4820a9996257809), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0
  - @effect/platform@0.65.0

## 0.14.1

### Patch Changes

- Updated dependencies [[`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be), [`8261c5a`](https://github.com/Effect-TS/effect/commit/8261c5ae6fe86872292ec1fc1a58ab9cea2f5f51)]:
  - effect@3.7.3
  - @effect/platform@0.64.1

## 0.14.0

### Minor Changes

- [#3565](https://github.com/Effect-TS/effect/pull/3565) [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a) Thanks @tim-smart! - move Etag implementation to /platform

### Patch Changes

- Updated dependencies [[`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9)]:
  - @effect/platform@0.64.0

## 0.13.3

### Patch Changes

- [#3555](https://github.com/Effect-TS/effect/pull/3555) [`64c2292`](https://github.com/Effect-TS/effect/commit/64c22927aa01e0159b0fa98ff55e742069af399c) Thanks @tim-smart! - leave node stream listeners attached to prevent unhandled errors

- Updated dependencies [[`4a701c4`](https://github.com/Effect-TS/effect/commit/4a701c406da032563fedae459536c00ae5cfe3c7)]:
  - @effect/platform@0.63.3

## 0.13.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2
  - @effect/platform@0.63.2

## 0.13.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1
  - @effect/platform@0.63.1

## 0.13.0

### Patch Changes

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0
  - @effect/platform@0.63.0

## 0.12.5

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8
  - @effect/platform@0.62.5

## 0.12.4

### Patch Changes

- [#3506](https://github.com/Effect-TS/effect/pull/3506) [`e7a65e3`](https://github.com/Effect-TS/effect/commit/e7a65e3c6a08636bbfce3d3af3098bf28474364d) Thanks @tim-smart! - use Logger.pretty for runMain, and support dual usage

- Updated dependencies [[`e7a65e3`](https://github.com/Effect-TS/effect/commit/e7a65e3c6a08636bbfce3d3af3098bf28474364d), [`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - @effect/platform@0.62.4
  - effect@3.6.7

## 0.12.3

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6
  - @effect/platform@0.62.3

## 0.12.2

### Patch Changes

- Updated dependencies [[`413994c`](https://github.com/Effect-TS/effect/commit/413994c9792f16d9d57cca3ae6eb254bf93bd261), [`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae)]:
  - @effect/platform@0.62.2
  - effect@3.6.5

## 0.12.1

### Patch Changes

- Updated dependencies [[`9efe0e5`](https://github.com/Effect-TS/effect/commit/9efe0e5b57ac557399be620822c21cc6e9add285)]:
  - @effect/platform@0.62.1

## 0.12.0

### Patch Changes

- [#3450](https://github.com/Effect-TS/effect/pull/3450) [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4)]:
  - effect@3.6.4
  - @effect/platform@0.62.0

## 0.11.8

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/platform@0.61.8

## 0.11.7

### Patch Changes

- Updated dependencies [[`17245a4`](https://github.com/Effect-TS/effect/commit/17245a4e783c19dee51529600b3b40f164fa59bc), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09)]:
  - @effect/platform@0.61.7

## 0.11.6

### Patch Changes

- Updated dependencies [[`d829b57`](https://github.com/Effect-TS/effect/commit/d829b576357f2e3b203ab7e107a1492de903a106), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/platform@0.61.6
  - effect@3.6.2

## 0.11.5

### Patch Changes

- Updated dependencies [[`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38)]:
  - @effect/platform@0.61.5

## 0.11.4

### Patch Changes

- Updated dependencies [[`e7cb109`](https://github.com/Effect-TS/effect/commit/e7cb109d0754207024a64d55b6bd2a674dd8ed7d)]:
  - @effect/platform@0.61.4

## 0.11.3

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`fb9f786`](https://github.com/Effect-TS/effect/commit/fb9f7867f0c895e63f9ef23e8d0941248c42179d), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/platform@0.61.3

## 0.11.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.61.2

## 0.11.1

### Patch Changes

- Updated dependencies [[`11223bf`](https://github.com/Effect-TS/effect/commit/11223bf9cbf5b822e0bf9a9fb2b35b2ad88af692)]:
  - @effect/platform@0.61.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/platform@0.61.0

## 0.10.3

### Patch Changes

- Updated dependencies [[`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - effect@3.5.9
  - @effect/platform@0.60.3

## 0.10.2

### Patch Changes

- Updated dependencies [[`eb4d014`](https://github.com/Effect-TS/effect/commit/eb4d014c559e1b4c95b3fb9295fe77593c17ed7a), [`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231), [`fc20f73`](https://github.com/Effect-TS/effect/commit/fc20f73c69e577981cb64714de2adc97e1004dae)]:
  - @effect/platform@0.60.2
  - effect@3.5.8

## 0.10.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.1

## 0.10.0

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.0

## 0.9.3

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc)]:
  - effect@3.5.7
  - @effect/platform@0.59.3

## 0.9.2

### Patch Changes

- Updated dependencies [[`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - effect@3.5.6
  - @effect/platform@0.59.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39), [`fcecff7`](https://github.com/Effect-TS/effect/commit/fcecff7f7e12b295a252f124861b801c73072151), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65)]:
  - effect@3.5.5
  - @effect/platform@0.59.1

## 0.9.0

### Minor Changes

- [#3260](https://github.com/Effect-TS/effect/pull/3260) [`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c) Thanks @tim-smart! - replace /platform RefailError with use of the "cause" property

### Patch Changes

- [#3253](https://github.com/Effect-TS/effect/pull/3253) [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c), [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - @effect/platform@0.59.0
  - effect@3.5.4

## 0.8.26

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`a1db40a`](https://github.com/Effect-TS/effect/commit/a1db40a650ab842e778654f0d88e80f2ef4fd6f3), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/platform@0.58.27

## 0.8.25

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/platform@0.58.26

## 0.8.24

### Patch Changes

- Updated dependencies [[`0623fca`](https://github.com/Effect-TS/effect/commit/0623fca41679b0e3c5a10dd0f8985f91670bd721)]:
  - @effect/platform@0.58.25

## 0.8.23

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/platform@0.58.24

## 0.8.22

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/platform@0.58.23

## 0.8.21

### Patch Changes

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9
  - @effect/platform@0.58.22

## 0.8.20

### Patch Changes

- Updated dependencies [[`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c)]:
  - effect@3.4.8
  - @effect/platform@0.58.21

## 0.8.19

### Patch Changes

- Updated dependencies [[`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - effect@3.4.7
  - @effect/platform@0.58.20

## 0.8.18

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.19

## 0.8.17

### Patch Changes

- Updated dependencies [[`7f8900a`](https://github.com/Effect-TS/effect/commit/7f8900a1de9addeb0d371103a2c5c2aa3e4ff95e)]:
  - @effect/platform@0.58.18

## 0.8.16

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6
  - @effect/platform@0.58.17

## 0.8.15

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.16

## 0.8.14

### Patch Changes

- Updated dependencies [[`baa90df`](https://github.com/Effect-TS/effect/commit/baa90df9663f5f37d7b6814dad25142d53dbc720)]:
  - @effect/platform@0.58.15

## 0.8.13

### Patch Changes

- Updated dependencies [[`52a87c7`](https://github.com/Effect-TS/effect/commit/52a87c7a0b9536398deaf8ec507e53a82c607219), [`6d2280e`](https://github.com/Effect-TS/effect/commit/6d2280e9497c95cb0e965ca462c825345074eedf)]:
  - @effect/platform@0.58.14

## 0.8.12

### Patch Changes

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91), [`dbd53ea`](https://github.com/Effect-TS/effect/commit/dbd53ea363c71a24449cb068251054c3a1acf864)]:
  - effect@3.4.5
  - @effect/platform@0.58.13

## 0.8.11

### Patch Changes

- Updated dependencies [[`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c)]:
  - @effect/platform@0.58.12
  - effect@3.4.4

## 0.8.10

### Patch Changes

- Updated dependencies [[`a5b95b5`](https://github.com/Effect-TS/effect/commit/a5b95b548284e4798654ae7ce6883fa49108f0ea), [`5e29579`](https://github.com/Effect-TS/effect/commit/5e29579187cb8420ea4930b3999fec984f8999f4)]:
  - @effect/platform@0.58.11

## 0.8.9

### Patch Changes

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update dependencies

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`ab3180f`](https://github.com/Effect-TS/effect/commit/ab3180f827041d0ea3b2d72254a1a8683e99e056), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - @effect/platform@0.58.10
  - effect@3.4.3

## 0.8.8

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.9

## 0.8.7

### Patch Changes

- Updated dependencies [[`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - effect@3.4.2
  - @effect/platform@0.58.8

## 0.8.6

### Patch Changes

- Updated dependencies [[`027004a`](https://github.com/Effect-TS/effect/commit/027004a897f654791e75faa28eefb50dd0244b6e)]:
  - @effect/platform@0.58.7

## 0.8.5

### Patch Changes

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a), [`2e8e252`](https://github.com/Effect-TS/effect/commit/2e8e2520cac712f0eb644553bd476429ebd674e4)]:
  - effect@3.4.1
  - @effect/platform@0.58.6

## 0.8.4

### Patch Changes

- Updated dependencies [[`37a07a2`](https://github.com/Effect-TS/effect/commit/37a07a2d8d1ce09ab965c0ada84a3fae9a6aba05)]:
  - @effect/platform@0.58.5

## 0.8.3

### Patch Changes

- Updated dependencies [[`b77fb0a`](https://github.com/Effect-TS/effect/commit/b77fb0a811ec1ad0e794917077c9a90824515db8)]:
  - @effect/platform@0.58.4

## 0.8.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.3

## 0.8.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.2

## 0.8.0

### Minor Changes

- [#3036](https://github.com/Effect-TS/effect/pull/3036) [`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973) Thanks @tim-smart! - rename NodeSocket.fromNetSocket to .fromDuplex

### Patch Changes

- Updated dependencies [[`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973)]:
  - @effect/platform@0.58.1

## 0.7.0

### Minor Changes

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`63dd0c3`](https://github.com/Effect-TS/effect/commit/63dd0c3af45876c1caad7d03356c74daf551c628) Thanks @tim-smart! - restructure platform http to use flattened modules

  Instead of using the previous re-exports, you now use the modules directly.

  Before:

  ```ts
  import { HttpClient } from "@effect/platform"

  HttpClient.request.get("/").pipe(HttpClient.client.fetchOk)
  ```

  After:

  ```ts
  import { HttpClient, HttpClientRequest } from "@effect/platform"

  HttpClientRequest.get("/").pipe(HttpClient.fetchOk)
  ```

### Patch Changes

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`63dd0c3`](https://github.com/Effect-TS/effect/commit/63dd0c3af45876c1caad7d03356c74daf551c628), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0
  - @effect/platform@0.58.0

## 0.6.17

### Patch Changes

- [#3030](https://github.com/Effect-TS/effect/pull/3030) [`3ba7ea1`](https://github.com/Effect-TS/effect/commit/3ba7ea1c3c2923e85bf2f17e41176f8f8796d203) Thanks @tim-smart! - update find-my-way-ts & multipasta

- Updated dependencies [[`3ba7ea1`](https://github.com/Effect-TS/effect/commit/3ba7ea1c3c2923e85bf2f17e41176f8f8796d203)]:
  - @effect/platform@0.57.8

## 0.6.16

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.57.7

## 0.6.15

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.57.6

## 0.6.14

### Patch Changes

- Updated dependencies [[`b8ea6aa`](https://github.com/Effect-TS/effect/commit/b8ea6aa479006358042b4256ee0a1c5cfbe57acb)]:
  - @effect/platform@0.57.5

## 0.6.13

### Patch Changes

- Updated dependencies [[`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7)]:
  - effect@3.3.5
  - @effect/platform@0.57.4

## 0.6.12

### Patch Changes

- Updated dependencies [[`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352)]:
  - effect@3.3.4
  - @effect/platform@0.57.3

## 0.6.11

### Patch Changes

- Updated dependencies [[`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad), [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d)]:
  - effect@3.3.3
  - @effect/platform@0.57.2

## 0.6.10

### Patch Changes

- [#2988](https://github.com/Effect-TS/effect/pull/2988) [`07e12ec`](https://github.com/Effect-TS/effect/commit/07e12ecdb0e20b9763bd9e9058e567a7c8862efc) Thanks @tim-smart! - refactor Socket to use do notation

- Updated dependencies [[`07e12ec`](https://github.com/Effect-TS/effect/commit/07e12ecdb0e20b9763bd9e9058e567a7c8862efc), [`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd), [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85), [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2), [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d)]:
  - @effect/platform@0.57.1
  - effect@3.3.2

## 0.6.9

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`4d3fbe8`](https://github.com/Effect-TS/effect/commit/4d3fbe82e8cec13ccd0cd0b2096deac6818fb59a), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36)]:
  - effect@3.3.1
  - @effect/platform@0.57.0

## 0.6.8

### Patch Changes

- Updated dependencies [[`2b9ddfc`](https://github.com/Effect-TS/effect/commit/2b9ddfcbac505d98551e764a43923854907ca5c1), [`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`188f0a5`](https://github.com/Effect-TS/effect/commit/188f0a5c57ed0d7c9e5852e0c1c998f1b95810a1), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - @effect/platform@0.56.0
  - effect@3.3.0

## 0.6.7

### Patch Changes

- Updated dependencies [[`a67d602`](https://github.com/Effect-TS/effect/commit/a67d60276f96cd20b76145b4cee13efca6c6158a)]:
  - @effect/platform@0.55.7

## 0.6.6

### Patch Changes

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa), [`799aa20`](https://github.com/Effect-TS/effect/commit/799aa20b4f618736ba33a5297fda90a75d4c26c6)]:
  - effect@3.2.9
  - @effect/platform@0.55.6

## 0.6.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.55.5

## 0.6.4

### Patch Changes

- Updated dependencies [[`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - effect@3.2.8
  - @effect/platform@0.55.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - effect@3.2.7
  - @effect/platform@0.55.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`2c2280b`](https://github.com/Effect-TS/effect/commit/2c2280b98a11fc002663c55792a4fa5781cd5fb6), [`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba)]:
  - @effect/platform@0.55.2
  - effect@3.2.6

## 0.6.1

### Patch Changes

- [#2859](https://github.com/Effect-TS/effect/pull/2859) [`c5c94ed`](https://github.com/Effect-TS/effect/commit/c5c94edf1ddb0abb5c0e2adbb4ec2578a98d8e07) Thanks @tim-smart! - remove temp directory for FileSystem makeTempFileScoped

- Updated dependencies []:
  - @effect/platform@0.55.1

## 0.6.0

### Minor Changes

- [#2835](https://github.com/Effect-TS/effect/pull/2835) [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9) Thanks @tim-smart! - remove pool resizing in platform workers to enable concurrent access

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0), [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9)]:
  - effect@3.2.5
  - @effect/platform@0.55.0

## 0.5.0

### Minor Changes

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3) Thanks @tim-smart! - remove `permits` from workers, to prevent issues with pool resizing

### Patch Changes

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`c07e0ce`](https://github.com/Effect-TS/effect/commit/c07e0cea8ce165887e2c9dfa5d669eba9b2fb798), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3)]:
  - effect@3.2.4
  - @effect/platform@0.54.0

## 0.4.33

### Patch Changes

- Updated dependencies [[`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - effect@3.2.3
  - @effect/platform@0.53.14

## 0.4.32

### Patch Changes

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2), [`c1eaef9`](https://github.com/Effect-TS/effect/commit/c1eaef910420dae416923d172ee58d219e921d0f)]:
  - effect@3.2.2
  - @effect/platform@0.53.13

## 0.4.31

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.12

## 0.4.30

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1
  - @effect/platform@0.53.11

## 0.4.29

### Patch Changes

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0
  - @effect/platform@0.53.10

## 0.4.28

### Patch Changes

- Updated dependencies [[`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e)]:
  - @effect/platform@0.53.9
  - effect@3.1.6

## 0.4.27

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.8

## 0.4.26

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.7

## 0.4.25

### Patch Changes

- [#2750](https://github.com/Effect-TS/effect/pull/2750) [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610) Thanks [@tim-smart](https://github.com/tim-smart)! - fix memory leak in Socket's

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610), [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - @effect/platform@0.53.6
  - effect@3.1.5

## 0.4.24

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.5

## 0.4.23

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4
  - @effect/platform@0.53.4

## 0.4.22

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.3

## 0.4.21

### Patch Changes

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3
  - @effect/platform@0.53.2

## 0.4.20

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.1

## 0.4.19

### Patch Changes

- Updated dependencies [[`d57fbbb`](https://github.com/Effect-TS/effect/commit/d57fbbbd6c466936213a671fc3cd2390064f864e)]:
  - @effect/platform@0.53.0

## 0.4.18

### Patch Changes

- Updated dependencies [[`5866c62`](https://github.com/Effect-TS/effect/commit/5866c621d7eb4cc84e4ba972bfdfd219734cd45d)]:
  - @effect/platform@0.52.3

## 0.4.17

### Patch Changes

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - @effect/platform@0.52.2
  - effect@3.1.2

## 0.4.16

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1
  - @effect/platform@0.52.1

## 0.4.15

### Patch Changes

- Updated dependencies [[`9deab0a`](https://github.com/Effect-TS/effect/commit/9deab0aec9e99501f9441843e34df9afa10c5be9), [`7719b8a`](https://github.com/Effect-TS/effect/commit/7719b8a7350c14e952ffe685bfd5308773b3e271)]:
  - @effect/platform@0.52.0

## 0.4.14

### Patch Changes

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`0ec93cb`](https://github.com/Effect-TS/effect/commit/0ec93cb4f166e7401c171c2f8e8276ce958d9a57), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0
  - @effect/platform@0.51.0

## 0.4.13

### Patch Changes

- [#2656](https://github.com/Effect-TS/effect/pull/2656) [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`16039a0`](https://github.com/Effect-TS/effect/commit/16039a08f04f11545e2fdf40952788a8f9cef04f), [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`d1d33e1`](https://github.com/Effect-TS/effect/commit/d1d33e10b25109f44b5ab1c6e4d778a59c0d3eeb), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - @effect/platform@0.50.8
  - effect@3.0.8

## 0.4.12

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7
  - @effect/platform@0.50.7

## 0.4.11

### Patch Changes

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1)]:
  - effect@3.0.6
  - @effect/platform@0.50.6

## 0.4.10

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5
  - @effect/platform@0.50.5

## 0.4.9

### Patch Changes

- Updated dependencies [[`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - effect@3.0.4
  - @effect/platform@0.50.4

## 0.4.8

### Patch Changes

- Updated dependencies [[`b3b51a2`](https://github.com/Effect-TS/effect/commit/b3b51a2ea0c6ab92a363db46ebaa7e1176d089f5)]:
  - @effect/platform@0.50.3

## 0.4.7

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.50.2

## 0.4.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.50.1

## 0.4.5

### Patch Changes

- Updated dependencies [[`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6), [`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e), [`a3b0e6c`](https://github.com/Effect-TS/effect/commit/a3b0e6c490772e6d44b5d98dcf2729c4d5310ecc), [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6)]:
  - @effect/platform@0.50.0
  - effect@3.0.3

## 0.4.4

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - @effect/platform@0.49.4
  - effect@3.0.2

## 0.4.3

### Patch Changes

- Updated dependencies [[`8d39d65`](https://github.com/Effect-TS/effect/commit/8d39d6554af548228ad767112ce2e0b1f68fa8e1)]:
  - @effect/platform@0.49.3

## 0.4.2

### Patch Changes

- [#2556](https://github.com/Effect-TS/effect/pull/2556) [`5ef0a1a`](https://github.com/Effect-TS/effect/commit/5ef0a1ae9b773fa2481550cb0d43ff7a0e03cd44) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Command stdin being closed too early

- Updated dependencies [[`5ef0a1a`](https://github.com/Effect-TS/effect/commit/5ef0a1ae9b773fa2481550cb0d43ff7a0e03cd44)]:
  - @effect/platform@0.49.2

## 0.4.1

### Patch Changes

- [#2542](https://github.com/Effect-TS/effect/pull/2542) [`87c5687`](https://github.com/Effect-TS/effect/commit/87c5687de0782dab177b7861217fa3b040046282) Thanks [@tim-smart](https://github.com/tim-smart)! - allow fs.watch backend to be customized

  If you want to use the @parcel/watcher backend, you now need to provide it to
  your effects.

  ```ts
  import { Layer } from "effect"
  import { FileSystem } from "@effect/platform"
  import { NodeFileSystem } from "@effect/platform-node"
  import * as ParcelWatcher from "@effect/platform-node/NodeFileSystem/ParcelWatcher"

  // create a Layer that uses the ParcelWatcher backend
  NodeFileSystem.layer.pipe(Layer.provide(ParcelWatcher.layer))
  ```

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`87c5687`](https://github.com/Effect-TS/effect/commit/87c5687de0782dab177b7861217fa3b040046282), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1
  - @effect/platform@0.49.1

## 0.4.0

### Minor Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type parameters in /platform data types

  A codemod has been released to make migration easier:

  ```
  npx @effect/codemod platform-0.49 src/**/*
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1) Thanks [@github-actions](https://github.com/apps/github-actions)! - replace use of `unit` terminology with `void`

  For all the data types.

  ```ts
  Effect.unit // => Effect.void
  Stream.unit // => Stream.void

  // etc
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Patch Changes

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`6460414`](https://github.com/Effect-TS/effect/commit/6460414351a45fb8e0a457c63f3653422efee766), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`25d74f8`](https://github.com/Effect-TS/effect/commit/25d74f8c4d2dd4a9e5ec57ce2f20d36dedd25343), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0
  - @effect/platform@0.49.0

## 0.3.29

### Patch Changes

- Updated dependencies [[`b79cc59`](https://github.com/Effect-TS/effect/commit/b79cc59dbe64b9a0a7742dc9100a9d36c8e46b72)]:
  - @effect/platform@0.48.29

## 0.3.28

### Patch Changes

- Updated dependencies [[`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871), [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b), [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c), [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9), [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`d590094`](https://github.com/Effect-TS/effect/commit/d5900943489ec1e0891836aeafb5ce99fb9c75c7), [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1), [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212)]:
  - effect@2.4.19
  - @effect/platform@0.48.28

## 0.3.27

### Patch Changes

- [#2486](https://github.com/Effect-TS/effect/pull/2486) [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d) Thanks [@tim-smart](https://github.com/tim-smart)! - accept string as a valid Socket input

- [#2486](https://github.com/Effect-TS/effect/pull/2486) [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Socket.runRaw to handle strings directly

- Updated dependencies [[`c6dd3c6`](https://github.com/Effect-TS/effect/commit/c6dd3c6909cafe05adc8450c5a499260e17e60d3), [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d), [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d)]:
  - @effect/platform@0.48.27

## 0.3.26

### Patch Changes

- Updated dependencies [[`365a486`](https://github.com/Effect-TS/effect/commit/365a4865de5e47ce09f4cfd51fc0f67438f82a57)]:
  - @effect/platform@0.48.26

## 0.3.25

### Patch Changes

- Updated dependencies [[`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594), [`d209171`](https://github.com/Effect-TS/effect/commit/d2091714a786820ebae4bef04a9d67d25dd08e88)]:
  - effect@2.4.18
  - @effect/platform@0.48.25

## 0.3.24

### Patch Changes

- [#2458](https://github.com/Effect-TS/effect/pull/2458) [`f993857`](https://github.com/Effect-TS/effect/commit/f993857d5bb21ff7317ec69e481499632f0365f3) Thanks [@tim-smart](https://github.com/tim-smart)! - use node fs/promises for readdir, to fix recursive option

- [#2427](https://github.com/Effect-TS/effect/pull/2427) [`9c6a500`](https://github.com/Effect-TS/effect/commit/9c6a5001b467b6255c68a922f4b6e8d692b63d01) Thanks [@devmatteini](https://github.com/devmatteini)! - add force option to FileSystem.remove

- Updated dependencies [[`9c6a500`](https://github.com/Effect-TS/effect/commit/9c6a5001b467b6255c68a922f4b6e8d692b63d01), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`35ad0ba`](https://github.com/Effect-TS/effect/commit/35ad0ba9f3ba27c60453620e514b980f819f92af), [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f)]:
  - @effect/platform@0.48.24
  - effect@2.4.17

## 0.3.23

### Patch Changes

- Updated dependencies [[`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2), [`63a1df2`](https://github.com/Effect-TS/effect/commit/63a1df2e4de3766f48f15676fbd0360ab9c27816), [`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2), [`74a5dae`](https://github.com/Effect-TS/effect/commit/74a5daed0e65b32a36e026bfcf66d02269cb967a)]:
  - @effect/platform@0.48.23
  - effect@2.4.16

## 0.3.22

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.22

## 0.3.21

### Patch Changes

- Updated dependencies [[`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546), [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a)]:
  - effect@2.4.15
  - @effect/platform@0.48.21

## 0.3.20

### Patch Changes

- Updated dependencies [[`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7), [`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7)]:
  - @effect/platform@0.48.20

## 0.3.19

### Patch Changes

- Updated dependencies [[`fb7285e`](https://github.com/Effect-TS/effect/commit/fb7285e8d6a70527df7137a6a3efdd03ae61cb8b)]:
  - @effect/platform@0.48.19

## 0.3.18

### Patch Changes

- [#2410](https://github.com/Effect-TS/effect/pull/2410) [`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334) Thanks [@tim-smart](https://github.com/tim-smart)! - add undici http client to @effect/platform-node

- [#2410](https://github.com/Effect-TS/effect/pull/2410) [`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334) Thanks [@tim-smart](https://github.com/tim-smart)! - add NodeStream.toReadable

  With this api you can convert an Effect Stream into a node.js Readable stream.

  ```ts
  import { Stream } from "effect"
  import * as NodeStream from "@effect/platform-node/NodeStream"

  // Effect<Readable>
  NodeStream.toReadable(Stream.make("a", "b", "c"))
  ```

- Updated dependencies [[`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334), [`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa)]:
  - @effect/platform@0.48.18
  - effect@2.4.14

## 0.3.17

### Patch Changes

- Updated dependencies [[`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe), [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3), [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe)]:
  - @effect/platform@0.48.17
  - effect@2.4.13

## 0.3.16

### Patch Changes

- [#2387](https://github.com/Effect-TS/effect/pull/2387) [`75a8d16`](https://github.com/Effect-TS/effect/commit/75a8d16247cc14860cdd7fd948ef542c50c2d55e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cookies module to /platform http

  To add cookies to a http response:

  ```ts
  import * as Http from "@effect/platform/HttpServer"

  Http.response.empty().pipe(
    Http.response.setCookies([
      ["name", "value"],
      ["foo", "bar", { httpOnly: true }]
    ])
  )
  ```

  You can also use cookies with the http client:

  ```ts
  import * as Http from "@effect/platform/HttpClient"
  import { Effect, Ref } from "effect"

  Effect.gen(function* (_) {
    const ref = yield* _(Ref.make(Http.cookies.empty))
    const defaultClient = yield* _(Http.client.Client)
    const clientWithCookies = defaultClient.pipe(
      Http.client.withCookiesRef(ref),
      Http.client.filterStatusOk
    )

    // cookies will be stored in the ref and sent in any subsequent requests
    yield* _(
      Http.request.get("https://www.google.com/"),
      clientWithCookies,
      Effect.scoped
    )
  })
  ```

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - update typescript to 5.4

- Updated dependencies [[`75a8d16`](https://github.com/Effect-TS/effect/commit/75a8d16247cc14860cdd7fd948ef542c50c2d55e), [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87)]:
  - @effect/platform@0.48.16
  - effect@2.4.12

## 0.3.15

### Patch Changes

- [#2384](https://github.com/Effect-TS/effect/pull/2384) [`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8), [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5), [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60)]:
  - effect@2.4.11
  - @effect/platform@0.48.15

## 0.3.14

### Patch Changes

- Updated dependencies [[`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a), [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968)]:
  - effect@2.4.10
  - @effect/platform@0.48.14

## 0.3.13

### Patch Changes

- [#2368](https://github.com/Effect-TS/effect/pull/2368) [`1879f62`](https://github.com/Effect-TS/effect/commit/1879f629d0c4815dbb5955779247cd3f3da5cd85) Thanks [@tim-smart](https://github.com/tim-smart)! - fallback to node fs.watch if @parcel/watcher fails to import

- Updated dependencies []:
  - @effect/platform@0.48.13

## 0.3.12

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.12

## 0.3.11

### Patch Changes

- [#2360](https://github.com/Effect-TS/effect/pull/2360) [`0f6c7b4`](https://github.com/Effect-TS/effect/commit/0f6c7b426eb3432f60e3a17f8cd92ceac91597bf) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for watching single files

- Updated dependencies [[`0f6c7b4`](https://github.com/Effect-TS/effect/commit/0f6c7b426eb3432f60e3a17f8cd92ceac91597bf)]:
  - @effect/platform@0.48.11

## 0.3.10

### Patch Changes

- [#2357](https://github.com/Effect-TS/effect/pull/2357) [`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99) Thanks [@tim-smart](https://github.com/tim-smart)! - make more data types in /platform implement Inspectable

- Updated dependencies [[`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99)]:
  - @effect/platform@0.48.10
  - effect@2.4.9

## 0.3.9

### Patch Changes

- Updated dependencies [[`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566), [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb), [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0), [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9)]:
  - effect@2.4.8
  - @effect/platform@0.48.9

## 0.3.8

### Patch Changes

- [#2334](https://github.com/Effect-TS/effect/pull/2334) [`69d27bb`](https://github.com/Effect-TS/effect/commit/69d27bb633884b6b50f9c3d9e95c29f09b4860b5) Thanks [@tim-smart](https://github.com/tim-smart)! - add .watch method to /platform FileSystem

  It can be used to listen for file system events. Example:

  ```ts
  import { FileSystem } from "@effect/platform"
  import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
  import { Console, Effect, Stream } from "effect"

  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem)
    yield* _(fs.watch("./"), Stream.runForEach(Console.log))
  }).pipe(Effect.provide(NodeFileSystem.layer), NodeRuntime.runMain)
  ```

- Updated dependencies [[`69d27bb`](https://github.com/Effect-TS/effect/commit/69d27bb633884b6b50f9c3d9e95c29f09b4860b5)]:
  - @effect/platform@0.48.8

## 0.3.7

### Patch Changes

- Updated dependencies [[`f908948`](https://github.com/Effect-TS/effect/commit/f908948fd05771a670c0b746e2dd9caa9408ef83)]:
  - @effect/platform@0.48.7

## 0.3.6

### Patch Changes

- Updated dependencies [[`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6)]:
  - effect@2.4.7
  - @effect/platform@0.48.6

## 0.3.5

### Patch Changes

- [#2325](https://github.com/Effect-TS/effect/pull/2325) [`e006e4a`](https://github.com/Effect-TS/effect/commit/e006e4a538c97bae6ca1efa74802159e8a688fcb) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure Socket fibers are interruptible

- Updated dependencies [[`e006e4a`](https://github.com/Effect-TS/effect/commit/e006e4a538c97bae6ca1efa74802159e8a688fcb)]:
  - @effect/platform@0.48.5

## 0.3.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.4

## 0.3.3

### Patch Changes

- [#2314](https://github.com/Effect-TS/effect/pull/2314) [`c362e06`](https://github.com/Effect-TS/effect/commit/c362e066550252d5a9fcbc31a4b34d0e17c50699) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent unhandled fiber errors in Sockets

- Updated dependencies [[`c362e06`](https://github.com/Effect-TS/effect/commit/c362e066550252d5a9fcbc31a4b34d0e17c50699), [`83ddd6f`](https://github.com/Effect-TS/effect/commit/83ddd6f41029724b2cbd144cf309463967ed1164)]:
  - @effect/platform@0.48.3

## 0.3.2

### Patch Changes

- Updated dependencies [[`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be), [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f)]:
  - @effect/platform@0.48.2
  - effect@2.4.6

## 0.3.1

### Patch Changes

- Updated dependencies [[`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3), [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f)]:
  - effect@2.4.5
  - @effect/platform@0.48.1

## 0.3.0

### Minor Changes

- [#2287](https://github.com/Effect-TS/effect/pull/2287) [`a1f44cb`](https://github.com/Effect-TS/effect/commit/a1f44cb5112713ff9a3ac3d91a63a2c99d6b7fc1) Thanks [@tim-smart](https://github.com/tim-smart)! - add option to /platform runMain to disable error reporting

### Patch Changes

- [#2283](https://github.com/Effect-TS/effect/pull/2283) [`509be1a`](https://github.com/Effect-TS/effect/commit/509be1a0817118489750cf028523134677e44a8a) Thanks [@tim-smart](https://github.com/tim-smart)! - add SocketCloseError with additional metadata

- [#2281](https://github.com/Effect-TS/effect/pull/2281) [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd) Thanks [@tim-smart](https://github.com/tim-smart)! - support closing a Socket by writing a CloseEvent

- Updated dependencies [[`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5), [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38), [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`509be1a`](https://github.com/Effect-TS/effect/commit/509be1a0817118489750cf028523134677e44a8a), [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd), [`a1f44cb`](https://github.com/Effect-TS/effect/commit/a1f44cb5112713ff9a3ac3d91a63a2c99d6b7fc1), [`d910dd2`](https://github.com/Effect-TS/effect/commit/d910dd2ca1e8e5aa2f09d9bf3694ede745758f99), [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd), [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b), [`bdff193`](https://github.com/Effect-TS/effect/commit/bdff193365dd9ec2863573b08eb960aa8dee5c93)]:
  - effect@2.4.4
  - @effect/platform@0.48.0

## 0.2.5

### Patch Changes

- Updated dependencies [[`0680545`](https://github.com/Effect-TS/effect/commit/068054540f19bb23a79c7c021ed8b2fe34f3e19f), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e)]:
  - @effect/platform@0.47.1
  - effect@2.4.3

## 0.2.4

### Patch Changes

- [#2267](https://github.com/Effect-TS/effect/pull/2267) [`0f3d99c`](https://github.com/Effect-TS/effect/commit/0f3d99c27521ec6b221b644a0fffc79199c3acca) Thanks [@tim-smart](https://github.com/tim-smart)! - propogate Socket handler errors to .run Effect

- Updated dependencies [[`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0), [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d), [`0f3d99c`](https://github.com/Effect-TS/effect/commit/0f3d99c27521ec6b221b644a0fffc79199c3acca), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8), [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00), [`4064ea0`](https://github.com/Effect-TS/effect/commit/4064ea04e0b3fa23108ee471cd89ab2482b2f6e5), [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27), [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e), [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e)]:
  - effect@2.4.2
  - @effect/platform@0.47.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac), [`7535080`](https://github.com/Effect-TS/effect/commit/7535080f2e2f9859711031161600c01807cc43ea), [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831), [`bd1d7ac`](https://github.com/Effect-TS/effect/commit/bd1d7ac75eea57a94d5e2d8e1edccb3136e84899), [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31)]:
  - effect@2.4.1
  - @effect/platform@0.46.3

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.46.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`aa6556f`](https://github.com/Effect-TS/effect/commit/aa6556f007117caea84d6965aa30846a11879e9d)]:
  - @effect/platform@0.46.1

## 0.2.0

### Minor Changes

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type params of Either from `Either<E, A>` to `Either<R, L = never>`.

  Along the same line of the other changes this allows to shorten the most common types such as:

  ```ts
  import { Either } from "effect"

  const right: Either.Either<string> = Either.right("ok")
  ```

### Patch Changes

- Updated dependencies [[`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101), [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f), [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f), [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484), [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff), [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe), [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a), [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e), [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561), [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108)]:
  - effect@2.4.0
  - @effect/platform@0.46.0

## 0.1.14

### Patch Changes

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

- Updated dependencies [[`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9), [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf)]:
  - effect@2.3.8
  - @effect/platform@0.45.6

## 0.1.13

### Patch Changes

- Updated dependencies [[`6daf084`](https://github.com/Effect-TS/effect/commit/6daf0845de008772011db8d7c75b7c37a6b4d334)]:
  - @effect/platform@0.45.5

## 0.1.12

### Patch Changes

- Updated dependencies [[`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f), [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea), [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de), [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241), [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea)]:
  - effect@2.3.7
  - @effect/platform@0.45.4

## 0.1.11

### Patch Changes

- Updated dependencies [[`09532a8`](https://github.com/Effect-TS/effect/commit/09532a86b7d0cc23557c89158f0342753dfce4b0)]:
  - @effect/platform@0.45.3

## 0.1.10

### Patch Changes

- Updated dependencies [[`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444), [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8), [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333), [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e), [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a), [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0), [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62), [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12), [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880), [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce), [`44c3b43`](https://github.com/Effect-TS/effect/commit/44c3b43653e64d7e425d39815d8ff405acec9b99)]:
  - effect@2.3.6
  - @effect/platform@0.45.2

## 0.1.9

### Patch Changes

- Updated dependencies [[`65895ab`](https://github.com/Effect-TS/effect/commit/65895ab982e0917ac92f0827e387e7cf61be1e69)]:
  - @effect/platform@0.45.1

## 0.1.8

### Patch Changes

- Updated dependencies [[`2b62548`](https://github.com/Effect-TS/effect/commit/2b6254845882f399636d24223c483e5489e3cff4)]:
  - @effect/platform@0.45.0

## 0.1.7

### Patch Changes

- Updated dependencies [[`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3)]:
  - effect@2.3.5
  - @effect/platform@0.44.7

## 0.1.6

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4
  - @effect/platform@0.44.6

## 0.1.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.44.5

## 0.1.4

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3
  - @effect/platform@0.44.4

## 0.1.3

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2
  - @effect/platform@0.44.3

## 0.1.2

### Patch Changes

- Updated dependencies [[`29739dd`](https://github.com/Effect-TS/effect/commit/29739dde8e6232824d49c4c7f8856de245249c5c)]:
  - @effect/platform@0.44.2

## 0.1.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/platform@0.44.1

## 0.1.0

### Minor Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we now require a string key to be provided for all tags and renames the dear old `Tag` to `GenericTag`, so when previously you could do:

  ```ts
  import { Effect, Context } from "effect"
  interface Service {
    readonly _: unique symbol
  }
  const Service = Context.Tag<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >()
  ```

  you are now mandated to do:

  ```ts
  import { Effect, Context } from "effect"
  interface Service {
    readonly _: unique symbol
  }
  const Service = Context.GenericTag<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >("Service")
  ```

  This makes by default all tags globals and ensures better debuggaility when unexpected errors arise.

  Furthermore we introduce a new way of constructing tags that should be considered the new default:

  ```ts
  import { Effect, Context } from "effect"
  class Service extends Context.Tag("Service")<
    Service,
    {
      number: Effect.Effect<never, never, number>
    }
  >() {}

  const program = Effect.flatMap(Service, ({ number }) => number).pipe(
    Effect.flatMap((_) => Effect.log(`number: ${_}`))
  )
  ```

  this will use "Service" as the key and will create automatically an opaque identifier (the class) to be used at the type level, it does something similar to the above in a single shot.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Effect` type parameters order from `Effect<R, E, A>` to `Effect<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f) Thanks [@github-actions](https://github.com/apps/github-actions)! - remove re-exports from platform packages

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - This change enables `Effect.serviceConstants` and `Effect.serviceMembers` to access any constant in the service, not only the effects, namely it is now possible to do:

  ```ts
  import { Effect, Context } from "effect"

  class NumberRepo extends Context.TagClass("NumberRepo")<
    NumberRepo,
    {
      readonly numbers: Array<number>
    }
  >() {
    static numbers = Effect.serviceConstants(NumberRepo).numbers
  }
  ```

### Patch Changes

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/platform@0.44.0
