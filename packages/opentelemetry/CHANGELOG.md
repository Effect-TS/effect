# @effect/opentelemetry

## 0.31.5

### Patch Changes

- Updated dependencies [[`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3)]:
  - effect@2.3.5

## 0.31.4

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4

## 0.31.3

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3

## 0.31.2

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2

## 0.31.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1

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

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0

## 0.30.14

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5

## 0.30.13

### Patch Changes

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4

## 0.30.12

### Patch Changes

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247)]:
  - effect@2.2.3

## 0.30.11

### Patch Changes

- Updated dependencies [[`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b)]:
  - effect@2.2.2

## 0.30.10

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb)]:
  - effect@2.2.1

## 0.30.9

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0

## 0.30.8

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2

## 0.30.7

### Patch Changes

- Updated dependencies [[`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - effect@2.1.1

## 0.30.6

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0

## 0.30.5

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5

## 0.30.4

### Patch Changes

- Updated dependencies [[`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51)]:
  - effect@2.0.4

## 0.30.3

### Patch Changes

- Updated dependencies [[`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - effect@2.0.3

## 0.30.2

### Patch Changes

- Updated dependencies [[`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c)]:
  - effect@2.0.2

## 0.30.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1

## 0.30.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

- [#1846](https://github.com/Effect-TS/effect/pull/1846) [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f) Thanks [@fubhy](https://github.com/fubhy)! - Enabled `exactOptionalPropertyTypes` throughout

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1847](https://github.com/Effect-TS/effect/pull/1847) [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa) Thanks [@fubhy](https://github.com/fubhy)! - Avoid inline creation & spreading of objects and arrays

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747)]:
  - effect@2.0.0

## 0.29.0

### Minor Changes

