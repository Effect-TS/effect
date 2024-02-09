# @effect/experimental

## 0.9.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/platform@0.44.1
  - @effect/platform-node@0.43.1
  - @effect/schema@0.62.1

## 0.9.0

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

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`2131a8c`](https://github.com/Effect-TS/effect/commit/2131a8cfd2b7570ace56591fd7da4b3a856ab531) Thanks [@github-actions](https://github.com/apps/github-actions)! - encode per chunk in MsgPack.pack/unpack

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`4cd6e14`](https://github.com/Effect-TS/effect/commit/4cd6e144945b6c398f5f5abe3471ff7fb3372bfd), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9dc04c8`](https://github.com/Effect-TS/effect/commit/9dc04c88a2ea9c68122cb2632a76f0f4be40329a), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`56b8691`](https://github.com/Effect-TS/effect/commit/56b86916bf3da18002f3655d859dbc487eb5a6de), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/platform@0.44.0
  - @effect/schema@0.62.0
  - @effect/platform-node@0.43.0

## 0.8.10

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5
  - @effect/platform@0.43.11
  - @effect/platform-node@0.42.11
  - @effect/schema@0.61.7

## 0.8.9

### Patch Changes

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4
  - @effect/platform@0.43.10
  - @effect/schema@0.61.6
  - @effect/platform-node@0.42.10

## 0.8.8

### Patch Changes

- Updated dependencies [[`1b841a9`](https://github.com/Effect-TS/effect/commit/1b841a91fed86825cd2867cf1e68e41d8ff26b4e)]:
  - @effect/platform@0.43.9
  - @effect/platform-node@0.42.9

## 0.8.7

### Patch Changes

- Updated dependencies [[`32bf796`](https://github.com/Effect-TS/effect/commit/32bf796c3e5db1b2b68e8b1b20db664295991643)]:
  - @effect/platform@0.43.8
  - @effect/platform-node@0.42.8

## 0.8.6

### Patch Changes

- Updated dependencies [[`cde08f3`](https://github.com/Effect-TS/effect/commit/cde08f354ed2ff2921d1d98bd539c7d65a2ddd73)]:
  - @effect/platform@0.43.7
  - @effect/platform-node@0.42.7

## 0.8.5

### Patch Changes

- Updated dependencies [[`c96bb17`](https://github.com/Effect-TS/effect/commit/c96bb17043e2cec1eaeb319614a4c2904d876beb)]:
  - @effect/platform@0.43.6
  - @effect/platform-node@0.42.6

## 0.8.4

### Patch Changes

- Updated dependencies [[`f1ff44b`](https://github.com/Effect-TS/effect/commit/f1ff44b58cdb1886b38681e8fedc309eb9ac6853), [`13785cf`](https://github.com/Effect-TS/effect/commit/13785cf4a5082d8d9cf8d7c991141dee0d2b4d31)]:
  - @effect/schema@0.61.5
  - @effect/platform@0.43.5
  - @effect/platform-node@0.42.5

## 0.8.3

### Patch Changes

- [#1999](https://github.com/Effect-TS/effect/pull/1999) [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure forked fibers are interruptible

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247), [`6bf02c7`](https://github.com/Effect-TS/effect/commit/6bf02c70fe10a04d1b34d6666f95416e42a6225a), [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52)]:
  - effect@2.2.3
  - @effect/schema@0.61.4
  - @effect/platform-node@0.42.4
  - @effect/platform@0.43.4

## 0.8.2

### Patch Changes

- Updated dependencies [[`9863e2f`](https://github.com/Effect-TS/effect/commit/9863e2fb3561dc019965aeccd6584a418fc8b401)]:
  - @effect/schema@0.61.3
  - @effect/platform@0.43.3
  - @effect/platform-node@0.42.3

## 0.8.1

### Patch Changes

- Updated dependencies [[`64f710a`](https://github.com/Effect-TS/effect/commit/64f710aa49dec6ffcd33ee23438d0774f5489733)]:
  - @effect/schema@0.61.2
  - @effect/platform@0.43.2
  - @effect/platform-node@0.42.2

## 0.8.0

### Minor Changes

- [#1985](https://github.com/Effect-TS/effect/pull/1985) [`634af60`](https://github.com/Effect-TS/effect/commit/634af60a2f9d407f42357edc29ca4c14a005fdf9) Thanks [@tim-smart](https://github.com/tim-smart)! - add lmdb implementation of persistence

## 0.7.2

### Patch Changes

- Updated dependencies [[`c7550f9`](https://github.com/Effect-TS/effect/commit/c7550f96e1006eee832ce5025bf0c197a65935ea), [`8d1f6e4`](https://github.com/Effect-TS/effect/commit/8d1f6e4bb13e221804fb1762ef19e02bcefc8f61), [`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b), [`1a84dee`](https://github.com/Effect-TS/effect/commit/1a84dee0e9ddbfaf2610e4d7c00c7020c427171a), [`ac30bf4`](https://github.com/Effect-TS/effect/commit/ac30bf4cd53de0663784f65ae6bee8279333df97)]:
  - @effect/schema@0.61.1
  - effect@2.2.2
  - @effect/platform@0.43.1
  - @effect/platform-node@0.42.1

## 0.7.1

### Patch Changes

- [#1968](https://github.com/Effect-TS/effect/pull/1968) [`fdf7b0e`](https://github.com/Effect-TS/effect/commit/fdf7b0e6647419fb70e18be64b60e652de42e97d) Thanks [@IMax153](https://github.com/IMax153)! - ensure data-loader worker fiber can be interrupted if forked in an uninterruptible region

## 0.7.0

### Minor Changes

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764)]:
  - effect@2.2.1
  - @effect/schema@0.61.0
  - @effect/platform-node@0.42.0
  - @effect/platform@0.43.0

## 0.6.11

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`fe05ad7`](https://github.com/Effect-TS/effect/commit/fe05ad7bcb3b88d47800ab69ebf53641023676f1), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0
  - @effect/platform@0.42.7
  - @effect/platform-node@0.41.8
  - @effect/schema@0.60.7

## 0.6.10

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2
  - @effect/platform@0.42.6
  - @effect/platform-node@0.41.7
  - @effect/schema@0.60.6

## 0.6.9

### Patch Changes

- Updated dependencies [[`3bf67cf`](https://github.com/Effect-TS/effect/commit/3bf67cf64ff27ffaa811b07751875cb161ac3385)]:
  - @effect/schema@0.60.5
  - @effect/platform@0.42.5
  - @effect/platform-node@0.41.6

## 0.6.8

### Patch Changes

- Updated dependencies [[`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - @effect/schema@0.60.4
  - effect@2.1.1
  - @effect/platform@0.42.4
  - @effect/platform-node@0.41.5

## 0.6.7

### Patch Changes

- Updated dependencies [[`d543221`](https://github.com/Effect-TS/effect/commit/d5432213e91ab620aa66e0fd92a6593134d18940), [`2530d47`](https://github.com/Effect-TS/effect/commit/2530d470b0ad5df7e636921eedfb1cbe42821f94), [`f493929`](https://github.com/Effect-TS/effect/commit/f493929ab88d2ea137ca5fbff70bdc6c9d804d80), [`5911fa9`](https://github.com/Effect-TS/effect/commit/5911fa9c9440dd3bc1ee38542bcd15f8c75a4637)]:
  - @effect/schema@0.60.3
  - @effect/platform@0.42.3
  - @effect/platform-node@0.41.4

## 0.6.6

### Patch Changes

- [#1926](https://github.com/Effect-TS/effect/pull/1926) [`169bc30`](https://github.com/Effect-TS/effect/commit/169bc3011ef8001fb75d844a46d8b7954131451b) Thanks [@tim-smart](https://github.com/tim-smart)! - use sliding queue for DevTools client

## 0.6.5

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0
  - @effect/platform@0.42.2
  - @effect/platform-node@0.41.3
  - @effect/schema@0.60.2

## 0.6.4

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5
  - @effect/platform@0.42.1
  - @effect/platform-node@0.41.2
  - @effect/schema@0.60.1

## 0.6.3

### Patch Changes

- Updated dependencies [[`ec2bdfa`](https://github.com/Effect-TS/effect/commit/ec2bdfae2da717f28147b9d6820d3494cb240945), [`687e02e`](https://github.com/Effect-TS/effect/commit/687e02e7d84dc06957844160761fda90929470ab), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`71ed54c`](https://github.com/Effect-TS/effect/commit/71ed54c3fbb1ead5da2776bc6207050cb073ada4), [`0c397e7`](https://github.com/Effect-TS/effect/commit/0c397e762008a0de40c7526c9d99ff2cfe4f7a6a), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`b557a10`](https://github.com/Effect-TS/effect/commit/b557a10b773e321bea77fc4951f0ef171dd193c9), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`74b9094`](https://github.com/Effect-TS/effect/commit/74b90940e571c73a6b76cafa88ffb8a1c949cb4c), [`337e80f`](https://github.com/Effect-TS/effect/commit/337e80f69bc36966f889c439b819db2f84cae496), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`48a3d40`](https://github.com/Effect-TS/effect/commit/48a3d40aed0f923f567b8911dade732ff472d981)]:
  - @effect/schema@0.60.0
  - effect@2.0.4
  - @effect/platform-node@0.41.1
  - @effect/platform@0.42.0

## 0.6.2

### Patch Changes

- Updated dependencies [[`5b46e99`](https://github.com/Effect-TS/effect/commit/5b46e996d30e2497eb23095e2c21eee04438edf5), [`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0), [`210d27e`](https://github.com/Effect-TS/effect/commit/210d27e999e066ea9b907301150c65f9ff080b39), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - @effect/schema@0.59.1
  - effect@2.0.3
  - @effect/platform-node@0.41.0
  - @effect/platform@0.41.0

## 0.6.1

### Patch Changes

- Updated dependencies [[`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f)]:
  - @effect/schema@0.59.0
  - @effect/platform@0.40.4
  - @effect/platform-node@0.40.4

## 0.6.0

### Minor Changes

- [#1842](https://github.com/Effect-TS/effect/pull/1842) [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c) Thanks [@fubhy](https://github.com/fubhy)! - Schema: refactor `ParseResult` module:

  - add `Union` issue, and replace `UnionMember` with `Union`
  - add `Tuple` issue, and replace `Index` with `Tuple`
  - add `TypeLiteral` issue
  - add `Transform` issue
  - add `Refinement` issue
  - add `ast` field to `Member`
  - rename `UnionMember` to `Member`
  - `Type`: rename `expected` to `ast`
  - `ParseError` replace `errors` field with `error` field and refactor `parseError` constructor accordingly
  - `Index` replace `errors` field with `error` field
  - `Key` replace `errors` field with `error` field
  - `Member` replace `errors` field with `error` field
  - `ParseError` replace `errors` field with `error` field
  - make `ParseError` a `Data.TaggedError`
  - `Forbidden`: add `actual` field

### Patch Changes

- Updated dependencies [[`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`a904a73`](https://github.com/Effect-TS/effect/commit/a904a739459bfd0fa7844b00b902d2fa984fb014), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c)]:
  - @effect/schema@0.58.0
  - @effect/platform-node@0.40.3
  - @effect/platform@0.40.3

## 0.5.6

### Patch Changes

- Updated dependencies [[`4c90c54`](https://github.com/Effect-TS/effect/commit/4c90c54d87c91f75f3ad114926cdf3b0c25df091), [`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c), [`d3d3bda`](https://github.com/Effect-TS/effect/commit/d3d3bda74c794153def9027e0c40896e72cd5d14)]:
  - @effect/platform@0.40.2
  - effect@2.0.2
  - @effect/platform-node@0.40.2
  - @effect/schema@0.57.2

## 0.5.5

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1
  - @effect/platform@0.40.1
  - @effect/platform-node@0.40.1
  - @effect/schema@0.57.1

## 0.5.4

### Patch Changes

- [#1849](https://github.com/Effect-TS/effect/pull/1849) [`389a8b1`](https://github.com/Effect-TS/effect/commit/389a8b1c7fbbb1e024dfaf56f13dc2c99dc2af9b) Thanks [@fubhy](https://github.com/fubhy)! - Add `/experimental` package

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`99d22cb`](https://github.com/Effect-TS/effect/commit/99d22cbee13cc2111a4a634cbe73b9b7d7fd88c7), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747), [`c0aeb5e`](https://github.com/Effect-TS/effect/commit/c0aeb5e302869bcd7d7627f8cc5b630d07c12d10), [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f)]:
  - @effect/platform-node@0.40.0
  - @effect/platform@0.40.0
  - @effect/schema@0.57.0
  - effect@2.0.0

## 0.5.3

### Patch Changes

- [#42](https://github.com/Effect-TS/experimental/pull/42) [`fcf22ce`](https://github.com/Effect-TS/experimental/commit/fcf22ce465439ee276fea654cb4e4b97393df6c6) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to handler api for socket and socket server

## 0.5.2

### Patch Changes

- [#40](https://github.com/Effect-TS/experimental/pull/40) [`04b8b17`](https://github.com/Effect-TS/experimental/commit/04b8b17715ae35ef774109be0f2b86f9d6390792) Thanks [@tim-smart](https://github.com/tim-smart)! - add source to SocketServer sockets

## 0.5.1

### Patch Changes

- [#37](https://github.com/Effect-TS/experimental/pull/37) [`9659fbe`](https://github.com/Effect-TS/experimental/commit/9659fbe13bec5270b0cc5e8035a89cfb17d4b6af) Thanks [@tim-smart](https://github.com/tim-smart)! - fix use of timeout

## 0.5.0

### Minor Changes

- [#35](https://github.com/Effect-TS/experimental/pull/35) [`c9366db`](https://github.com/Effect-TS/experimental/commit/c9366db09b15b802a6272b6e81c5cfd2c7507595) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.4.0

### Minor Changes

- [#33](https://github.com/Effect-TS/experimental/pull/33) [`d716090`](https://github.com/Effect-TS/experimental/commit/d716090f539b56d5093a82a10dd5fd6b2b369e86) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.3.2

### Patch Changes

- [#31](https://github.com/Effect-TS/experimental/pull/31) [`216e3d3`](https://github.com/Effect-TS/experimental/commit/216e3d31867124d2d38676b526830f4a4c7d7c5d) Thanks [@tim-smart](https://github.com/tim-smart)! - update /platform

## 0.3.1

### Patch Changes

- [#29](https://github.com/Effect-TS/experimental/pull/29) [`7f346ac`](https://github.com/Effect-TS/experimental/commit/7f346ac95ad2b31e07f1494e8c78e66b2e1bdb40) Thanks [@tim-smart](https://github.com/tim-smart)! - add metrics to dev tools

## 0.3.0

### Minor Changes

- [#27](https://github.com/Effect-TS/experimental/pull/27) [`6618248`](https://github.com/Effect-TS/experimental/commit/6618248e0f2f4aec2330aa9092bf05b55c763164) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.2.8

### Patch Changes

- [#25](https://github.com/Effect-TS/experimental/pull/25) [`e8d5e6d`](https://github.com/Effect-TS/experimental/commit/e8d5e6d5fdc529d55bd3e3c6d9a4bc59dedd5060) Thanks [@tim-smart](https://github.com/tim-smart)! - fix server interrupt

## 0.2.7

### Patch Changes

- [#23](https://github.com/Effect-TS/experimental/pull/23) [`fc89b83`](https://github.com/Effect-TS/experimental/commit/fc89b8351386bef64638b3880d7383f6a7e6dee3) Thanks [@tim-smart](https://github.com/tim-smart)! - seperate DevTools modules

## 0.2.6

### Patch Changes

- [#20](https://github.com/Effect-TS/experimental/pull/20) [`963f717`](https://github.com/Effect-TS/experimental/commit/963f717d4c9f231660f9145185b957edfd30abbd) Thanks [@tim-smart](https://github.com/tim-smart)! - add websocket server

## 0.2.5

### Patch Changes

- [#18](https://github.com/Effect-TS/experimental/pull/18) [`26e8dca`](https://github.com/Effect-TS/experimental/commit/26e8dcaf850ae362bc554422241aed5d4ad88e10) Thanks [@tim-smart](https://github.com/tim-smart)! - remove duplicate onmessage in ws

- [#18](https://github.com/Effect-TS/experimental/pull/18) [`26e8dca`](https://github.com/Effect-TS/experimental/commit/26e8dcaf850ae362bc554422241aed5d4ad88e10) Thanks [@tim-smart](https://github.com/tim-smart)! - add DevTools module

- [#18](https://github.com/Effect-TS/experimental/pull/18) [`26e8dca`](https://github.com/Effect-TS/experimental/commit/26e8dcaf850ae362bc554422241aed5d4ad88e10) Thanks [@tim-smart](https://github.com/tim-smart)! - add SocketServer.run

## 0.2.4

### Patch Changes

- [#16](https://github.com/Effect-TS/experimental/pull/16) [`56f4f76`](https://github.com/Effect-TS/experimental/commit/56f4f76cb6391d8d30a7bc654b9e6bfbcfa7961e) Thanks [@tim-smart](https://github.com/tim-smart)! - add SocketServer module

- [#16](https://github.com/Effect-TS/experimental/pull/16) [`56f4f76`](https://github.com/Effect-TS/experimental/commit/56f4f76cb6391d8d30a7bc654b9e6bfbcfa7961e) Thanks [@tim-smart](https://github.com/tim-smart)! - add run to Socket to make it retryable

## 0.2.3

### Patch Changes

- [#13](https://github.com/Effect-TS/experimental/pull/13) [`8ffa6e1`](https://github.com/Effect-TS/experimental/commit/8ffa6e1afa0ec9f672cbbba3bb680f3126bab7ec) Thanks [@tim-smart](https://github.com/tim-smart)! - add WebSocket

## 0.2.2

### Patch Changes

- [#11](https://github.com/Effect-TS/experimental/pull/11) [`3a83e5a`](https://github.com/Effect-TS/experimental/commit/3a83e5af3f38f676abccd532e69289aaf0cebceb) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor Socket api

## 0.2.1

### Patch Changes

- [#9](https://github.com/Effect-TS/experimental/pull/9) [`b7f0163`](https://github.com/Effect-TS/experimental/commit/b7f0163d4b98f14705e8b810521ed800d4d2874a) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for platform key value store

## 0.2.0

### Minor Changes

- [#8](https://github.com/Effect-TS/experimental/pull/8) [`a39bfc5`](https://github.com/Effect-TS/experimental/commit/a39bfc5ba19fe9e574b7063e5c98bae8944bae4b) Thanks [@tim-smart](https://github.com/tim-smart)! - use Schema/Serializable for peristence

## 0.1.1

### Patch Changes

- [#3](https://github.com/Effect-TS/experimental/pull/3) [`7ab9e0b`](https://github.com/Effect-TS/experimental/commit/7ab9e0b3f015f271210c75c90c76f294918d786c) Thanks [@tim-smart](https://github.com/tim-smart)! - add Socket module

- [#3](https://github.com/Effect-TS/experimental/pull/3) [`7ab9e0b`](https://github.com/Effect-TS/experimental/commit/7ab9e0b3f015f271210c75c90c76f294918d786c) Thanks [@tim-smart](https://github.com/tim-smart)! - add MsgPack module

## 0.1.0

### Minor Changes

- [#1](https://github.com/Effect-TS/experimental/pull/1) [`ff79b4b`](https://github.com/Effect-TS/experimental/commit/ff79b4bda01acfc5753c44e812ac36852130d4d8) Thanks [@tim-smart](https://github.com/tim-smart)! - add RequestResolver & Persistance
