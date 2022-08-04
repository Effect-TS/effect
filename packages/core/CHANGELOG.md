# @effect/core

## 0.0.10

### Patch Changes

- [#1265](https://github.com/Effect-TS/core/pull/1265) [`614bdfbcc`](https://github.com/Effect-TS/core/commit/614bdfbcced76ab310407d0f1b23a327c057ae31) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Updates and Fix to Schedule zip-like ops

## 0.0.9

### Patch Changes

- [#1260](https://github.com/Effect-TS/core/pull/1260) [`b6e519708`](https://github.com/Effect-TS/core/commit/b6e519708b84087dcd7dc375bfe14c4aafa1d32e) Thanks [@IMax153](https://github.com/IMax153)! - rename core Effect constructors

* [#1262](https://github.com/Effect-TS/core/pull/1262) [`6fd41df72`](https://github.com/Effect-TS/core/commit/6fd41df72becda659ca2b5cc5e71e87450a165c3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove Compile Time Tracing

- [#1260](https://github.com/Effect-TS/core/pull/1260) [`2a7393e8d`](https://github.com/Effect-TS/core/commit/2a7393e8dd56b317a69c1f39cb4d3c907185bb74) Thanks [@IMax153](https://github.com/IMax153)! - convert Deferred and FiberRef to use getters

* [#1262](https://github.com/Effect-TS/core/pull/1262) [`bb1c8686c`](https://github.com/Effect-TS/core/commit/bb1c8686ca70028be5e3347362330f2829539396) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Backport https://github.com/zio/zio/pull/7088 and change Ref to use classes

- [#1260](https://github.com/Effect-TS/core/pull/1260) [`027c1025f`](https://github.com/Effect-TS/core/commit/027c1025f4fafd043f730178e92bdd3e0fcd09ff) Thanks [@IMax153](https://github.com/IMax153)! - rename Layer combinators for clarity

* [#1262](https://github.com/Effect-TS/core/pull/1262) [`ba632ab75`](https://github.com/Effect-TS/core/commit/ba632ab75035949d53326390a4ce87af340c5f07) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch Ref#get to be a getter

- [#1263](https://github.com/Effect-TS/core/pull/1263) [`b79cb2816`](https://github.com/Effect-TS/core/commit/b79cb2816e65384e57afaab78dbf794862f89126) Thanks [@IMax153](https://github.com/IMax153)! - fix bugs in Schedule

* [#1262](https://github.com/Effect-TS/core/pull/1262) [`19006d289`](https://github.com/Effect-TS/core/commit/19006d289b0d95c93cda8989da8c8d86baaac666) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Use Getters in Queue

## 0.0.8

### Patch Changes

- [#1247](https://github.com/Effect-TS/core/pull/1247) [`d09830532`](https://github.com/Effect-TS/core/commit/d098305328c46ad2197b5c67b8191f5c00cd653e) Thanks [@IMax153](https://github.com/IMax153)! - add ReentrantLock data type

* [#1247](https://github.com/Effect-TS/core/pull/1247) [`eda002b45`](https://github.com/Effect-TS/core/commit/eda002b45b1af3b56d0632e4b9ea4a03e0d66f5c) Thanks [@IMax153](https://github.com/IMax153)! - add MVar data type

- [#1251](https://github.com/Effect-TS/core/pull/1251) [`323b5af2c`](https://github.com/Effect-TS/core/commit/323b5af2cf9dd4d046a15ecd079e20e8f2d54d5c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Revise FiberRef design

* [#1250](https://github.com/Effect-TS/core/pull/1250) [`33b6edec4`](https://github.com/Effect-TS/core/commit/33b6edec4739afe8acf49949edb628a34dad6783) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove usage of LazyValue

- [#1241](https://github.com/Effect-TS/core/pull/1241) [`0f274d99b`](https://github.com/Effect-TS/core/commit/0f274d99b3c93724945b1b9feff73314a0d25ecd) Thanks [@IMax153](https://github.com/IMax153)! - standardize tsplus annotations to pipe

* [#1249](https://github.com/Effect-TS/core/pull/1249) [`147b91e11`](https://github.com/Effect-TS/core/commit/147b91e11241f4cd068d2ef4031724f21af81f33) Thanks [@IMax153](https://github.com/IMax153)! - add Gen and Sample datatypes

- [#1254](https://github.com/Effect-TS/core/pull/1254) [`b3c811f4c`](https://github.com/Effect-TS/core/commit/b3c811f4cc78ff723d189dbc533af3d5d6398127) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support Unsafe Sync Execution

* [#1255](https://github.com/Effect-TS/core/pull/1255) [`cd89881d9`](https://github.com/Effect-TS/core/commit/cd89881d909b161dfb9c4ca678b8f9725ad3a9d1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Preserve Fiber Refs in Runtime

- [#1247](https://github.com/Effect-TS/core/pull/1247) [`c6b1cfc6a`](https://github.com/Effect-TS/core/commit/c6b1cfc6a600ef5d3cbf72da7e96e25c4c14bc1c) Thanks [@IMax153](https://github.com/IMax153)! - add CountdownLatch data type

* [#1258](https://github.com/Effect-TS/core/pull/1258) [`1a01b7740`](https://github.com/Effect-TS/core/commit/1a01b774041316db6f03f8a8d8d2e8dc2793cfb4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove Semaphore and ReentrantLock in favour of TSemaphore and TReentrantLock

- [#1256](https://github.com/Effect-TS/core/pull/1256) [`38f98209f`](https://github.com/Effect-TS/core/commit/38f98209ff78486dcb0f717366ddb0b5446c2eb8) Thanks [@mattiamanzati](https://github.com/mattiamanzati)! - Improve Scheduler Compatibility

* [#1259](https://github.com/Effect-TS/core/pull/1259) [`3cd8569d6`](https://github.com/Effect-TS/core/commit/3cd8569d6c2459286a4752856766553832fd2cdf) Thanks [@IMax153](https://github.com/IMax153)! - add Cause.stripSomeDefects

- [#1252](https://github.com/Effect-TS/core/pull/1252) [`6b04b1fac`](https://github.com/Effect-TS/core/commit/6b04b1fac4cd161a02dfcea58443257176a81589) Thanks [@IMax153](https://github.com/IMax153)! - add TestClock data type

* [#1247](https://github.com/Effect-TS/core/pull/1247) [`554a50bd2`](https://github.com/Effect-TS/core/commit/554a50bd2105089b49496928b2c9550218f8a360) Thanks [@IMax153](https://github.com/IMax153)! - add CyclicBarrier data type

## 0.0.7

### Patch Changes

- [#1244](https://github.com/Effect-TS/core/pull/1244) [`ae839b27c`](https://github.com/Effect-TS/core/commit/ae839b27c17a410a574fc54353d362a361ae695b) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add unsafeMake for Ref.Synchronized, Semaphore and TSemaphore

## 0.0.6

### Patch Changes

- [#1237](https://github.com/Effect-TS/core/pull/1237) [`95ea9ed46`](https://github.com/Effect-TS/core/commit/95ea9ed46d5e44c0c80f4e17c3b2919ed7883686) Thanks [@wesselvdv](https://github.com/wesselvdv)! - fix Ref, Ref.Synchronized and SubscriptionRef inheritance

* [#1239](https://github.com/Effect-TS/core/pull/1239) [`afa72ba04`](https://github.com/Effect-TS/core/commit/afa72ba0481c28d1f24c2ef7454e27ab67aaa902) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Use Fluent Style for Queue and Hub

- [#1237](https://github.com/Effect-TS/core/pull/1237) [`95ea9ed46`](https://github.com/Effect-TS/core/commit/95ea9ed46d5e44c0c80f4e17c3b2919ed7883686) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Rename RefSynchronized to Ref.Synchronized

* [#1242](https://github.com/Effect-TS/core/pull/1242) [`d96f91c72`](https://github.com/Effect-TS/core/commit/d96f91c7296ad80cb204f8b2553fff7f823f1491) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Adopt fluent style in Deferred

## 0.0.5

### Patch Changes

- [#1232](https://github.com/Effect-TS/core/pull/1232) [`06b0c741e`](https://github.com/Effect-TS/core/commit/06b0c741e171ddbe612d5b4d2902734407d259f7) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Replace fluent with getter where applicable

* [#1233](https://github.com/Effect-TS/core/pull/1233) [`d3e9fac8f`](https://github.com/Effect-TS/core/commit/d3e9fac8f7c53cc0815891b1e70e3a1625ea4946) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Rename Option to Maybe

- [#1232](https://github.com/Effect-TS/core/pull/1232) [`d1e2e5b89`](https://github.com/Effect-TS/core/commit/d1e2e5b895f274b5a3d4c252525c6a05d96048d3) Thanks [@wesselvdv](https://github.com/wesselvdv)! - remove TArray Collection extend

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`7523ae1dd`](https://github.com/Effect-TS/core/commit/7523ae1dd193e25c7846ac29dbd394a6134a7e2c) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add TRandom implementation

- [#1233](https://github.com/Effect-TS/core/pull/1233) [`74f2726d0`](https://github.com/Effect-TS/core/commit/74f2726d0cefa2c07ee139985fb6bec522736bec) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Kill Effect Aliases

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`43e327ddc`](https://github.com/Effect-TS/core/commit/43e327ddce81e65cb166a8ee45e4f4a1ccfccf4c) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Rename various asUnit to unit

- [#1232](https://github.com/Effect-TS/core/pull/1232) [`2d65d5ba8`](https://github.com/Effect-TS/core/commit/2d65d5ba8926b3fa66bb5755006c090d5b81ce0b) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add implementation for TReentrantLock

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`45d79b13d`](https://github.com/Effect-TS/core/commit/45d79b13d3c1a61d16b8aff57c3274fa217b9574) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add collect & collectSTM for STM

- [#1232](https://github.com/Effect-TS/core/pull/1232) [`981a7496b`](https://github.com/Effect-TS/core/commit/981a7496b59895e6cf764563dc91495cbe1c7746) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Fix missing tsplustrace pass allow in Effect.acquireReleaseExit

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`724ae7101`](https://github.com/Effect-TS/core/commit/724ae710182cdabe3bff6d19bcc527830e29f936) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Make Random.nextIntBetween upper bound exclusive

- [#1231](https://github.com/Effect-TS/core/pull/1231) [`801ed8cf1`](https://github.com/Effect-TS/core/commit/801ed8cf11770d193a6dcd5d1c3d6ec7fefb6c72) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add TQueue implementation

* [#1229](https://github.com/Effect-TS/core/pull/1229) [`950b69e61`](https://github.com/Effect-TS/core/commit/950b69e61df25ee0212be1df27615cf07e6bc6d1) Thanks [@IMax153](https://github.com/IMax153)! - fix Stream.peel and Stream.aggregateWithinEither

- [#1232](https://github.com/Effect-TS/core/pull/1232) [`a960afdb2`](https://github.com/Effect-TS/core/commit/a960afdb2e7ecc67f5860158744ea8c1b2761cb8) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add THub implementation

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`a9439ebdd`](https://github.com/Effect-TS/core/commit/a9439ebddc869c547a9363587166724ade088f89) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add TDeferred implementation

- [#1229](https://github.com/Effect-TS/core/pull/1229) [`a9956827f`](https://github.com/Effect-TS/core/commit/a9956827f5ff382723c428e8988e50ddf0d67ade) Thanks [@IMax153](https://github.com/IMax153)! - fix issue with Stream.zipWith

* [#1232](https://github.com/Effect-TS/core/pull/1232) [`23506e63e`](https://github.com/Effect-TS/core/commit/23506e63eb3f629a90fa1d5309e91a470e451fbb) Thanks [@wesselvdv](https://github.com/wesselvdv)! - Add TSet implementation

- [#1231](https://github.com/Effect-TS/core/pull/1231) [`dceb8c91b`](https://github.com/Effect-TS/core/commit/dceb8c91b81473c1211f6adb8a61b54d5b9fe8bf) Thanks [@wesselvdv](https://github.com/wesselvdv)! - remove parenthesis on length and size getters

## 0.0.4

### Patch Changes

- [#1223](https://github.com/Effect-TS/core/pull/1223) [`212808701`](https://github.com/Effect-TS/core/commit/2128087016bd77d5ca8ce0709cd60b709d707f80) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix forEachEffect\_ signature

* [`a23798bc7`](https://github.com/Effect-TS/core/commit/a23798bc703c50965d1929227acd9c7aec556811) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix Effect.gen

## 0.0.3

### Patch Changes

- [#1209](https://github.com/Effect-TS/core/pull/1209) [`0285962b7`](https://github.com/Effect-TS/core/commit/0285962b727fb6fcf0b56e97e5a3eb59f455e512) Thanks [@IMax153](https://github.com/IMax153)! - death to semicolons

* [#1218](https://github.com/Effect-TS/core/pull/1218) [`f079f691f`](https://github.com/Effect-TS/core/commit/f079f691f2e7f16c40135c46538d845164bc6274) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix provide function signatures

- [#1222](https://github.com/Effect-TS/core/pull/1222) [`8e7eb01a9`](https://github.com/Effect-TS/core/commit/8e7eb01a9563805851193abdcfb8ec5cf162ada0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve Layer Constructors

* [#1221](https://github.com/Effect-TS/core/pull/1221) [`be705d521`](https://github.com/Effect-TS/core/commit/be705d521dad4de675b13cc48c7183e59f176ce3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Depth based loop detection in Scheduler

- [#1222](https://github.com/Effect-TS/core/pull/1222) [`e67699a96`](https://github.com/Effect-TS/core/commit/e67699a96174ea35540ec48c72e989a5f418c904) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve serviceWith signatures

* [#1222](https://github.com/Effect-TS/core/pull/1222) [`b5014f860`](https://github.com/Effect-TS/core/commit/b5014f860148dc9fff213e77b0c48f57853e19d4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Has Has Died

## 0.0.2

### Patch Changes

- [#1196](https://github.com/Effect-TS/core/pull/1196) [`3859d3cb6`](https://github.com/Effect-TS/core/commit/3859d3cb665752d6c8f3930ab0d7204cd5e69ce6) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update stdlib and Env usage

* [#1193](https://github.com/Effect-TS/core/pull/1193) [`6999580ec`](https://github.com/Effect-TS/core/commit/6999580ec8e704792ca2966cccec176d4d6f69de) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fluent variants for scoped/scopedEnvironment/acquireRelease\*

- [#1198](https://github.com/Effect-TS/core/pull/1198) [`e817ef45b`](https://github.com/Effect-TS/core/commit/e817ef45bfd86362a71a0944029edfb776b5a650) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove Effect \_\_call and add pipe as /

* [#1192](https://github.com/Effect-TS/core/pull/1192) [`b375237af`](https://github.com/Effect-TS/core/commit/b375237af58490d4fd4d1c03e3ca4204f404e526) Thanks [@IMax153](https://github.com/IMax153)! - make FiberRefLocals immutable

- [#1204](https://github.com/Effect-TS/core/pull/1204) [`db577b633`](https://github.com/Effect-TS/core/commit/db577b6331b3064a5cb0b5e62f2206a6b7f77fe2) Thanks [@IMax153](https://github.com/IMax153)! - fix naming of acquireRelease Stream combinators

* [#1207](https://github.com/Effect-TS/core/pull/1207) [`e24875f72`](https://github.com/Effect-TS/core/commit/e24875f72eff538bb46efdc9a29729df0f58291d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update TS+ & Stdlib, revise layer cache

## 0.0.1

### Patch Changes

- [#1178](https://github.com/Effect-TS/core/pull/1178) [`6097241e0`](https://github.com/Effect-TS/core/commit/6097241e00875686c2e6e57c512e32dec19f91e3) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Porting of ZIO 2.0, Support for TS+, Delegation to @tsplus/stdlib.

  Special thanks to all of the contributors involved in this huge effort in improving effect.

  First alpha release of the new version of effect, this release contains cumulative work addressed in the following PRs:

  - https://github.com/Effect-TS/core/pull/1191
  - https://github.com/Effect-TS/core/pull/1190
  - https://github.com/Effect-TS/core/pull/1189
  - https://github.com/Effect-TS/core/pull/1188
  - https://github.com/Effect-TS/core/pull/1187
  - https://github.com/Effect-TS/core/pull/1186
  - https://github.com/Effect-TS/core/pull/1185
  - https://github.com/Effect-TS/core/pull/1184
  - https://github.com/Effect-TS/core/pull/1183
  - https://github.com/Effect-TS/core/pull/1182
  - https://github.com/Effect-TS/core/pull/1181
  - https://github.com/Effect-TS/core/pull/1180
  - https://github.com/Effect-TS/core/pull/1177
  - https://github.com/Effect-TS/core/pull/1176
  - https://github.com/Effect-TS/core/pull/1174
  - https://github.com/Effect-TS/core/pull/1173
  - https://github.com/Effect-TS/core/pull/1167
  - https://github.com/Effect-TS/core/pull/1163
  - https://github.com/Effect-TS/core/pull/1161
  - https://github.com/Effect-TS/core/pull/1152
  - https://github.com/Effect-TS/core/pull/1149
  - https://github.com/Effect-TS/core/pull/1137
  - https://github.com/Effect-TS/core/pull/1127
  - https://github.com/Effect-TS/core/pull/1126
  - https://github.com/Effect-TS/core/pull/1122
  - https://github.com/Effect-TS/core/pull/1114
  - https://github.com/Effect-TS/core/pull/1113
  - https://github.com/Effect-TS/core/pull/1112
  - https://github.com/Effect-TS/core/pull/1111
  - https://github.com/Effect-TS/core/pull/1110
  - https://github.com/Effect-TS/core/pull/1109
  - https://github.com/Effect-TS/core/pull/1102
  - https://github.com/Effect-TS/core/pull/1089
  - https://github.com/Effect-TS/core/pull/1085
  - https://github.com/Effect-TS/core/pull/1049
  - https://github.com/Effect-TS/core/pull/1045
  - https://github.com/Effect-TS/core/pull/1043
  - https://github.com/Effect-TS/core/pull/1042
  - https://github.com/Effect-TS/core/pull/1037
  - https://github.com/Effect-TS/core/pull/1034
