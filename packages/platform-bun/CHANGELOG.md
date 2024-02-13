# @effect/platform-bun

## 0.31.7

### Patch Changes

- Updated dependencies [[`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3)]:
  - effect@2.3.5
  - @effect/platform@0.44.7
  - @effect/platform-node-shared@0.1.7

## 0.31.6

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4
  - @effect/platform@0.44.6
  - @effect/platform-node-shared@0.1.6

## 0.31.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.44.5
  - @effect/platform-node-shared@0.1.5

## 0.31.4

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3
  - @effect/platform@0.44.4
  - @effect/platform-node-shared@0.1.4

## 0.31.3

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2
  - @effect/platform@0.44.3
  - @effect/platform-node-shared@0.1.3

## 0.31.2

### Patch Changes

- Updated dependencies [[`29739dd`](https://github.com/Effect-TS/effect/commit/29739dde8e6232824d49c4c7f8856de245249c5c)]:
  - @effect/platform@0.44.2
  - @effect/platform-node-shared@0.1.2

## 0.31.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/platform@0.44.1
  - @effect/platform-node-shared@0.1.1

## 0.31.0

### Minor Changes

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we now require a string key to be provided for all tags and renames the dear old `Tag` to `GenericTag`, so when previously you could do:

  ```ts
  import { Effect, Context } from "effect";
  interface Service {
    readonly _: unique symbol;
  }
  const Service = Context.Tag<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >();
  ```

  you are now mandated to do:

  ```ts
  import { Effect, Context } from "effect";
  interface Service {
    readonly _: unique symbol;
  }
  const Service = Context.GenericTag<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >("Service");
  ```

  This makes by default all tags globals and ensures better debuggaility when unexpected errors arise.

  Furthermore we introduce a new way of constructing tags that should be considered the new default:

  ```ts
  import { Effect, Context } from "effect";
  class Service extends Context.Tag("Service")<
    Service,
    {
      number: Effect.Effect<never, never, number>;
    }
  >() {}

  const program = Effect.flatMap(Service, ({ number }) => number).pipe(
    Effect.flatMap((_) => Effect.log(`number: ${_}`)),
  );
  ```

  this will use "Service" as the key and will create automatically an opaque identifier (the class) to be used at the type level, it does something similar to the above in a single shot.

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3) Thanks [@github-actions](https://github.com/apps/github-actions)! - change `Effect` type parameters order from `Effect<R, E, A>` to `Effect<A, E = never, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205) Thanks [@github-actions](https://github.com/apps/github-actions)! - move where platform worker spawn function is provided

  With this change, the point in which you provide the spawn function moves closer
  to the edge, where you provide platform specific implementation.

  This seperates even more platform concerns from your business logic. Example:

  ```ts
  import { Worker } from "@effect/platform"
  import { BrowserWorker } from "@effect/platform-browser"
  import { Effect } from "effect"

  Worker.makePool({ ... }).pipe(
    Effect.provide(BrowserWorker.layer(() => new globalThis.Worker(...)))
  )
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7) Thanks [@github-actions](https://github.com/apps/github-actions)! - - Schema: change type parameters order from `Schema<R, I, A>` to `Schema<A, I = A, R = never>`

  - Serializable: change type parameters order from `Serializable<R, I, A>` to `Serializable<A, I, R>`
  - Class: change type parameters order from `Class<R, I, A, C, Self, Inherited>` to `Class<A, I, R, C, Self, Inherited>`
  - PropertySignature: change type parameters order from `PropertySignature<R, From, FromIsOptional, To, ToIsOptional>` to `PropertySignature<From, FromIsOptional, To, ToIsOptional, R = never>`

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f) Thanks [@github-actions](https://github.com/apps/github-actions)! - remove re-exports from platform packages

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c) Thanks [@github-actions](https://github.com/apps/github-actions)! - This change enables `Effect.serviceConstants` and `Effect.serviceMembers` to access any constant in the service, not only the effects, namely it is now possible to do:

  ```ts
  import { Effect, Context } from "effect";

  class NumberRepo extends Context.TagClass("NumberRepo")<
    NumberRepo,
    {
      readonly numbers: Array<number>;
    }
  >() {
    static numbers = Effect.serviceConstants(NumberRepo).numbers;
  }
  ```

### Patch Changes

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/platform@0.44.0
  - @effect/platform-node-shared@0.1.0

## 0.30.11

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5
  - @effect/platform@0.43.11
  - @effect/platform-node@0.42.11

## 0.30.10

### Patch Changes

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4
  - @effect/platform@0.43.10
  - @effect/platform-node@0.42.10

## 0.30.9

### Patch Changes

- Updated dependencies [[`1b841a9`](https://github.com/Effect-TS/effect/commit/1b841a91fed86825cd2867cf1e68e41d8ff26b4e)]:
  - @effect/platform@0.43.9
  - @effect/platform-node@0.42.9

## 0.30.8

### Patch Changes

- Updated dependencies [[`32bf796`](https://github.com/Effect-TS/effect/commit/32bf796c3e5db1b2b68e8b1b20db664295991643)]:
  - @effect/platform@0.43.8
  - @effect/platform-node@0.42.8

## 0.30.7

### Patch Changes

- Updated dependencies [[`cde08f3`](https://github.com/Effect-TS/effect/commit/cde08f354ed2ff2921d1d98bd539c7d65a2ddd73)]:
  - @effect/platform@0.43.7
  - @effect/platform-node@0.42.7

## 0.30.6

### Patch Changes

- Updated dependencies [[`c96bb17`](https://github.com/Effect-TS/effect/commit/c96bb17043e2cec1eaeb319614a4c2904d876beb)]:
  - @effect/platform@0.43.6
  - @effect/platform-node@0.42.6

## 0.30.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.5
  - @effect/platform-node@0.42.5

## 0.30.4

### Patch Changes

- [#1999](https://github.com/Effect-TS/effect/pull/1999) [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure forked fibers are interruptible

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247), [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52)]:
  - effect@2.2.3
  - @effect/platform-node@0.42.4
  - @effect/platform@0.43.4

## 0.30.3

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.3
  - @effect/platform-node@0.42.3

## 0.30.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.2
  - @effect/platform-node@0.42.2

## 0.30.1

### Patch Changes

- Updated dependencies [[`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b)]:
  - effect@2.2.2
  - @effect/platform@0.43.1
  - @effect/platform-node@0.42.1

## 0.30.0

### Minor Changes

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764)]:
  - effect@2.2.1
  - @effect/platform-node@0.42.0
  - @effect/platform@0.43.0

