# @effect/platform-node-shared

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
  import { Either } from "effect";

  const right: Either.Either<string> = Either.right("ok");
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
