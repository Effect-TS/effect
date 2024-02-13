# @effect/cli

## 0.33.8

### Patch Changes

- Updated dependencies [[`2b62548`](https://github.com/Effect-TS/effect/commit/2b6254845882f399636d24223c483e5489e3cff4)]:
  - @effect/platform@0.45.0

## 0.33.7

### Patch Changes

- Updated dependencies [[`aef2b8b`](https://github.com/Effect-TS/effect/commit/aef2b8bb636ada07224dc9cf491bebe622c1aeda), [`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3), [`7eecb1c`](https://github.com/Effect-TS/effect/commit/7eecb1c6cebe36550df3cca85a46867adbcaa2ca)]:
  - @effect/schema@0.62.6
  - effect@2.3.5
  - @effect/platform@0.44.7
  - @effect/printer@0.31.5
  - @effect/printer-ansi@0.32.5

## 0.33.6

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4
  - @effect/platform@0.44.6
  - @effect/printer@0.31.4
  - @effect/printer-ansi@0.32.4
  - @effect/schema@0.62.5

## 0.33.5

### Patch Changes

- Updated dependencies [[`1c6d18b`](https://github.com/Effect-TS/effect/commit/1c6d18b422b0bd800f2ed036dba9cb78db296c03), [`13d3266`](https://github.com/Effect-TS/effect/commit/13d3266f331f7aa49b55dd244d4e749a82255274), [`a344b42`](https://github.com/Effect-TS/effect/commit/a344b420862f71532a28c72f00b7ba54776d744d)]:
  - @effect/schema@0.62.4
  - @effect/platform@0.44.5

## 0.33.4

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3
  - @effect/platform@0.44.4
  - @effect/printer@0.31.3
  - @effect/printer-ansi@0.32.3
  - @effect/schema@0.62.3

## 0.33.3

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2
  - @effect/platform@0.44.3
  - @effect/printer@0.31.2
  - @effect/printer-ansi@0.32.2
  - @effect/schema@0.62.2

## 0.33.2

### Patch Changes

- Updated dependencies [[`29739dd`](https://github.com/Effect-TS/effect/commit/29739dde8e6232824d49c4c7f8856de245249c5c)]:
  - @effect/platform@0.44.2

## 0.33.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/platform@0.44.1
  - @effect/printer@0.31.1
  - @effect/printer-ansi@0.32.1
  - @effect/schema@0.62.1

## 0.33.0

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

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we remove the `Data.Data` type and we make `Equal.Equal` & `Hash.Hash` implicit traits.

  The main reason is that `Data.Data<A>` was structurally equivalent to `A & Equal.Equal` but extending `Equal.Equal` doesn't mean that the equality is implemented by-value, so the type was simply adding noise without gaining any level of safety.

  The module `Data` remains unchanged at the value level, all the functions previously available are supposed to work in exactly the same manner.

  At the type level instead the functions return `Readonly` variants, so for example we have:

  ```ts
  import { Data } from "effect";

  const obj = Data.struct({
    a: 0,
    b: 1,
  });
  ```

  will have the `obj` typed as:

  ```ts
  declare const obj: {
    readonly a: number;
    readonly b: number;
  };
  ```

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

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`4cd6e14`](https://github.com/Effect-TS/effect/commit/4cd6e144945b6c398f5f5abe3471ff7fb3372bfd), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9dc04c8`](https://github.com/Effect-TS/effect/commit/9dc04c88a2ea9c68122cb2632a76f0f4be40329a), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`56b8691`](https://github.com/Effect-TS/effect/commit/56b86916bf3da18002f3655d859dbc487eb5a6de), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/platform@0.44.0
  - @effect/schema@0.62.0
  - @effect/printer-ansi@0.32.0
  - @effect/printer@0.31.0

## 0.32.2

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5
  - @effect/platform@0.43.11
  - @effect/printer@0.30.14
  - @effect/printer-ansi@0.31.14
  - @effect/schema@0.61.7

## 0.32.1

### Patch Changes

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4
  - @effect/platform@0.43.10
  - @effect/schema@0.61.6
  - @effect/printer@0.30.13
  - @effect/printer-ansi@0.31.13

## 0.32.0

### Minor Changes

- [#2047](https://github.com/Effect-TS/effect/pull/2047) [`eb1f787`](https://github.com/Effect-TS/effect/commit/eb1f7878c9e5f52f17fa4ed8a13151ab70df6b12) Thanks [@tim-smart](https://github.com/tim-smart)! - make array types in cli more permissive

  This change removes NonEmpty\* arrays as input parameters, and removes use of ReadonlyArray as a return type (prefering Array instead).

  This allows more interop with the existing js ecosystem.

## 0.31.9

### Patch Changes

- Updated dependencies [[`1b841a9`](https://github.com/Effect-TS/effect/commit/1b841a91fed86825cd2867cf1e68e41d8ff26b4e)]:
  - @effect/platform@0.43.9

## 0.31.8

### Patch Changes

- Updated dependencies [[`32bf796`](https://github.com/Effect-TS/effect/commit/32bf796c3e5db1b2b68e8b1b20db664295991643)]:
  - @effect/platform@0.43.8

## 0.31.7

### Patch Changes

- Updated dependencies [[`cde08f3`](https://github.com/Effect-TS/effect/commit/cde08f354ed2ff2921d1d98bd539c7d65a2ddd73)]:
  - @effect/platform@0.43.7

## 0.31.6

### Patch Changes

- Updated dependencies [[`c96bb17`](https://github.com/Effect-TS/effect/commit/c96bb17043e2cec1eaeb319614a4c2904d876beb)]:
  - @effect/platform@0.43.6

## 0.31.5

### Patch Changes

- Updated dependencies [[`f1ff44b`](https://github.com/Effect-TS/effect/commit/f1ff44b58cdb1886b38681e8fedc309eb9ac6853), [`13785cf`](https://github.com/Effect-TS/effect/commit/13785cf4a5082d8d9cf8d7c991141dee0d2b4d31)]:
  - @effect/schema@0.61.5
  - @effect/platform@0.43.5

## 0.31.4

### Patch Changes

- [#2001](https://github.com/Effect-TS/effect/pull/2001) [`aab2e4e`](https://github.com/Effect-TS/effect/commit/aab2e4e156207e0977c0529a7afdcae2992a08ff) Thanks [@IMax153](https://github.com/IMax153)! - ensure single invalid variadic option is reported as an error

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247), [`6bf02c7`](https://github.com/Effect-TS/effect/commit/6bf02c70fe10a04d1b34d6666f95416e42a6225a), [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52)]:
  - effect@2.2.3
  - @effect/schema@0.61.4
  - @effect/platform@0.43.4
  - @effect/printer@0.30.12
  - @effect/printer-ansi@0.31.12

## 0.31.3

### Patch Changes

- [#1990](https://github.com/Effect-TS/effect/pull/1990) [`003bb69`](https://github.com/Effect-TS/effect/commit/003bb691f2059ef596121c78b556196f22ab2a1e) Thanks [@IMax153](https://github.com/IMax153)! - fix stack overflow exception when nesting cli options / args in a command config

## 0.31.2

### Patch Changes

- Updated dependencies [[`9863e2f`](https://github.com/Effect-TS/effect/commit/9863e2fb3561dc019965aeccd6584a418fc8b401)]:
  - @effect/schema@0.61.3
  - @effect/platform@0.43.3

## 0.31.1

### Patch Changes

- Updated dependencies [[`64f710a`](https://github.com/Effect-TS/effect/commit/64f710aa49dec6ffcd33ee23438d0774f5489733)]:
  - @effect/schema@0.61.2
  - @effect/platform@0.43.2

## 0.31.0

### Minor Changes

- [#1984](https://github.com/Effect-TS/effect/pull/1984) [`eaab2e8`](https://github.com/Effect-TS/effect/commit/eaab2e81be72df9ded2e01e4c6d40b2bb159a349) Thanks [@IMax153](https://github.com/IMax153)! - default Options.repeated to return an empty array if option is not provided

### Patch Changes

- [#1980](https://github.com/Effect-TS/effect/pull/1980) [`9cf3782`](https://github.com/Effect-TS/effect/commit/9cf3782a17f38097f7b1a0024bd7ec7db8aeb2d0) Thanks [@IMax153](https://github.com/IMax153)! - fix CLI argument parsing to properly handle the case when a repeated option is not provided

## 0.30.6

### Patch Changes

- Updated dependencies [[`c7550f9`](https://github.com/Effect-TS/effect/commit/c7550f96e1006eee832ce5025bf0c197a65935ea), [`8d1f6e4`](https://github.com/Effect-TS/effect/commit/8d1f6e4bb13e221804fb1762ef19e02bcefc8f61), [`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b), [`1a84dee`](https://github.com/Effect-TS/effect/commit/1a84dee0e9ddbfaf2610e4d7c00c7020c427171a), [`ac30bf4`](https://github.com/Effect-TS/effect/commit/ac30bf4cd53de0663784f65ae6bee8279333df97)]:
  - @effect/schema@0.61.1
  - effect@2.2.2
  - @effect/platform@0.43.1
  - @effect/printer@0.30.11
  - @effect/printer-ansi@0.31.11

## 0.30.5

### Patch Changes

- [#1963](https://github.com/Effect-TS/effect/pull/1963) [`de4cb04`](https://github.com/Effect-TS/effect/commit/de4cb049a39923d673fa4acd3db62dd60d341887) Thanks [@IMax153](https://github.com/IMax153)! - fix the parsed letter case for variadic and key/value flags

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764)]:
  - effect@2.2.1
  - @effect/schema@0.61.0
  - @effect/platform@0.43.0
  - @effect/printer@0.30.10
  - @effect/printer-ansi@0.31.10

## 0.30.4

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`fe05ad7`](https://github.com/Effect-TS/effect/commit/fe05ad7bcb3b88d47800ab69ebf53641023676f1), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0
  - @effect/platform@0.42.7
  - @effect/printer@0.30.9
  - @effect/printer-ansi@0.31.9
  - @effect/schema@0.60.7

## 0.30.3

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2
  - @effect/platform@0.42.6
  - @effect/printer@0.30.8
  - @effect/printer-ansi@0.31.8
  - @effect/schema@0.60.6

## 0.30.2

### Patch Changes

- Updated dependencies [[`3bf67cf`](https://github.com/Effect-TS/effect/commit/3bf67cf64ff27ffaa811b07751875cb161ac3385)]:
  - @effect/schema@0.60.5
  - @effect/platform@0.42.5

## 0.30.1

### Patch Changes

- [#1942](https://github.com/Effect-TS/effect/pull/1942) [`d21e028`](https://github.com/Effect-TS/effect/commit/d21e028fe2628b42e681eee641547b0bc01a70d1) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Options.mapEffect export

## 0.30.0

### Minor Changes

- [#1938](https://github.com/Effect-TS/effect/pull/1938) [`9a0d61f`](https://github.com/Effect-TS/effect/commit/9a0d61f674b70ff17c8bcffbd27fea9d5ec57857) Thanks [@IMax153](https://github.com/IMax153)! - rename mapOrFail to mapEffect for Command, Options, and Args modules

## 0.29.0

### Minor Changes

- [#1925](https://github.com/Effect-TS/effect/pull/1925) [`86180cc`](https://github.com/Effect-TS/effect/commit/86180cc96102627a42397d2e4f84fb3a55c3038e) Thanks [@IMax153](https://github.com/IMax153)! - adds optional `executable` parameter to `CliApp.make`

  **NOTE**: This means that users are no longer required to manually remove the executable from the CLI arguments (i.e. `process.argv.slice(2)`). The executable is stripped from the CLI arguments internally within `CliApp.make`, so all command-line arguments can be provided directly to the CLI application.

### Patch Changes

- Updated dependencies [[`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - @effect/schema@0.60.4
  - effect@2.1.1
  - @effect/platform@0.42.4
  - @effect/printer@0.30.7
  - @effect/printer-ansi@0.31.7

## 0.28.9

### Patch Changes

- Updated dependencies [[`d543221`](https://github.com/Effect-TS/effect/commit/d5432213e91ab620aa66e0fd92a6593134d18940), [`2530d47`](https://github.com/Effect-TS/effect/commit/2530d470b0ad5df7e636921eedfb1cbe42821f94), [`f493929`](https://github.com/Effect-TS/effect/commit/f493929ab88d2ea137ca5fbff70bdc6c9d804d80), [`5911fa9`](https://github.com/Effect-TS/effect/commit/5911fa9c9440dd3bc1ee38542bcd15f8c75a4637)]:
  - @effect/schema@0.60.3
  - @effect/platform@0.42.3

## 0.28.8

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0
  - @effect/platform@0.42.2
  - @effect/printer@0.30.6
  - @effect/printer-ansi@0.31.6
  - @effect/schema@0.60.2

## 0.28.7

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5
  - @effect/platform@0.42.1
  - @effect/printer@0.30.5
  - @effect/printer-ansi@0.31.5
  - @effect/schema@0.60.1

## 0.28.6

### Patch Changes

- [#1907](https://github.com/Effect-TS/effect/pull/1907) [`d1c7cf5`](https://github.com/Effect-TS/effect/commit/d1c7cf54fd9c269cca57652391158b6f5ab19628) Thanks [@tim-smart](https://github.com/tim-smart)! - add ConfigFile module to cli

- [#1899](https://github.com/Effect-TS/effect/pull/1899) [`4863253`](https://github.com/Effect-TS/effect/commit/4863253bfc07d43aec357d214d18879743549ac5) Thanks [@tim-smart](https://github.com/tim-smart)! - add file parsing apis to cli

- [#1898](https://github.com/Effect-TS/effect/pull/1898) [`4ef1e6f`](https://github.com/Effect-TS/effect/commit/4ef1e6f4e0376532957208d3f4c82a8ed277ffd6) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema apis to cli Options & Args

- Updated dependencies [[`ec2bdfa`](https://github.com/Effect-TS/effect/commit/ec2bdfae2da717f28147b9d6820d3494cb240945), [`687e02e`](https://github.com/Effect-TS/effect/commit/687e02e7d84dc06957844160761fda90929470ab), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`0c397e7`](https://github.com/Effect-TS/effect/commit/0c397e762008a0de40c7526c9d99ff2cfe4f7a6a), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`b557a10`](https://github.com/Effect-TS/effect/commit/b557a10b773e321bea77fc4951f0ef171dd193c9), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`74b9094`](https://github.com/Effect-TS/effect/commit/74b90940e571c73a6b76cafa88ffb8a1c949cb4c), [`337e80f`](https://github.com/Effect-TS/effect/commit/337e80f69bc36966f889c439b819db2f84cae496), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`48a3d40`](https://github.com/Effect-TS/effect/commit/48a3d40aed0f923f567b8911dade732ff472d981)]:
  - @effect/schema@0.60.0
  - effect@2.0.4
  - @effect/platform@0.42.0
  - @effect/printer@0.30.4
  - @effect/printer-ansi@0.31.4

## 0.28.5

### Patch Changes

- Updated dependencies [[`5b46e99`](https://github.com/Effect-TS/effect/commit/5b46e996d30e2497eb23095e2c21eee04438edf5), [`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0), [`210d27e`](https://github.com/Effect-TS/effect/commit/210d27e999e066ea9b907301150c65f9ff080b39), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - @effect/schema@0.59.1
  - effect@2.0.3
  - @effect/platform@0.41.0
  - @effect/printer@0.30.3
  - @effect/printer-ansi@0.31.3

## 0.28.4

### Patch Changes

- Updated dependencies [[`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f)]:
  - @effect/schema@0.59.0
  - @effect/platform@0.40.4

## 0.28.3

### Patch Changes

- Updated dependencies [[`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`a904a73`](https://github.com/Effect-TS/effect/commit/a904a739459bfd0fa7844b00b902d2fa984fb014), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c)]:
  - @effect/schema@0.58.0
  - @effect/platform@0.40.3

## 0.28.2

### Patch Changes

- Updated dependencies [[`4c90c54`](https://github.com/Effect-TS/effect/commit/4c90c54d87c91f75f3ad114926cdf3b0c25df091), [`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c), [`d3d3bda`](https://github.com/Effect-TS/effect/commit/d3d3bda74c794153def9027e0c40896e72cd5d14)]:
  - @effect/platform@0.40.2
  - effect@2.0.2
  - @effect/printer@0.30.2
  - @effect/printer-ansi@0.31.2
  - @effect/schema@0.57.2

## 0.28.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1
  - @effect/platform@0.40.1
  - @effect/printer@0.30.1
  - @effect/printer-ansi@0.31.1
  - @effect/schema@0.57.1

## 0.28.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

- [#1846](https://github.com/Effect-TS/effect/pull/1846) [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f) Thanks [@fubhy](https://github.com/fubhy)! - Enabled `exactOptionalPropertyTypes` throughout

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1848](https://github.com/Effect-TS/effect/pull/1848) [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7) Thanks [@fubhy](https://github.com/fubhy)! - Avoid default parameter initilization

- [#1853](https://github.com/Effect-TS/effect/pull/1853) [`78fec17`](https://github.com/Effect-TS/effect/commit/78fec17bf1210e3ce35b4e96f3a23cbef2f65c79) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Args.optional returning Option

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747), [`c0aeb5e`](https://github.com/Effect-TS/effect/commit/c0aeb5e302869bcd7d7627f8cc5b630d07c12d10), [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f)]:
  - @effect/printer-ansi@0.31.0
  - @effect/platform@0.40.0
  - @effect/printer@0.30.0
  - @effect/schema@0.57.0
  - effect@2.0.0

## 0.27.0

### Minor Changes

- [#432](https://github.com/Effect-TS/cli/pull/432) [`66fe7a0`](https://github.com/Effect-TS/cli/commit/66fe7a078ce3fa9d9fa412599fb6a9d416d7fd03) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.26.0

### Minor Changes

- [#430](https://github.com/Effect-TS/cli/pull/430) [`859b1e7`](https://github.com/Effect-TS/cli/commit/859b1e7cdb8b454ef3d6514889a0e1dc9b24966f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.25.4

### Patch Changes

- [#428](https://github.com/Effect-TS/cli/pull/428) [`ff2d006`](https://github.com/Effect-TS/cli/commit/ff2d006495fa317a53763302846ebce0cd9a620b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for multiple handler transforms

## 0.25.3

### Patch Changes

- [#426](https://github.com/Effect-TS/cli/pull/426) [`5ac4637`](https://github.com/Effect-TS/cli/commit/5ac4637c37b779363115afb94b477e5f7558cf6b) Thanks [@tim-smart](https://github.com/tim-smart)! - add Command.provideSync

- [#426](https://github.com/Effect-TS/cli/pull/426) [`5ac4637`](https://github.com/Effect-TS/cli/commit/5ac4637c37b779363115afb94b477e5f7558cf6b) Thanks [@tim-smart](https://github.com/tim-smart)! - add Command.provideEffect

## 0.25.2

### Patch Changes

- [#424](https://github.com/Effect-TS/cli/pull/424) [`960cc02`](https://github.com/Effect-TS/cli/commit/960cc02998c177462b22c566d714b8114a5a1cff) Thanks [@tim-smart](https://github.com/tim-smart)! - update /platform

## 0.25.1

### Patch Changes

- [#422](https://github.com/Effect-TS/cli/pull/422) [`ca7dcd5`](https://github.com/Effect-TS/cli/commit/ca7dcd5fe5cc23527639e971d19d13e555912a37) Thanks [@tim-smart](https://github.com/tim-smart)! - add Command.withHandler,transformHandler,provide,provideEffectDiscard

## 0.25.0

### Minor Changes

- [#417](https://github.com/Effect-TS/cli/pull/417) [`486dcdd`](https://github.com/Effect-TS/cli/commit/486dcddf60ee603fb02ca30d09e984826c1f66e5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#411](https://github.com/Effect-TS/cli/pull/411) [`07b3529`](https://github.com/Effect-TS/cli/commit/07b35297b18401a3b3600bd6ccdbfd8dc496c353) Thanks [@IMax153](https://github.com/IMax153)! - default `CliConfig.finalCheckBuiltIn` to `false`

- [#404](https://github.com/Effect-TS/cli/pull/404) [`70fc225`](https://github.com/Effect-TS/cli/commit/70fc225a2e463ec5b2cea6692491e036ec41fd5b) Thanks [@IMax153](https://github.com/IMax153)! - remove `"type"` option from `Prompt.text` and add `Prompt.password` and `Prompt.hidden` which return `Secret`

- [#416](https://github.com/Effect-TS/cli/pull/416) [`234c3f7`](https://github.com/Effect-TS/cli/commit/234c3f780cd9409386b5b4fbcccaadbe7035c2b9) Thanks [@IMax153](https://github.com/IMax153)! - Make help documentation print built-in options by default

  The printing of built-in options in the help documentation can be disabled by providing a custom
  `CliConfig` to your CLI application with `showBuiltIns` set to `false`.

## 0.24.0

### Minor Changes

- [#410](https://github.com/Effect-TS/cli/pull/410) [`686ce6c`](https://github.com/Effect-TS/cli/commit/686ce6c7caf6be6f0c6b37e8b83e746cac95a1cd) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#407](https://github.com/Effect-TS/cli/pull/407) [`77b31e8`](https://github.com/Effect-TS/cli/commit/77b31e891d0a246db709cf7dba81dd7cd19a5d44) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Subcommand type extraction

## 0.23.1

### Patch Changes

- [#403](https://github.com/Effect-TS/cli/pull/403) [`26ab5b5`](https://github.com/Effect-TS/cli/commit/26ab5b5304c84faf73e4d9e7a2443332e7a6b640) Thanks [@tim-smart](https://github.com/tim-smart)! - add Args/Options.withFallbackConfig

## 0.23.0

### Minor Changes

- [#373](https://github.com/Effect-TS/cli/pull/373) [`e6b790d`](https://github.com/Effect-TS/cli/commit/e6b790d0c05be67a6eccb4673d803ebf4faec832) Thanks [@IMax153](https://github.com/IMax153)! - implement `--wizard` mode for cli applications

- [#373](https://github.com/Effect-TS/cli/pull/373) [`e6b790d`](https://github.com/Effect-TS/cli/commit/e6b790d0c05be67a6eccb4673d803ebf4faec832) Thanks [@IMax153](https://github.com/IMax153)! - implement completion script generation for cli applications

- [#390](https://github.com/Effect-TS/cli/pull/390) [`1512ce7`](https://github.com/Effect-TS/cli/commit/1512ce7c9da71c1bf122b4e11205f2b158c8f04e) Thanks [@tim-smart](https://github.com/tim-smart)! - add localized handlers for Command's

- [#398](https://github.com/Effect-TS/cli/pull/398) [`3e21194`](https://github.com/Effect-TS/cli/commit/3e21194f61de4144161eeaa1bfcb54946b588b0f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#388](https://github.com/Effect-TS/cli/pull/388) [`0502e7e`](https://github.com/Effect-TS/cli/commit/0502e7e176606069a46ad0c09d2ce8db0468a835) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#382](https://github.com/Effect-TS/cli/pull/382) [`d24623b`](https://github.com/Effect-TS/cli/commit/d24623bfce76bb407d03ff1f61a3936bd0902d64) Thanks [@IMax153](https://github.com/IMax153)! - fix the type signature of `Options.keyValueMap`

- [#397](https://github.com/Effect-TS/cli/pull/397) [`48db351`](https://github.com/Effect-TS/cli/commit/48db351b51a74f634779b453f299376a526da911) Thanks [@tim-smart](https://github.com/tim-smart)! - fix withDescription for mapped commands

- [#375](https://github.com/Effect-TS/cli/pull/375) [`ab92954`](https://github.com/Effect-TS/cli/commit/ab92954a8d3dc22970712af5ce487c004d004737) Thanks [@IMax153](https://github.com/IMax153)! - cleanup readonly tuple types

- [#385](https://github.com/Effect-TS/cli/pull/385) [`fec4166`](https://github.com/Effect-TS/cli/commit/fec416627e389f111cd82f0dbe0e512ac48b9d8b) Thanks [@IMax153](https://github.com/IMax153)! - support multi-valued arguments appearing anywhere in command-line arguments

- [#383](https://github.com/Effect-TS/cli/pull/383) [`714fe74`](https://github.com/Effect-TS/cli/commit/714fe74dfe919b79384480cd62d1a2f62f537932) Thanks [@IMax153](https://github.com/IMax153)! - add support for variadic options

- [#384](https://github.com/Effect-TS/cli/pull/384) [`3fd5804`](https://github.com/Effect-TS/cli/commit/3fd58041e5b45c20205bee48eca28eedf20e154b) Thanks [@IMax153](https://github.com/IMax153)! - implement withDefault for Args

- [#381](https://github.com/Effect-TS/cli/pull/381) [`fb0bb00`](https://github.com/Effect-TS/cli/commit/fb0bb00cf7b4c3fcda8dccb3783df67e3e8f474b) Thanks [@IMax153](https://github.com/IMax153)! - introduce Args.optional

- [#375](https://github.com/Effect-TS/cli/pull/375) [`ab92954`](https://github.com/Effect-TS/cli/commit/ab92954a8d3dc22970712af5ce487c004d004737) Thanks [@IMax153](https://github.com/IMax153)! - convert all modules to better support tree-shaking

- [#378](https://github.com/Effect-TS/cli/pull/378) [`2cc9d15`](https://github.com/Effect-TS/cli/commit/2cc9d15541011e20b8d4bc1a7971c84f179589f8) Thanks [@IMax153](https://github.com/IMax153)! - fix completion script generation

## 0.22.0

### Minor Changes

- [#370](https://github.com/Effect-TS/cli/pull/370) [`10eceaa`](https://github.com/Effect-TS/cli/commit/10eceaa9c558166eaa8c4090cc4950fbb8c2de9f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.21.0

### Minor Changes

- [#365](https://github.com/Effect-TS/cli/pull/365) [`cb01813`](https://github.com/Effect-TS/cli/commit/cb01813803a1458248cfda1c3f23844bedf9ff40) Thanks [@fubhy](https://github.com/fubhy)! - Fixed exports of public module at subpaths

- [#353](https://github.com/Effect-TS/cli/pull/353) [`a09fa9f`](https://github.com/Effect-TS/cli/commit/a09fa9feaf9dfdd19b4a3b3a15ad2854e190391e) Thanks [@IMax153](https://github.com/IMax153)! - refactor library internals to fix a number of different bugs

### Patch Changes

- [#358](https://github.com/Effect-TS/cli/pull/358) [`07eaa9d`](https://github.com/Effect-TS/cli/commit/07eaa9db5b828f1515fba9aa01265d05f507b748) Thanks [@IMax153](https://github.com/IMax153)! - add support for auto-generating completions for a cli program

## 0.20.1

### Patch Changes

- [#351](https://github.com/Effect-TS/cli/pull/351) [`95d2057`](https://github.com/Effect-TS/cli/commit/95d2057f831c625c39b3f6a791c6979c8c887c75) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.20.0

### Minor Changes

- [#349](https://github.com/Effect-TS/cli/pull/349) [`af7a22f`](https://github.com/Effect-TS/cli/commit/af7a22f751f368368f07e8cd99a9f7522fae194e) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.19.0

### Minor Changes

- [#345](https://github.com/Effect-TS/cli/pull/345) [`0be387a`](https://github.com/Effect-TS/cli/commit/0be387af00d114bb70c4c2089eabedca30e0d9c2) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.18.0

### Minor Changes

- [#343](https://github.com/Effect-TS/cli/pull/343) [`f3facf4`](https://github.com/Effect-TS/cli/commit/f3facf4a99772098b90a51f173de514fbcf8a717) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.17.0

### Minor Changes

- [#341](https://github.com/Effect-TS/cli/pull/341) [`263180c`](https://github.com/Effect-TS/cli/commit/263180cbdc7016f377e793de6c68c6c3a9c75cff) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.16.0

### Minor Changes

- [#338](https://github.com/Effect-TS/cli/pull/338) [`94b219e`](https://github.com/Effect-TS/cli/commit/94b219ed3985891dfed82e42ebc4a26a429e8169) Thanks [@tim-smart](https://github.com/tim-smart)! - use preconstruct

### Patch Changes

- [#336](https://github.com/Effect-TS/cli/pull/336) [`06934e8`](https://github.com/Effect-TS/cli/commit/06934e8254c93a0488ec1f3a70a61f106630215b) Thanks [@IMax153](https://github.com/IMax153)! - add Prompt module

## 0.15.1

### Patch Changes

- [#333](https://github.com/Effect-TS/cli/pull/333) [`333baa6`](https://github.com/Effect-TS/cli/commit/333baa60cbd847f39d7ab3303a7d866b467cb896) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.15.0

### Minor Changes

- [#330](https://github.com/Effect-TS/cli/pull/330) [`7e8267a`](https://github.com/Effect-TS/cli/commit/7e8267aed27cf352831e12f6fbcdf844376e6262) Thanks [@tim-smart](https://github.com/tim-smart)! - update to effect package

## 0.14.0

### Minor Changes

- [#328](https://github.com/Effect-TS/cli/pull/328) [`469a824`](https://github.com/Effect-TS/cli/commit/469a8242e1ab774ff55b12c8bab65a6f2fbd2881) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.13.0

### Minor Changes

- [#326](https://github.com/Effect-TS/cli/pull/326) [`22dd35f`](https://github.com/Effect-TS/cli/commit/22dd35fe0eb7f24e7d19015ebd83d4c300cc5422) Thanks [@IMax153](https://github.com/IMax153)! - use builtin Console service

## 0.12.0

### Minor Changes

- [#324](https://github.com/Effect-TS/cli/pull/324) [`70edc03`](https://github.com/Effect-TS/cli/commit/70edc03b932b3f4cf068ff14afd5b585ec8beeed) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.11.0

### Minor Changes

- [#322](https://github.com/Effect-TS/cli/pull/322) [`79befce`](https://github.com/Effect-TS/cli/commit/79befceef82614438589746ae5bddc6571705518) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.10.1

### Patch Changes

- [#320](https://github.com/Effect-TS/cli/pull/320) [`2ebdf8c`](https://github.com/Effect-TS/cli/commit/2ebdf8c870f23fd20e0aa1b1c1cb5581056e73cc) Thanks [@tim-smart](https://github.com/tim-smart)! - move /printer to peer deps and fix version

## 0.10.0

### Minor Changes

- [#319](https://github.com/Effect-TS/cli/pull/319) [`6dd210a`](https://github.com/Effect-TS/cli/commit/6dd210a46e1f2f16b8c8ac85e746c64ea5f00b57) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#316](https://github.com/Effect-TS/cli/pull/316) [`3f4e8c3`](https://github.com/Effect-TS/cli/commit/3f4e8c3337d0ca1c1960a060654a4f86e9b23685) Thanks [@fubhy](https://github.com/fubhy)! - Made `Command`, `Option`, `Args` and `Primitive` pipeable

- [#318](https://github.com/Effect-TS/cli/pull/318) [`4a0fbae`](https://github.com/Effect-TS/cli/commit/4a0fbae24f85dd396ee36c3f185ccc84026839b7) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /data and /io

- [#314](https://github.com/Effect-TS/cli/pull/314) [`886f1fe`](https://github.com/Effect-TS/cli/commit/886f1fe3666aacd1fb54e5b0cde85f8b6fdb88d8) Thanks [@fubhy](https://github.com/fubhy)! - Fixed `withDefault` types

- [#317](https://github.com/Effect-TS/cli/pull/317) [`eca403d`](https://github.com/Effect-TS/cli/commit/eca403d834ec0dc2918828f0140ef8c7052c80ff) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

## 0.9.0

### Minor Changes

- [#312](https://github.com/Effect-TS/cli/pull/312) [`5385275`](https://github.com/Effect-TS/cli/commit/5385275f9f151b99a0a5fa4f2364b3a7417e0509) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.8.0

### Minor Changes

- [#309](https://github.com/Effect-TS/cli/pull/309) [`dca0f8f`](https://github.com/Effect-TS/cli/commit/dca0f8fc721b5f85ddf9bf1cf7c3d5978ac63bef) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.7.0

### Minor Changes

- [#307](https://github.com/Effect-TS/cli/pull/307) [`81da44d`](https://github.com/Effect-TS/cli/commit/81da44deb77c52ce203ba1716f3be972ac9a3594) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to latest effect packages

## 0.6.0

### Minor Changes

- [#305](https://github.com/Effect-TS/cli/pull/305) [`51a1bda`](https://github.com/Effect-TS/cli/commit/51a1bda139217fcaefccdf0145e0cb7665906931) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to @effect/data@0.13.5, @effect/io@0.31.3, and @effect/printer{-ansi}@0.9.0

## 0.5.0

### Minor Changes

- [#303](https://github.com/Effect-TS/cli/pull/303) [`9c3cf14`](https://github.com/Effect-TS/cli/commit/9c3cf1437709a13f35a127629cdd3b112edebc29) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#301](https://github.com/Effect-TS/cli/pull/301) [`bb8f3b5`](https://github.com/Effect-TS/cli/commit/bb8f3b5457586c4060b2af500bbb365b74f3c3d1) Thanks [@IMax153](https://github.com/IMax153)! - separate Options.choice and Options.choiceWithValue

## 0.4.1

### Patch Changes

- [#299](https://github.com/Effect-TS/cli/pull/299) [`06267a8`](https://github.com/Effect-TS/cli/commit/06267a864e4636bf5ff79f2abecc47940954db5f) Thanks [@IMax153](https://github.com/IMax153)! - update dependencies

## 0.4.0

### Minor Changes

- [#296](https://github.com/Effect-TS/cli/pull/296) [`13cbed7`](https://github.com/Effect-TS/cli/commit/13cbed7013035b74f37a34de50794d6a41c29f8e) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.3.0

### Minor Changes

- [#295](https://github.com/Effect-TS/cli/pull/295) [`dfb0b05`](https://github.com/Effect-TS/cli/commit/dfb0b05fde9bbf3b4de43fab45112cd343033ea3) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#293](https://github.com/Effect-TS/cli/pull/293) [`f702bb9`](https://github.com/Effect-TS/cli/commit/f702bb9d1a38b1b632fb3461e0d8b335d2c63c79) Thanks [@tim-smart](https://github.com/tim-smart)! - non empty chunks for more than one element

## 0.2.0

### Minor Changes

- [#289](https://github.com/Effect-TS/cli/pull/289) [`39c90e9`](https://github.com/Effect-TS/cli/commit/39c90e9b70bfb8a34a82e34811ca48279c3f0326) Thanks [@tim-smart](https://github.com/tim-smart)! - add variadic Options

### Patch Changes

- [#288](https://github.com/Effect-TS/cli/pull/288) [`9b14798`](https://github.com/Effect-TS/cli/commit/9b14798ee6ad1bf0e12d3b907195ffd6d79397e7) Thanks [@tim-smart](https://github.com/tim-smart)! - improve optional message if default is Option

- [#292](https://github.com/Effect-TS/cli/pull/292) [`e15ef09`](https://github.com/Effect-TS/cli/commit/e15ef0943a002165c4109a0b8178e55c48cef3a6) Thanks [@tim-smart](https://github.com/tim-smart)! - update /printer

## 0.1.0

### Minor Changes

- [#286](https://github.com/Effect-TS/cli/pull/286) [`9000a03`](https://github.com/Effect-TS/cli/commit/9000a03306d1aecca5e06efea475cccf68d37707) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.0.1

### Patch Changes

- [#284](https://github.com/Effect-TS/cli/pull/284) [`5fc66c6`](https://github.com/Effect-TS/cli/commit/5fc66c66c2a6f6c8910cb38000f2f71b7ac2a715) Thanks [@IMax153](https://github.com/IMax153)! - initial release