## 0.29.8

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`fe05ad7`](https://github.com/Effect-TS/effect/commit/fe05ad7bcb3b88d47800ab69ebf53641023676f1), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0
  - @effect/platform@0.42.7
  - @effect/platform-node@0.41.8

## 0.29.7

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2
  - @effect/platform@0.42.6
  - @effect/platform-node@0.41.7

## 0.29.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.42.5
  - @effect/platform-node@0.41.6

## 0.29.5

### Patch Changes

- Updated dependencies [[`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - effect@2.1.1
  - @effect/platform@0.42.4
  - @effect/platform-node@0.41.5

## 0.29.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.42.3
  - @effect/platform-node@0.41.4

## 0.29.3

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0
  - @effect/platform@0.42.2
  - @effect/platform-node@0.41.3

## 0.29.2

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5
  - @effect/platform@0.42.1
  - @effect/platform-node@0.41.2

## 0.29.1

### Patch Changes

- Updated dependencies [[`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`71ed54c`](https://github.com/Effect-TS/effect/commit/71ed54c3fbb1ead5da2776bc6207050cb073ada4), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`48a3d40`](https://github.com/Effect-TS/effect/commit/48a3d40aed0f923f567b8911dade732ff472d981)]:
  - effect@2.0.4
  - @effect/platform-node@0.41.1
  - @effect/platform@0.42.0

## 0.29.0

### Minor Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - lift worker shutdown to /platform implementation

### Patch Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid killing all fibers on interrupt

- Updated dependencies [[`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - effect@2.0.3
  - @effect/platform-node@0.41.0
  - @effect/platform@0.41.0

## 0.28.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.40.4
  - @effect/platform-node@0.40.4

## 0.28.3

### Patch Changes

- [#1879](https://github.com/Effect-TS/effect/pull/1879) [`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af) Thanks [@tim-smart](https://github.com/tim-smart)! - add http Multiplex module

- Updated dependencies [[`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af)]:
  - @effect/platform-node@0.40.3
  - @effect/platform@0.40.3

## 0.28.2

### Patch Changes

- Updated dependencies [[`4c90c54`](https://github.com/Effect-TS/effect/commit/4c90c54d87c91f75f3ad114926cdf3b0c25df091), [`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c), [`d3d3bda`](https://github.com/Effect-TS/effect/commit/d3d3bda74c794153def9027e0c40896e72cd5d14)]:
  - @effect/platform@0.40.2
  - effect@2.0.2
  - @effect/platform-node@0.40.2

## 0.28.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1
  - @effect/platform@0.40.1
  - @effect/platform-node@0.40.1

## 0.28.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

- [#1846](https://github.com/Effect-TS/effect/pull/1846) [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f) Thanks [@fubhy](https://github.com/fubhy)! - Enabled `exactOptionalPropertyTypes` throughout

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`99d22cb`](https://github.com/Effect-TS/effect/commit/99d22cbee13cc2111a4a634cbe73b9b7d7fd88c7), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747), [`c0aeb5e`](https://github.com/Effect-TS/effect/commit/c0aeb5e302869bcd7d7627f8cc5b630d07c12d10), [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f)]:
  - @effect/platform-node@0.40.0
  - @effect/platform@0.40.0
  - effect@2.0.0

## 0.27.0

### Minor Changes

- [#369](https://github.com/Effect-TS/platform/pull/369) [`5d5f62b`](https://github.com/Effect-TS/platform/commit/5d5f62b03ffdbca0a986d968e1dbb45886dfa827) Thanks [@tim-smart](https://github.com/tim-smart)! - rename server FormData module to Multipart

- [#372](https://github.com/Effect-TS/platform/pull/372) [`15784c9`](https://github.com/Effect-TS/platform/commit/15784c920dcae40f328bb45ac850987135207365) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#373](https://github.com/Effect-TS/platform/pull/373) [`b042ba5`](https://github.com/Effect-TS/platform/commit/b042ba5ae78a1eed592e543c233fe3040d6a60da) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`5d5f62b`](https://github.com/Effect-TS/platform/commit/5d5f62b03ffdbca0a986d968e1dbb45886dfa827), [`15784c9`](https://github.com/Effect-TS/platform/commit/15784c920dcae40f328bb45ac850987135207365), [`b042ba5`](https://github.com/Effect-TS/platform/commit/b042ba5ae78a1eed592e543c233fe3040d6a60da), [`49fb154`](https://github.com/Effect-TS/platform/commit/49fb15439f18701321db8ded839243b9dd8de71a)]:
  - @effect/platform-node@0.39.0
  - @effect/platform@0.39.0

## 0.26.0

### Minor Changes

- [#367](https://github.com/Effect-TS/platform/pull/367) [`7d1584b`](https://github.com/Effect-TS/platform/commit/7d1584b23d464651c206201ff304c6eb4bebfc3a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`7d1584b`](https://github.com/Effect-TS/platform/commit/7d1584b23d464651c206201ff304c6eb4bebfc3a)]:
  - @effect/platform-node@0.38.0
  - @effect/platform@0.38.0

## 0.25.10

### Patch Changes

- [#366](https://github.com/Effect-TS/platform/pull/366) [`1d6bf73`](https://github.com/Effect-TS/platform/commit/1d6bf730dad0a6bbb282f436ec7d5870de76ca3a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Scope to every http request

- [#365](https://github.com/Effect-TS/platform/pull/365) [`3351136`](https://github.com/Effect-TS/platform/commit/335113601c238104eb2e331d26b5e463bde80dff) Thanks [@tim-smart](https://github.com/tim-smart)! - respond with 503 on server induced interrupt

- Updated dependencies [[`e2c545a`](https://github.com/Effect-TS/platform/commit/e2c545a328c2bccbba661540a8835b10bce4b438), [`1d6bf73`](https://github.com/Effect-TS/platform/commit/1d6bf730dad0a6bbb282f436ec7d5870de76ca3a), [`3351136`](https://github.com/Effect-TS/platform/commit/335113601c238104eb2e331d26b5e463bde80dff)]:
  - @effect/platform@0.37.8
  - @effect/platform-node@0.37.10

## 0.25.9

### Patch Changes

- Updated dependencies [[`df3af6b`](https://github.com/Effect-TS/platform/commit/df3af6be61572bab15004bbca2c5739d8206f3c3)]:
  - @effect/platform@0.37.7
  - @effect/platform-node@0.37.9

## 0.25.8

### Patch Changes

- Updated dependencies [[`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364), [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364)]:
  - @effect/platform-node@0.37.8
  - @effect/platform@0.37.6

## 0.25.7

### Patch Changes

- [#357](https://github.com/Effect-TS/platform/pull/357) [`6db1c07`](https://github.com/Effect-TS/platform/commit/6db1c0768d8afd8a45c0af31cbdfc40c9319e48b) Thanks [@tim-smart](https://github.com/tim-smart)! - respond witu 499 on interrupt

- Updated dependencies [[`6db1c07`](https://github.com/Effect-TS/platform/commit/6db1c0768d8afd8a45c0af31cbdfc40c9319e48b)]:
  - @effect/platform-node@0.37.7

## 0.25.6

### Patch Changes

- [#354](https://github.com/Effect-TS/platform/pull/354) [`190bc84`](https://github.com/Effect-TS/platform/commit/190bc84b137a729a38b6812e220085b3d12cb124) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer support to SerializedWorker

- Updated dependencies [[`190bc84`](https://github.com/Effect-TS/platform/commit/190bc84b137a729a38b6812e220085b3d12cb124)]:
  - @effect/platform-node@0.37.6
  - @effect/platform@0.37.5

## 0.25.5

### Patch Changes

- [#352](https://github.com/Effect-TS/platform/pull/352) [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d) Thanks [@tim-smart](https://github.com/tim-smart)! - interrupt all fibers on worker interrupt

- Updated dependencies [[`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d), [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d)]:
  - @effect/platform-node@0.37.5
  - @effect/platform@0.37.4

## 0.25.4

### Patch Changes

- [#350](https://github.com/Effect-TS/platform/pull/350) [`b30e5e3`](https://github.com/Effect-TS/platform/commit/b30e5e3874f22037f92253037fff6952f537ee40) Thanks [@tim-smart](https://github.com/tim-smart)! - add decode option to worker runner

- Updated dependencies [[`b30e5e3`](https://github.com/Effect-TS/platform/commit/b30e5e3874f22037f92253037fff6952f537ee40)]:
  - @effect/platform-node@0.37.4
  - @effect/platform@0.37.3

## 0.25.3

### Patch Changes

- [#348](https://github.com/Effect-TS/platform/pull/348) [`28edc60`](https://github.com/Effect-TS/platform/commit/28edc60d2fcd30160529c677a9ffd786775e534b) Thanks [@tim-smart](https://github.com/tim-smart)! - add layer worker runner apis

- Updated dependencies [[`28edc60`](https://github.com/Effect-TS/platform/commit/28edc60d2fcd30160529c677a9ffd786775e534b)]:
  - @effect/platform-node@0.37.3
  - @effect/platform@0.37.2

## 0.25.2

### Patch Changes

- Updated dependencies [[`c0fdc3d`](https://github.com/Effect-TS/platform/commit/c0fdc3df8d8fc057fc388f5cb1a17d707d54f3eb)]:
  - @effect/platform-node@0.37.2

## 0.25.1

### Patch Changes

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support error and output transfers in worker runners

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support initialMessage in workers

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema transforms to Transferable

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - make worker encoding return Effects

- Updated dependencies [[`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7)]:
  - @effect/platform-node@0.37.1
  - @effect/platform@0.37.1

## 0.25.0

### Minor Changes

- [#341](https://github.com/Effect-TS/platform/pull/341) [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /platform-\*

### Patch Changes

- Updated dependencies [[`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1), [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1)]:
  - @effect/platform-node@0.37.0
  - @effect/platform@0.37.0

## 0.24.0

### Minor Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - change http serve api to return immediately

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - Http.server.serve now returns a Layer

### Patch Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.server.serveEffect

- Updated dependencies [[`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a), [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a), [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a)]:
  - @effect/platform-node@0.36.0
  - @effect/platform@0.36.0

## 0.23.1

### Patch Changes

- [#335](https://github.com/Effect-TS/platform/pull/335) [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e) Thanks [@tim-smart](https://github.com/tim-smart)! - add SerializedWorker

- Updated dependencies [[`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e), [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e)]:
  - @effect/platform-node@0.35.1
  - @effect/platform@0.35.0

## 0.23.0

### Minor Changes

- [#331](https://github.com/Effect-TS/platform/pull/331) [`db1ca18`](https://github.com/Effect-TS/platform/commit/db1ca18725f9dd4be1c36ddc80faa3aa53c10eb7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`db1ca18`](https://github.com/Effect-TS/platform/commit/db1ca18725f9dd4be1c36ddc80faa3aa53c10eb7)]:
  - @effect/platform-node@0.35.0
  - @effect/platform@0.34.0

## 0.22.3

### Patch Changes

- Updated dependencies [[`5c75749`](https://github.com/Effect-TS/platform/commit/5c75749d451f8e79e1cb8057729691e4b3c1c6aa)]:
  - @effect/platform-node@0.34.3

## 0.22.2

### Patch Changes

- Updated dependencies [[`162aa91`](https://github.com/Effect-TS/platform/commit/162aa915934112983c543a6be2a9d7091b86fac9)]:
  - @effect/platform@0.33.1
  - @effect/platform-node@0.34.2

## 0.22.1

### Patch Changes

- [#324](https://github.com/Effect-TS/platform/pull/324) [`6b90c81`](https://github.com/Effect-TS/platform/commit/6b90c81391e613a25db564aebb9a64971ce077a5) Thanks [@tim-smart](https://github.com/tim-smart)! - improve serve api

- Updated dependencies [[`6b90c81`](https://github.com/Effect-TS/platform/commit/6b90c81391e613a25db564aebb9a64971ce077a5)]:
  - @effect/platform-node@0.34.1

## 0.22.0

### Minor Changes

- [#321](https://github.com/Effect-TS/platform/pull/321) [`16a5bca`](https://github.com/Effect-TS/platform/commit/16a5bca2bd4aed570ce95233a0e47350010d031f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed), [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed), [`16a5bca`](https://github.com/Effect-TS/platform/commit/16a5bca2bd4aed570ce95233a0e47350010d031f)]:
  - @effect/platform-node@0.34.0
  - @effect/platform@0.33.0

## 0.21.5

### Patch Changes

- Updated dependencies [[`19431f0`](https://github.com/Effect-TS/platform/commit/19431f0b5ccb8beacd502de876962f55cabf6ed4)]:
  - @effect/platform-node@0.33.5

## 0.21.4

### Patch Changes

- Updated dependencies [[`e63cf81`](https://github.com/Effect-TS/platform/commit/e63cf819dc26588e29a0177afb1665aa5fd96dfd)]:
  - @effect/platform-node@0.33.4

## 0.21.3

### Patch Changes

- Updated dependencies [[`cc1f588`](https://github.com/Effect-TS/platform/commit/cc1f5886bf4188e0128b64b9e2a67f789680cab0)]:
  - @effect/platform-node@0.33.3
  - @effect/platform@0.32.2

## 0.21.2

### Patch Changes

- [#310](https://github.com/Effect-TS/platform/pull/310) [`14239fb`](https://github.com/Effect-TS/platform/commit/14239fb11ae45db1a02d9ba883d0412a9c9e6343) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`14239fb`](https://github.com/Effect-TS/platform/commit/14239fb11ae45db1a02d9ba883d0412a9c9e6343)]:
  - @effect/platform-node@0.33.2
  - @effect/platform@0.32.1

## 0.21.1

### Patch Changes

- Updated dependencies [[`4da9a1b`](https://github.com/Effect-TS/platform/commit/4da9a1b73f7644561eab5d7d0d3dcc3b1b8b9b64)]:
  - @effect/platform-node@0.33.1

## 0.21.0

### Minor Changes

- [#307](https://github.com/Effect-TS/platform/pull/307) [`746f969`](https://github.com/Effect-TS/platform/commit/746f9692e2f7133dcb413e0eea08ac7b6b97a9bd) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`746f969`](https://github.com/Effect-TS/platform/commit/746f9692e2f7133dcb413e0eea08ac7b6b97a9bd), [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d), [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d)]:
  - @effect/platform@0.32.0
  - @effect/platform-node@0.33.0

## 0.20.3

### Patch Changes

- Updated dependencies [[`7a46ec6`](https://github.com/Effect-TS/platform/commit/7a46ec679e2d4718919c407d0c6c5f0fdc35e62d)]:
  - @effect/platform@0.31.2
  - @effect/platform-node@0.32.3

## 0.20.2

### Patch Changes

- Updated dependencies [[`2f1ca0c`](https://github.com/Effect-TS/platform/commit/2f1ca0cd6d39062fef5717f322cec6767f243def)]:
  - @effect/platform-node@0.32.2

## 0.20.1

### Patch Changes

- [#293](https://github.com/Effect-TS/platform/pull/293) [`5a7d254`](https://github.com/Effect-TS/platform/commit/5a7d25406b0841cf6ec49218bd3324a4ddc3df5b) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure http methods are uppercase

- Updated dependencies [[`b712491`](https://github.com/Effect-TS/platform/commit/b71249168eb4623de8dbd28cd0102be688f5caa3), [`5a7d254`](https://github.com/Effect-TS/platform/commit/5a7d25406b0841cf6ec49218bd3324a4ddc3df5b)]:
  - @effect/platform@0.31.1
  - @effect/platform-node@0.32.1

## 0.20.0

### Minor Changes

- [#291](https://github.com/Effect-TS/platform/pull/291) [`5a677f1`](https://github.com/Effect-TS/platform/commit/5a677f1062d7373e21839dfa51db26beef15dca4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#289](https://github.com/Effect-TS/platform/pull/289) [`624855f`](https://github.com/Effect-TS/platform/commit/624855f635162b2c1232429253477d0805e02657) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

- Updated dependencies [[`5a677f1`](https://github.com/Effect-TS/platform/commit/5a677f1062d7373e21839dfa51db26beef15dca4), [`624855f`](https://github.com/Effect-TS/platform/commit/624855f635162b2c1232429253477d0805e02657)]:
  - @effect/platform-node@0.32.0
  - @effect/platform@0.31.0

## 0.19.9

### Patch Changes

- Updated dependencies [[`d5d0932`](https://github.com/Effect-TS/platform/commit/d5d093219cde4f51afb9251d9ba4270fc70be0c1)]:
  - @effect/platform@0.30.6
  - @effect/platform-node@0.31.9

## 0.19.8

### Patch Changes

- [#285](https://github.com/Effect-TS/platform/pull/285) [`a13377b`](https://github.com/Effect-TS/platform/commit/a13377b21b1369947f76d1719dd0b4acc5c64086) Thanks [@IMax153](https://github.com/IMax153)! - avoid mutating global state with Terminal service

- Updated dependencies [[`a13377b`](https://github.com/Effect-TS/platform/commit/a13377b21b1369947f76d1719dd0b4acc5c64086)]:
  - @effect/platform-node@0.31.8

## 0.19.7

### Patch Changes

- [#283](https://github.com/Effect-TS/platform/pull/283) [`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2) Thanks [@tim-smart](https://github.com/tim-smart)! - add WorkerManager to Node/BunContext

- [#283](https://github.com/Effect-TS/platform/pull/283) [`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Terminal from Node/BunContext

- Updated dependencies [[`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2), [`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2)]:
  - @effect/platform-node@0.31.7

## 0.19.6

### Patch Changes

- [#280](https://github.com/Effect-TS/platform/pull/280) [`d8e2234`](https://github.com/Effect-TS/platform/commit/d8e2234bc2fa0794e2a4b6a693ae1e7c1836bfb8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Recursive interrupt all fibers on kill

- Updated dependencies [[`534cb34`](https://github.com/Effect-TS/platform/commit/534cb3486b55e08f9c9cb3f0d955b04da128986c), [`534cb34`](https://github.com/Effect-TS/platform/commit/534cb3486b55e08f9c9cb3f0d955b04da128986c), [`d8e2234`](https://github.com/Effect-TS/platform/commit/d8e2234bc2fa0794e2a4b6a693ae1e7c1836bfb8)]:
  - @effect/platform-node@0.31.6

## 0.19.5

### Patch Changes

- Updated dependencies [[`36e449c`](https://github.com/Effect-TS/platform/commit/36e449c95fab80dc54505cef2071dcbecce35b4f)]:
  - @effect/platform@0.30.5
  - @effect/platform-node@0.31.5

## 0.19.4

### Patch Changes

- [#275](https://github.com/Effect-TS/platform/pull/275) [`e28989e`](https://github.com/Effect-TS/platform/commit/e28989ebd1813cec7ce68f7dd8718f2254e05cad) Thanks [@tim-smart](https://github.com/tim-smart)! - add stack to WorkerError

- Updated dependencies [[`e28989e`](https://github.com/Effect-TS/platform/commit/e28989ebd1813cec7ce68f7dd8718f2254e05cad)]:
  - @effect/platform-node@0.31.4
  - @effect/platform@0.30.4

## 0.19.3

### Patch Changes

- [#273](https://github.com/Effect-TS/platform/pull/273) [`589cd44`](https://github.com/Effect-TS/platform/commit/589cd4440d48f42d8bf19b72d1c2996f68ba56bf) Thanks [@tim-smart](https://github.com/tim-smart)! - use removeEventListener over signal

- [#272](https://github.com/Effect-TS/platform/pull/272) [`1a055ac`](https://github.com/Effect-TS/platform/commit/1a055ac959faf12e9c57768b20babea12b1f7d2d) Thanks [@tim-smart](https://github.com/tim-smart)! - add WorkerError to send api

- Updated dependencies [[`1a055ac`](https://github.com/Effect-TS/platform/commit/1a055ac959faf12e9c57768b20babea12b1f7d2d)]:
  - @effect/platform-node@0.31.3
  - @effect/platform@0.30.3

## 0.19.2

### Patch Changes

- Updated dependencies [[`3257fd5`](https://github.com/Effect-TS/platform/commit/3257fd52016af5a38c135de5f0aa33aac7de2538)]:
  - @effect/platform-node@0.31.2
  - @effect/platform@0.30.2

## 0.19.1

### Patch Changes

- Updated dependencies [[`58f5ccc`](https://github.com/Effect-TS/platform/commit/58f5ccc07d74abe6820debc0179665e5ef76b5c4)]:
  - @effect/platform-node@0.31.1
  - @effect/platform@0.30.1

## 0.19.0

### Minor Changes

- [#267](https://github.com/Effect-TS/platform/pull/267) [`3d38b40`](https://github.com/Effect-TS/platform/commit/3d38b40a939e32c6c0e8b62dd53a844a6f389182) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`3d38b40`](https://github.com/Effect-TS/platform/commit/3d38b40a939e32c6c0e8b62dd53a844a6f389182)]:
  - @effect/platform-node@0.31.0
  - @effect/platform@0.30.0

## 0.18.1

### Patch Changes

- Updated dependencies [[`2bbe692`](https://github.com/Effect-TS/platform/commit/2bbe6928aa5e6929e58877ba236547310bca7e2b)]:
  - @effect/platform-node@0.30.1
  - @effect/platform@0.29.1

## 0.18.0

### Minor Changes

- [#250](https://github.com/Effect-TS/platform/pull/250) [`6e18090`](https://github.com/Effect-TS/platform/commit/6e18090db4686cd5564ab9dc3d8771d7b3ad97fa) Thanks [@tim-smart](https://github.com/tim-smart)! - updated FormData model and apis

### Patch Changes

- Updated dependencies [[`6e18090`](https://github.com/Effect-TS/platform/commit/6e18090db4686cd5564ab9dc3d8771d7b3ad97fa)]:
  - @effect/platform-node@0.30.0
  - @effect/platform@0.29.0

## 0.17.4

### Patch Changes

- Updated dependencies [[`8f5e6a2`](https://github.com/Effect-TS/platform/commit/8f5e6a2f2ced4408b0b311b0456828855e1cb958)]:
  - @effect/platform-node@0.29.4
  - @effect/platform@0.28.4

## 0.17.3

### Patch Changes

- Updated dependencies [[`9f79c1f`](https://github.com/Effect-TS/platform/commit/9f79c1f5278e60b3bcbd59f08e20189bcb25a84e)]:
  - @effect/platform@0.28.3
  - @effect/platform-node@0.29.3

## 0.17.2

### Patch Changes

- [#256](https://github.com/Effect-TS/platform/pull/256) [`62cbddb`](https://github.com/Effect-TS/platform/commit/62cbddb530371291123dea220bfebcc0521b54df) Thanks [@jessekelly881](https://github.com/jessekelly881)! - fix: added missing File type export

- [#255](https://github.com/Effect-TS/platform/pull/255) [`fea76da`](https://github.com/Effect-TS/platform/commit/fea76da05190a65912911bd5b6f9cc0bef3b2edc) Thanks [@IMax153](https://github.com/IMax153)! - add basic Terminal interface for prompting user input

- Updated dependencies [[`62cbddb`](https://github.com/Effect-TS/platform/commit/62cbddb530371291123dea220bfebcc0521b54df), [`fea76da`](https://github.com/Effect-TS/platform/commit/fea76da05190a65912911bd5b6f9cc0bef3b2edc)]:
  - @effect/platform-node@0.29.2
  - @effect/platform@0.28.2

## 0.17.1

### Patch Changes

- [#253](https://github.com/Effect-TS/platform/pull/253) [`43d2e29`](https://github.com/Effect-TS/platform/commit/43d2e2984fe88b39e907f45f089206ed88ad52d1) Thanks [@fubhy](https://github.com/fubhy)! - Update dependencies

- Updated dependencies [[`43d2e29`](https://github.com/Effect-TS/platform/commit/43d2e2984fe88b39e907f45f089206ed88ad52d1)]:
  - @effect/platform-node@0.29.1
  - @effect/platform@0.28.1

## 0.17.0

### Minor Changes

- [#251](https://github.com/Effect-TS/platform/pull/251) [`05fef78`](https://github.com/Effect-TS/platform/commit/05fef784ac975059fb6335576feadc7f34644314) Thanks [@fubhy](https://github.com/fubhy)! - Re-added exports for http module

### Patch Changes

- Updated dependencies [[`05fef78`](https://github.com/Effect-TS/platform/commit/05fef784ac975059fb6335576feadc7f34644314)]:
  - @effect/platform-node@0.29.0
  - @effect/platform@0.28.0

## 0.16.4

### Patch Changes

- Updated dependencies [[`8a4b1c1`](https://github.com/Effect-TS/platform/commit/8a4b1c14808d9815eb93a5b10d8a5b26c4dd027b)]:
  - @effect/platform-node@0.28.4
  - @effect/platform@0.27.4

## 0.16.3

### Patch Changes

- [#243](https://github.com/Effect-TS/platform/pull/243) [`1ac0a42`](https://github.com/Effect-TS/platform/commit/1ac0a4208184ef1d23d5ad41a7f0e32bc4d80d85) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker interruption

- Updated dependencies [[`1ac0a42`](https://github.com/Effect-TS/platform/commit/1ac0a4208184ef1d23d5ad41a7f0e32bc4d80d85)]:
  - @effect/platform-node@0.28.3
  - @effect/platform@0.27.3

## 0.16.2

### Patch Changes

- [#241](https://github.com/Effect-TS/platform/pull/241) [`e2aa7cd`](https://github.com/Effect-TS/platform/commit/e2aa7cd606a735809fbf79327cfebc009e89d84d) Thanks [@tim-smart](https://github.com/tim-smart)! - decrease bun worker close timeout

- Updated dependencies [[`e2aa7cd`](https://github.com/Effect-TS/platform/commit/e2aa7cd606a735809fbf79327cfebc009e89d84d)]:
  - @effect/platform@0.27.2
  - @effect/platform-node@0.28.2

## 0.16.1

### Patch Changes

- [#239](https://github.com/Effect-TS/platform/pull/239) [`4d94b9d`](https://github.com/Effect-TS/platform/commit/4d94b9d30adba2bf4f6f6e1d4cd735e6362667c5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`4d94b9d`](https://github.com/Effect-TS/platform/commit/4d94b9d30adba2bf4f6f6e1d4cd735e6362667c5)]:
  - @effect/platform-node@0.28.1
  - @effect/platform@0.27.1

## 0.16.0

### Minor Changes

- [#237](https://github.com/Effect-TS/platform/pull/237) [`1f79ed6`](https://github.com/Effect-TS/platform/commit/1f79ed6b4d2ee9ae2b59c4536854566c579e77c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`1f79ed6`](https://github.com/Effect-TS/platform/commit/1f79ed6b4d2ee9ae2b59c4536854566c579e77c4)]:
  - @effect/platform-node@0.28.0
  - @effect/platform@0.27.0

## 0.15.9

### Patch Changes

- [#235](https://github.com/Effect-TS/platform/pull/235) [`6e14c02`](https://github.com/Effect-TS/platform/commit/6e14c02db668f380bb92f19037685fe40592a8fe) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for hanging worker shutdown

- Updated dependencies [[`6e14c02`](https://github.com/Effect-TS/platform/commit/6e14c02db668f380bb92f19037685fe40592a8fe)]:
  - @effect/platform-node@0.27.9
  - @effect/platform@0.26.7

## 0.15.8

### Patch Changes

- [#233](https://github.com/Effect-TS/platform/pull/233) [`71947e0`](https://github.com/Effect-TS/platform/commit/71947e0e0aa9dccf9aad6f63dd98a6b6c89f23b4) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker scope hanging on close

- Updated dependencies [[`71947e0`](https://github.com/Effect-TS/platform/commit/71947e0e0aa9dccf9aad6f63dd98a6b6c89f23b4)]:
  - @effect/platform-node@0.27.8
  - @effect/platform@0.26.6

## 0.15.7

### Patch Changes

- [#231](https://github.com/Effect-TS/platform/pull/231) [`a3cbba4`](https://github.com/Effect-TS/platform/commit/a3cbba4a0fa0f1ef99a6d7e54f5ab46c6813ef00) Thanks [@tim-smart](https://github.com/tim-smart)! - add onCreate and broadcast to pool options

- Updated dependencies [[`a3cbba4`](https://github.com/Effect-TS/platform/commit/a3cbba4a0fa0f1ef99a6d7e54f5ab46c6813ef00)]:
  - @effect/platform-node@0.27.7
  - @effect/platform@0.26.5

## 0.15.6

### Patch Changes

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - type worker runner success as never

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - disable worker pool scaling

- Updated dependencies [[`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09), [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09)]:
  - @effect/platform-node@0.27.6
  - @effect/platform@0.26.4

## 0.15.5

### Patch Changes

- Updated dependencies [[`abb6baa`](https://github.com/Effect-TS/platform/commit/abb6baa61346580f97d2ab91b84a7342b5becc60)]:
  - @effect/platform@0.26.3
  - @effect/platform-node@0.27.5

## 0.15.4

### Patch Changes

- [#223](https://github.com/Effect-TS/platform/pull/223) [`3ab8299`](https://github.com/Effect-TS/platform/commit/3ab82991a21e15b4b7f5e53bc2d6e5a807f23698) Thanks [@tim-smart](https://github.com/tim-smart)! - add apis to access underlying http request source

- Updated dependencies [[`3ab8299`](https://github.com/Effect-TS/platform/commit/3ab82991a21e15b4b7f5e53bc2d6e5a807f23698), [`3ab8299`](https://github.com/Effect-TS/platform/commit/3ab82991a21e15b4b7f5e53bc2d6e5a807f23698)]:
  - @effect/platform-node@0.27.4

## 0.15.3

### Patch Changes

- [#221](https://github.com/Effect-TS/platform/pull/221) [`3e57e82`](https://github.com/Effect-TS/platform/commit/3e57e8224bf7b4474b21ef1dc25db13107d9b635) Thanks [@tim-smart](https://github.com/tim-smart)! - export WorkerRunner layers

- Updated dependencies [[`3e57e82`](https://github.com/Effect-TS/platform/commit/3e57e8224bf7b4474b21ef1dc25db13107d9b635)]:
  - @effect/platform-node@0.27.3

## 0.15.2

### Patch Changes

- Updated dependencies [[`f37f58c`](https://github.com/Effect-TS/platform/commit/f37f58ca21c1d5dfedc40c01cde0ffbc954d7e32)]:
  - @effect/platform@0.26.2
  - @effect/platform-node@0.27.2

## 0.15.1

### Patch Changes

- Updated dependencies [[`7471ac1`](https://github.com/Effect-TS/platform/commit/7471ac139f3c6867cd0d228ec54e88abd1384f5c)]:
  - @effect/platform@0.26.1
  - @effect/platform-node@0.27.1

## 0.15.0

### Minor Changes

- [#215](https://github.com/Effect-TS/platform/pull/215) [`59da2a6`](https://github.com/Effect-TS/platform/commit/59da2a6877e219b2ca0433aeeecab4ad7487816b) Thanks [@tim-smart](https://github.com/tim-smart)! - seperate request processing in http client

### Patch Changes

- Updated dependencies [[`59da2a6`](https://github.com/Effect-TS/platform/commit/59da2a6877e219b2ca0433aeeecab4ad7487816b)]:
  - @effect/platform@0.26.0
  - @effect/platform-node@0.27.0

## 0.14.1

### Patch Changes

- [#213](https://github.com/Effect-TS/platform/pull/213) [`38a49eb`](https://github.com/Effect-TS/platform/commit/38a49eb6ea99ef773007a98ec262898207c8f3c7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`38a49eb`](https://github.com/Effect-TS/platform/commit/38a49eb6ea99ef773007a98ec262898207c8f3c7)]:
  - @effect/platform-node@0.26.1
  - @effect/platform@0.25.1

## 0.14.0

### Minor Changes

- [#211](https://github.com/Effect-TS/platform/pull/211) [`9ec45cb`](https://github.com/Effect-TS/platform/commit/9ec45cba6b7d5016079ccad9357934f12afe8750) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`9ec45cb`](https://github.com/Effect-TS/platform/commit/9ec45cba6b7d5016079ccad9357934f12afe8750)]:
  - @effect/platform-node@0.26.0
  - @effect/platform@0.25.0

## 0.13.0

### Minor Changes

- [#209](https://github.com/Effect-TS/platform/pull/209) [`9c51aa1`](https://github.com/Effect-TS/platform/commit/9c51aa18beb7fd34023863ca069d3dde372765d8) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`9c51aa1`](https://github.com/Effect-TS/platform/commit/9c51aa18beb7fd34023863ca069d3dde372765d8)]:
  - @effect/platform-node@0.25.0
  - @effect/platform@0.24.0

## 0.12.1

### Patch Changes

- Updated dependencies [[`b47639b`](https://github.com/Effect-TS/platform/commit/b47639b1df021beb075469921e9ef7a08c174555), [`41f8a65`](https://github.com/Effect-TS/platform/commit/41f8a650238bfbac5b8e18d58a431c3605b71aa5)]:
  - @effect/platform-node@0.24.1
  - @effect/platform@0.23.1

## 0.12.0

### Minor Changes

- [#204](https://github.com/Effect-TS/platform/pull/204) [`ee0c08f`](https://github.com/Effect-TS/platform/commit/ee0c08fd9828eae32696da1bde33d50a3ad9edf3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`ee0c08f`](https://github.com/Effect-TS/platform/commit/ee0c08fd9828eae32696da1bde33d50a3ad9edf3)]:
  - @effect/platform-node@0.24.0
  - @effect/platform@0.23.0

## 0.11.2

### Patch Changes

- [#194](https://github.com/Effect-TS/platform/pull/194) [`79b71d8`](https://github.com/Effect-TS/platform/commit/79b71d8cb3aa6520b2dcb7930850b423174e04b2) Thanks [@tim-smart](https://github.com/tim-smart)! - add Worker & WorkerRunner modules

- Updated dependencies [[`79b71d8`](https://github.com/Effect-TS/platform/commit/79b71d8cb3aa6520b2dcb7930850b423174e04b2)]:
  - @effect/platform-node@0.23.2
  - @effect/platform@0.22.1

## 0.11.1

### Patch Changes

- Updated dependencies [[`58a002a`](https://github.com/Effect-TS/platform/commit/58a002acaafdb31e601c0de1878f4a8dee723e13)]:
  - @effect/platform-node@0.23.1

## 0.11.0

### Minor Changes

- [#199](https://github.com/Effect-TS/platform/pull/199) [`1e94b15`](https://github.com/Effect-TS/platform/commit/1e94b1588e51df20f9c4fc4871b246048751506c) Thanks [@tim-smart](https://github.com/tim-smart)! - enable tracing by default

### Patch Changes

- Updated dependencies [[`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559), [`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559), [`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559), [`1e94b15`](https://github.com/Effect-TS/platform/commit/1e94b1588e51df20f9c4fc4871b246048751506c)]:
  - @effect/platform-node@0.23.0
  - @effect/platform@0.22.0

## 0.10.1

### Patch Changes

- Updated dependencies [[`25ce726`](https://github.com/Effect-TS/platform/commit/25ce72656a9addbb1f4d539ea69423b73fe43f46)]:
  - @effect/platform-node@0.22.1

## 0.10.0

### Minor Changes

- [#193](https://github.com/Effect-TS/platform/pull/193) [`9ec4b1d`](https://github.com/Effect-TS/platform/commit/9ec4b1d284caa1c4f19a58c46ed7c25fb10d39a5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#191](https://github.com/Effect-TS/platform/pull/191) [`2711aea`](https://github.com/Effect-TS/platform/commit/2711aea855936c82c282e61fbc6d2f1a1ab6778a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`2711aea`](https://github.com/Effect-TS/platform/commit/2711aea855936c82c282e61fbc6d2f1a1ab6778a), [`9ec4b1d`](https://github.com/Effect-TS/platform/commit/9ec4b1d284caa1c4f19a58c46ed7c25fb10d39a5)]:
  - @effect/platform-node@0.22.0
  - @effect/platform@0.21.0

## 0.9.0

### Minor Changes

- [#189](https://github.com/Effect-TS/platform/pull/189) [`b07f8cd`](https://github.com/Effect-TS/platform/commit/b07f8cd50ef44d577aa981a532025aedb364df13) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`b07f8cd`](https://github.com/Effect-TS/platform/commit/b07f8cd50ef44d577aa981a532025aedb364df13)]:
  - @effect/platform-node@0.21.0
  - @effect/platform@0.20.0

## 0.8.1

### Patch Changes

- [#187](https://github.com/Effect-TS/platform/pull/187) [`26e05da`](https://github.com/Effect-TS/platform/commit/26e05dad112fa43403b23ebc815a98f0c95e0558) Thanks [@tim-smart](https://github.com/tim-smart)! - fix order of pre response access

- Updated dependencies [[`26e05da`](https://github.com/Effect-TS/platform/commit/26e05dad112fa43403b23ebc815a98f0c95e0558)]:
  - @effect/platform-node@0.20.1

## 0.8.0

### Minor Changes

- [#184](https://github.com/Effect-TS/platform/pull/184) [`903b599`](https://github.com/Effect-TS/platform/commit/903b5995bb407c399846e6b75e47e53098b2c80d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#186](https://github.com/Effect-TS/platform/pull/186) [`a3bcda4`](https://github.com/Effect-TS/platform/commit/a3bcda4c2c6655ab86769cca60bece5eb64f866e) Thanks [@tim-smart](https://github.com/tim-smart)! - add pre response handlers to http

- Updated dependencies [[`903b599`](https://github.com/Effect-TS/platform/commit/903b5995bb407c399846e6b75e47e53098b2c80d), [`a3bcda4`](https://github.com/Effect-TS/platform/commit/a3bcda4c2c6655ab86769cca60bece5eb64f866e)]:
  - @effect/platform-node@0.20.0
  - @effect/platform@0.19.0

## 0.7.9

### Patch Changes

- [#181](https://github.com/Effect-TS/platform/pull/181) [`d0d5458`](https://github.com/Effect-TS/platform/commit/d0d545869baeb91d594804ab759713f424eb7a11) Thanks [@tim-smart](https://github.com/tim-smart)! - fix error type exports

- Updated dependencies [[`d0d5458`](https://github.com/Effect-TS/platform/commit/d0d545869baeb91d594804ab759713f424eb7a11)]:
  - @effect/platform-node@0.19.9

## 0.7.8

### Patch Changes

- [#179](https://github.com/Effect-TS/platform/pull/179) [`843488f`](https://github.com/Effect-TS/platform/commit/843488f79b253518f131693faf2955f5c795a1bc) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`843488f`](https://github.com/Effect-TS/platform/commit/843488f79b253518f131693faf2955f5c795a1bc)]:
  - @effect/platform-node@0.19.8
  - @effect/platform@0.18.7

## 0.7.7

### Patch Changes

- Updated dependencies [[`6116f8b`](https://github.com/Effect-TS/platform/commit/6116f8b39533c897445713c7dce531c0c60a1cbb)]:
  - @effect/platform-node@0.19.7

## 0.7.6

### Patch Changes

- Updated dependencies [[`7e4e2a5`](https://github.com/Effect-TS/platform/commit/7e4e2a5d815c677e4eb6adb2c6e9369414a79384), [`d1c2b38`](https://github.com/Effect-TS/platform/commit/d1c2b38cbb1189249c0bfd47582e00ff771428e3)]:
  - @effect/platform@0.18.6
  - @effect/platform-node@0.19.6

## 0.7.5

### Patch Changes

- [#171](https://github.com/Effect-TS/platform/pull/171) [`fbbcaa9`](https://github.com/Effect-TS/platform/commit/fbbcaa9b1d4f48f204072a802fb11bcb29813664) Thanks [@tim-smart](https://github.com/tim-smart)! - remove preserveModules patch for preconstruct

- Updated dependencies [[`fbbcaa9`](https://github.com/Effect-TS/platform/commit/fbbcaa9b1d4f48f204072a802fb11bcb29813664)]:
  - @effect/platform-node@0.19.5
  - @effect/platform@0.18.5

## 0.7.4

### Patch Changes

- [#169](https://github.com/Effect-TS/platform/pull/169) [`bd8778d`](https://github.com/Effect-TS/platform/commit/bd8778d1a534f28cab4b326bb25c086fafed8101) Thanks [@tim-smart](https://github.com/tim-smart)! - fix nested modules

- Updated dependencies [[`bd8778d`](https://github.com/Effect-TS/platform/commit/bd8778d1a534f28cab4b326bb25c086fafed8101)]:
  - @effect/platform@0.18.4
  - @effect/platform-node@0.19.4

## 0.7.3

### Patch Changes

- [#167](https://github.com/Effect-TS/platform/pull/167) [`7027589`](https://github.com/Effect-TS/platform/commit/7027589d6dde621065eb8834a2b1ba4d3adc943b) Thanks [@tim-smart](https://github.com/tim-smart)! - build with preconstruct

- Updated dependencies [[`7027589`](https://github.com/Effect-TS/platform/commit/7027589d6dde621065eb8834a2b1ba4d3adc943b)]:
  - @effect/platform-node@0.19.3
  - @effect/platform@0.18.3

## 0.7.2

### Patch Changes

- [#165](https://github.com/Effect-TS/platform/pull/165) [`7e3a741`](https://github.com/Effect-TS/platform/commit/7e3a74197325566df47f9b4459e518eea0762d13) Thanks [@fubhy](https://github.com/fubhy)! - Fix peer deps version range

- Updated dependencies [[`7e3a741`](https://github.com/Effect-TS/platform/commit/7e3a74197325566df47f9b4459e518eea0762d13)]:
  - @effect/platform-node@0.19.2
  - @effect/platform@0.18.2

## 0.7.1

### Patch Changes

- [#163](https://github.com/Effect-TS/platform/pull/163) [`c957232`](https://github.com/Effect-TS/platform/commit/c9572328ee37f44e93e933da622b21df414bf5c6) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`c957232`](https://github.com/Effect-TS/platform/commit/c9572328ee37f44e93e933da622b21df414bf5c6)]:
  - @effect/platform-node@0.19.1
  - @effect/platform@0.18.1

## 0.7.0

### Minor Changes

- [#160](https://github.com/Effect-TS/platform/pull/160) [`c2dc0ab`](https://github.com/Effect-TS/platform/commit/c2dc0abb20b073fd19e38b4e61a08b1edee0f37f) Thanks [@fubhy](https://github.com/fubhy)! - update to effect package

### Patch Changes

- Updated dependencies [[`c2dc0ab`](https://github.com/Effect-TS/platform/commit/c2dc0abb20b073fd19e38b4e61a08b1edee0f37f)]:
  - @effect/platform-node@0.19.0
  - @effect/platform@0.18.0

## 0.6.1

### Patch Changes

- Updated dependencies [[`9b10bf3`](https://github.com/Effect-TS/platform/commit/9b10bf394106ba0bafd8440dc0b3fba30a5cc1ea)]:
  - @effect/platform@0.17.1
  - @effect/platform-node@0.18.1

## 0.6.0

### Minor Changes

- [#156](https://github.com/Effect-TS/platform/pull/156) [`e6c4101`](https://github.com/Effect-TS/platform/commit/e6c41011e5420d90c543dd25d87036d4150f3e85) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`e6c4101`](https://github.com/Effect-TS/platform/commit/e6c41011e5420d90c543dd25d87036d4150f3e85)]:
  - @effect/platform-node@0.18.0
  - @effect/platform@0.17.0

## 0.5.0

### Minor Changes

- [#153](https://github.com/Effect-TS/platform/pull/153) [`be1b6f0`](https://github.com/Effect-TS/platform/commit/be1b6f036246713a55462ec76e8d999eae654cd7) Thanks [@IMax153](https://github.com/IMax153)! - make platform-node an explicit dependency of platform-bun

- [#155](https://github.com/Effect-TS/platform/pull/155) [`937b9e5`](https://github.com/Effect-TS/platform/commit/937b9e5c00f80bea128f21c7f5bfa662ba1d45bd) Thanks [@tim-smart](https://github.com/tim-smart)! - use direct deps in sibling packages

### Patch Changes

- Updated dependencies [[`be1b6f0`](https://github.com/Effect-TS/platform/commit/be1b6f036246713a55462ec76e8d999eae654cd7), [`937b9e5`](https://github.com/Effect-TS/platform/commit/937b9e5c00f80bea128f21c7f5bfa662ba1d45bd)]:
  - @effect/platform-node@0.17.0

## 0.4.2

### Patch Changes

- Updated dependencies [[`ea877f8`](https://github.com/Effect-TS/platform/commit/ea877f8948a43a394658abf8b781a56a097624e9)]:
  - @effect/platform-node@0.16.2

## 0.4.1

### Patch Changes

- [#148](https://github.com/Effect-TS/platform/pull/148) [`492f0e7`](https://github.com/Effect-TS/platform/commit/492f0e700e939ded6ff17eeca4d50a9e1ce59219) Thanks [@tim-smart](https://github.com/tim-smart)! - add IncomingMessage.remoteAddress

- Updated dependencies [[`492f0e7`](https://github.com/Effect-TS/platform/commit/492f0e700e939ded6ff17eeca4d50a9e1ce59219)]:
  - @effect/platform-node@0.16.1

## 0.4.0

### Minor Changes

- [#145](https://github.com/Effect-TS/platform/pull/145) [`d0522be`](https://github.com/Effect-TS/platform/commit/d0522be6f824571d83be8c6aa16a3d7caa1b3447) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`d0522be`](https://github.com/Effect-TS/platform/commit/d0522be6f824571d83be8c6aa16a3d7caa1b3447), [`6583ad4`](https://github.com/Effect-TS/platform/commit/6583ad4ef5b718620c873208bb11196d35733034)]:
  - @effect/platform-node@0.16.0

## 0.3.3

### Patch Changes

- Updated dependencies [[`8571c36`](https://github.com/Effect-TS/platform/commit/8571c36f1f8a6ab36b23ee26922cf58def15196e)]:
  - @effect/platform-node@0.15.2

## 0.3.2

### Patch Changes

- [#140](https://github.com/Effect-TS/platform/pull/140) [`fadedf1`](https://github.com/Effect-TS/platform/commit/fadedf15990b438d4baea3bb9a5b63a911715f0b) Thanks [@tim-smart](https://github.com/tim-smart)! - remove host from bun server urls

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform-node@0.15.1

## 0.3.0

### Minor Changes

- [#135](https://github.com/Effect-TS/platform/pull/135) [`99f2a49`](https://github.com/Effect-TS/platform/commit/99f2a49c614a5b80646f6600a170609fe7e38025) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`99f2a49`](https://github.com/Effect-TS/platform/commit/99f2a49c614a5b80646f6600a170609fe7e38025)]:
  - @effect/platform-node@0.15.0

## 0.2.1

### Patch Changes

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - add http platform abstraction

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - handle HEAD requests

- Updated dependencies [[`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f), [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f)]:
  - @effect/platform-node@0.14.1

## 0.2.0

### Minor Changes

- [#130](https://github.com/Effect-TS/platform/pull/130) [`2713c4f`](https://github.com/Effect-TS/platform/commit/2713c4f766f5493303221772368710a09033658d) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`2713c4f`](https://github.com/Effect-TS/platform/commit/2713c4f766f5493303221772368710a09033658d)]:
  - @effect/platform-node@1.0.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`12fbbe9`](https://github.com/Effect-TS/platform/commit/12fbbe9366e3a07895326614ec911ff2601138b1)]:
  - @effect/platform-node@0.13.18

## 0.1.0

### Minor Changes

- [#125](https://github.com/Effect-TS/platform/pull/125) [`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217) Thanks [@tim-smart](https://github.com/tim-smart)! - add /platform-bun

### Patch Changes

- [#125](https://github.com/Effect-TS/platform/pull/125) [`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217) Thanks [@tim-smart](https://github.com/tim-smart)! - restruture platform-node for platform-bun reuse

- Updated dependencies [[`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217)]:
  - @effect/platform-node@0.13.17