- [#106](https://github.com/Effect-TS/opentelemetry/pull/106) [`d0fb6b6`](https://github.com/Effect-TS/opentelemetry/commit/d0fb6b6aa18c9c0021cda1a421492c8ba1cb5400) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.28.0

### Minor Changes

- [#104](https://github.com/Effect-TS/opentelemetry/pull/104) [`29484a9`](https://github.com/Effect-TS/opentelemetry/commit/29484a979e1a72e5099cf935f3f2c75624e58f5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.27.0

### Minor Changes

- [#102](https://github.com/Effect-TS/opentelemetry/pull/102) [`056e416`](https://github.com/Effect-TS/opentelemetry/commit/056e416edf7fda5bce8ff89a05672c894c47a332) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.26.0

### Minor Changes

- [#100](https://github.com/Effect-TS/opentelemetry/pull/100) [`091e0e5`](https://github.com/Effect-TS/opentelemetry/commit/091e0e57342b09bcf58c91b8f4628c5d2e74b039) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.25.1

### Patch Changes

- [#98](https://github.com/Effect-TS/opentelemetry/pull/98) [`93b6fab`](https://github.com/Effect-TS/opentelemetry/commit/93b6fabe6167ceb15ea35e86d8539a8117d0e203) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.25.0

### Minor Changes

- [#96](https://github.com/Effect-TS/opentelemetry/pull/96) [`63b82a3`](https://github.com/Effect-TS/opentelemetry/commit/63b82a3768ec47a5b38ff2b0dc61c24c226c0e5f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#96](https://github.com/Effect-TS/opentelemetry/pull/96) [`63b82a3`](https://github.com/Effect-TS/opentelemetry/commit/63b82a3768ec47a5b38ff2b0dc61c24c226c0e5f) Thanks [@tim-smart](https://github.com/tim-smart)! - accept Effect's for sdk constructors

## 0.24.0

### Minor Changes

- [#94](https://github.com/Effect-TS/opentelemetry/pull/94) [`e1afffc`](https://github.com/Effect-TS/opentelemetry/commit/e1afffccee1638c42db0d61fc3dd47ee728cbf21) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.23.0

### Minor Changes

- [#92](https://github.com/Effect-TS/opentelemetry/pull/92) [`0a39315`](https://github.com/Effect-TS/opentelemetry/commit/0a39315de29d79488ab808db12f75ddf50098a79) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.22.1

### Patch Changes

- [#89](https://github.com/Effect-TS/opentelemetry/pull/89) [`97db04d`](https://github.com/Effect-TS/opentelemetry/commit/97db04dae7d7f5e97b79fff8ecd4e32c0486ec67) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.22.0

### Minor Changes

- [#86](https://github.com/Effect-TS/opentelemetry/pull/86) [`ac41f21`](https://github.com/Effect-TS/opentelemetry/commit/ac41f21b691299d1472f0ecfacca9ba274b71afb) Thanks [@fubhy](https://github.com/fubhy)! - Switch to peer dependencies

- [#88](https://github.com/Effect-TS/opentelemetry/pull/88) [`10be3aa`](https://github.com/Effect-TS/opentelemetry/commit/10be3aa6ded8a028eec1a46830ab68bceaf41ca3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.21.1

### Patch Changes

- [#84](https://github.com/Effect-TS/opentelemetry/pull/84) [`6553dac`](https://github.com/Effect-TS/opentelemetry/commit/6553dac0c28523e1e09bd5628159688a1aa7b00b) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.21.0

### Minor Changes

- [#82](https://github.com/Effect-TS/opentelemetry/pull/82) [`8e1b9f6`](https://github.com/Effect-TS/opentelemetry/commit/8e1b9f6509e108cc145313bc7dea8f4d1629cc53) Thanks [@tim-smart](https://github.com/tim-smart)! - add Resource config to sdk layers

- [#83](https://github.com/Effect-TS/opentelemetry/pull/83) [`fab878b`](https://github.com/Effect-TS/opentelemetry/commit/fab878bbd99e9c7163f87ba5ef40986b3cb33eaf) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#79](https://github.com/Effect-TS/opentelemetry/pull/79) [`fca35c8`](https://github.com/Effect-TS/opentelemetry/commit/fca35c8cec7760b6e172fdb9890972f36dc2ebc5) Thanks [@tim-smart](https://github.com/tim-smart)! - use scoped TracerProvider

- [#79](https://github.com/Effect-TS/opentelemetry/pull/79) [`fca35c8`](https://github.com/Effect-TS/opentelemetry/commit/fca35c8cec7760b6e172fdb9890972f36dc2ebc5) Thanks [@tim-smart](https://github.com/tim-smart)! - update Sdk apis

### Patch Changes

- [#79](https://github.com/Effect-TS/opentelemetry/pull/79) [`fca35c8`](https://github.com/Effect-TS/opentelemetry/commit/fca35c8cec7760b6e172fdb9890972f36dc2ebc5) Thanks [@tim-smart](https://github.com/tim-smart)! - add WebSdk module

## 0.20.0

### Minor Changes

- [#77](https://github.com/Effect-TS/opentelemetry/pull/77) [`03d1e6a`](https://github.com/Effect-TS/opentelemetry/commit/03d1e6ad53e125528f1093da7c2ac6b4007c4d6d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.19.0

### Minor Changes

- [#75](https://github.com/Effect-TS/opentelemetry/pull/75) [`706479f`](https://github.com/Effect-TS/opentelemetry/commit/706479fcb2e31f0ed057038abbf17a47a966fba3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.18.0

### Minor Changes

- [#72](https://github.com/Effect-TS/opentelemetry/pull/72) [`9e563ef`](https://github.com/Effect-TS/opentelemetry/commit/9e563ef249b0b556c03b7c3e1d9872ef9c54c8b3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#74](https://github.com/Effect-TS/opentelemetry/pull/74) [`fe93fd2`](https://github.com/Effect-TS/opentelemetry/commit/fe93fd2b3e641563425fe38b56efb8c750018f02) Thanks [@tim-smart](https://github.com/tim-smart)! - use lazy arg for node sdk layer config

## 0.17.0

### Minor Changes

- [#70](https://github.com/Effect-TS/opentelemetry/pull/70) [`f1b1d03`](https://github.com/Effect-TS/opentelemetry/commit/f1b1d039b686a2a5733cc19b0fca3a3f7abaf2d8) Thanks [@gcanti](https://github.com/gcanti)! - update effect

## 0.16.0

### Minor Changes

- [#68](https://github.com/Effect-TS/opentelemetry/pull/68) [`6340117`](https://github.com/Effect-TS/opentelemetry/commit/6340117165cd08a36c0178cb6b48e5db86e745ea) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.15.1

### Patch Changes

- [#66](https://github.com/Effect-TS/opentelemetry/pull/66) [`09cf96b`](https://github.com/Effect-TS/opentelemetry/commit/09cf96b7fd29f38bcbb1fa16f736fc2f42f1a75f) Thanks [@tim-smart](https://github.com/tim-smart)! - fix root spans

## 0.15.0

### Minor Changes

- [#64](https://github.com/Effect-TS/opentelemetry/pull/64) [`4b0608e`](https://github.com/Effect-TS/opentelemetry/commit/4b0608e50b9ab6406bf69ec12ae1d138bebe5497) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.14.0

### Minor Changes

- [#61](https://github.com/Effect-TS/opentelemetry/pull/61) [`7d1898b`](https://github.com/Effect-TS/opentelemetry/commit/7d1898b7efbab4aa6a7e43999591629cb67f80bd) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to preconstruct for builds

## 0.13.1

### Patch Changes

- [#57](https://github.com/Effect-TS/opentelemetry/pull/57) [`d857912`](https://github.com/Effect-TS/opentelemetry/commit/d857912359f0a842ac56bb6cfdee97b1badde479) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.13.0

### Minor Changes

- [#55](https://github.com/Effect-TS/opentelemetry/pull/55) [`1ae529d`](https://github.com/Effect-TS/opentelemetry/commit/1ae529d310e79bd703a6060589dfe919bbe2b2c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update to effect package

## 0.12.0

### Minor Changes

- [#54](https://github.com/Effect-TS/opentelemetry/pull/54) [`2af42ea`](https://github.com/Effect-TS/opentelemetry/commit/2af42ea90abde92c6c3832e585389c6697f487b3) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#52](https://github.com/Effect-TS/opentelemetry/pull/52) [`c9dcaf5`](https://github.com/Effect-TS/opentelemetry/commit/c9dcaf562bf8bd4567ec1355ee0744c3ddbb4e3f) Thanks [@tim-smart](https://github.com/tim-smart)! - makeExternalSpan is now compatible with the span context interface

- [#52](https://github.com/Effect-TS/opentelemetry/pull/52) [`c9dcaf5`](https://github.com/Effect-TS/opentelemetry/commit/c9dcaf562bf8bd4567ec1355ee0744c3ddbb4e3f) Thanks [@tim-smart](https://github.com/tim-smart)! - add currentOtelSpan accessor

## 0.11.1

### Patch Changes

- [#50](https://github.com/Effect-TS/opentelemetry/pull/50) [`70f551a`](https://github.com/Effect-TS/opentelemetry/commit/70f551afa76109dc4ab8ad76c55995cd67f2ef86) Thanks [@tim-smart](https://github.com/tim-smart)! - expose otel tracer with tag + layer

## 0.11.0

### Minor Changes

- [#48](https://github.com/Effect-TS/opentelemetry/pull/48) [`2487f92`](https://github.com/Effect-TS/opentelemetry/commit/2487f92a6dccfc87666fced4a37df60aebb38f9d) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 0.10.0

### Minor Changes

- [#46](https://github.com/Effect-TS/opentelemetry/pull/46) [`fcd35a7`](https://github.com/Effect-TS/opentelemetry/commit/fcd35a76db860d9f8999f294d0b1add3f9d65a99) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Metric labels

- [#46](https://github.com/Effect-TS/opentelemetry/pull/46) [`fcd35a7`](https://github.com/Effect-TS/opentelemetry/commit/fcd35a76db860d9f8999f294d0b1add3f9d65a99) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.9.1

### Patch Changes

- [#9](https://github.com/Effect-TS/opentelemetry/pull/9) [`3a3e25f`](https://github.com/Effect-TS/opentelemetry/commit/3a3e25fd153bc70a2be500f1c9c69002e238ed7a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Metrics module

## 0.9.0

### Minor Changes

- [#44](https://github.com/Effect-TS/opentelemetry/pull/44) [`d0a845d`](https://github.com/Effect-TS/opentelemetry/commit/d0a845da6e409718951834ad6d5681e5dfb4acbc) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#41](https://github.com/Effect-TS/opentelemetry/pull/41) [`271984d`](https://github.com/Effect-TS/opentelemetry/commit/271984d7a56096810d51a31bad652b501b854445) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /data, /io and @opentelemetry/api

- [#43](https://github.com/Effect-TS/opentelemetry/pull/43) [`80faed0`](https://github.com/Effect-TS/opentelemetry/commit/80faed049abf6c57f35d4545f9d6499014783aeb) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

## 0.8.2

### Patch Changes

- [#39](https://github.com/Effect-TS/opentelemetry/pull/39) [`4345aa6`](https://github.com/Effect-TS/opentelemetry/commit/4345aa606b82d0690859359fb47074d365b4a729) Thanks [@tim-smart](https://github.com/tim-smart)! - set status.interrupted attribute on interruption

## 0.8.1

### Patch Changes

- [#37](https://github.com/Effect-TS/opentelemetry/pull/37) [`843a017`](https://github.com/Effect-TS/opentelemetry/commit/843a017515fc0546f60a742a9b8ab860edbeac22) Thanks [@tim-smart](https://github.com/tim-smart)! - add additional info to interrupted spans

## 0.8.0

### Minor Changes

- [#35](https://github.com/Effect-TS/opentelemetry/pull/35) [`c7e4387`](https://github.com/Effect-TS/opentelemetry/commit/c7e438784bb3396e529ccd4bb751aa48e579ba2c) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io - support for links

## 0.7.1

### Patch Changes

- [#32](https://github.com/Effect-TS/opentelemetry/pull/32) [`d66c490`](https://github.com/Effect-TS/opentelemetry/commit/d66c4906a78606549bcbbc852cd36a6626473a10) Thanks [@tim-smart](https://github.com/tim-smart)! - remove name from makeExternalSpan

## 0.7.0

### Minor Changes

- [#30](https://github.com/Effect-TS/opentelemetry/pull/30) [`3b2e776`](https://github.com/Effect-TS/opentelemetry/commit/3b2e77600709e2dbc0a7bca158c1604d7b027427) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data and /io

## 0.6.0

### Minor Changes

- [#28](https://github.com/Effect-TS/opentelemetry/pull/28) [`933eafa`](https://github.com/Effect-TS/opentelemetry/commit/933eafa22317e6f946ef0bab66ab5426092b9bf1) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.5.0

### Minor Changes

- [#26](https://github.com/Effect-TS/opentelemetry/pull/26) [`365a7d2`](https://github.com/Effect-TS/opentelemetry/commit/365a7d2c85180f3491b433aa617ee213ccc1e855) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 0.4.0

### Minor Changes

- [#24](https://github.com/Effect-TS/opentelemetry/pull/24) [`bc689b0`](https://github.com/Effect-TS/opentelemetry/commit/bc689b06680700d6025556e2cefec9213002dc17) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.3.1

### Patch Changes

- [#22](https://github.com/Effect-TS/opentelemetry/pull/22) [`d78883d`](https://github.com/Effect-TS/opentelemetry/commit/d78883d12471150a626698e9432a100abf730e97) Thanks [@tim-smart](https://github.com/tim-smart)! - move node-sdk to dependencies

## 0.3.0

### Minor Changes

- [#20](https://github.com/Effect-TS/opentelemetry/pull/20) [`347904e`](https://github.com/Effect-TS/opentelemetry/commit/347904e5330b0c1ce1d809dbb4aeea1fd22f4231) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

### Patch Changes

- [#20](https://github.com/Effect-TS/opentelemetry/pull/20) [`347904e`](https://github.com/Effect-TS/opentelemetry/commit/347904e5330b0c1ce1d809dbb4aeea1fd22f4231) Thanks [@tim-smart](https://github.com/tim-smart)! - add supervisor for correctly setting otel context for fiber executions

## 0.2.0

### Minor Changes

- [#18](https://github.com/Effect-TS/opentelemetry/pull/18) [`867195a`](https://github.com/Effect-TS/opentelemetry/commit/867195a3622d2678e684bc84959bbe7e3ada9c3c) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

  - adds support for nanosecond precision in timing
  - add `makeExternalSpan` utility for creating parent spans

## 0.1.3

### Patch Changes

- [#16](https://github.com/Effect-TS/opentelemetry/pull/16) [`fa067d9`](https://github.com/Effect-TS/opentelemetry/commit/fa067d9cfa173a18e00dc9d9d19048af26c09ef3) Thanks [@tim-smart](https://github.com/tim-smart)! - add helper for constructing NodeSdk config

## 0.1.2

### Patch Changes

- [#14](https://github.com/Effect-TS/opentelemetry/pull/14) [`31653b4`](https://github.com/Effect-TS/opentelemetry/commit/31653b4ba6daa91bb74fd0b8b2a42b60e4b2c25e) Thanks [@tim-smart](https://github.com/tim-smart)! - make NodeSdk config an Effect

## 0.1.1

### Patch Changes

- [#12](https://github.com/Effect-TS/opentelemetry/pull/12) [`0bc9ca2`](https://github.com/Effect-TS/opentelemetry/commit/0bc9ca2cccf252608a1a91a13554e901d345e5e1) Thanks [@tim-smart](https://github.com/tim-smart)! - add /Resource module

## 0.1.0

### Minor Changes

- [#8](https://github.com/Effect-TS/opentelemetry/pull/8) [`acc90fd`](https://github.com/Effect-TS/opentelemetry/commit/acc90fd41175a99bbe148c97518a4e312c72b92a) Thanks [@tim-smart](https://github.com/tim-smart)! - implement /io/Tracer

### Patch Changes

- [#10](https://github.com/Effect-TS/opentelemetry/pull/10) [`f9d9045`](https://github.com/Effect-TS/opentelemetry/commit/f9d90459ba47a30edbf56edc33d024bd73f335f1) Thanks [@tim-smart](https://github.com/tim-smart)! - add NodeSdk module
