# @effect/sql-d1

## 0.6.4

### Patch Changes

- Updated dependencies [[`413994c`](https://github.com/Effect-TS/effect/commit/413994c9792f16d9d57cca3ae6eb254bf93bd261), [`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`35be739`](https://github.com/Effect-TS/effect/commit/35be739a413e32ed251f775714af2f87355e8664), [`f8326cc`](https://github.com/Effect-TS/effect/commit/f8326cc1095630a3fbee3f25d6b4e74edb905903), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae), [`8dd3959`](https://github.com/Effect-TS/effect/commit/8dd3959e967ca2b38ba601d94a80f1c50e9445e0), [`2cb6ebb`](https://github.com/Effect-TS/effect/commit/2cb6ebbf782b79643befa061c6adcf0366a7b8b3), [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794), [`83a108a`](https://github.com/Effect-TS/effect/commit/83a108a254341721d20a82633b1e1d406d2368a3), [`f2c8dbb`](https://github.com/Effect-TS/effect/commit/f2c8dbb77e196c9a36cb3bf2ae3b82ce68e9874d), [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794)]:
  - @effect/platform@0.62.2
  - effect@3.6.5
  - @effect/sql@0.9.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`c3446d3`](https://github.com/Effect-TS/effect/commit/c3446d3e57b0cbfe9341d6f2aebf5f5d6fefefe3), [`9efe0e5`](https://github.com/Effect-TS/effect/commit/9efe0e5b57ac557399be620822c21cc6e9add285)]:
  - @effect/sql@0.9.3
  - @effect/platform@0.62.1

## 0.6.2

### Patch Changes

- Updated dependencies [[`cfcfbdf`](https://github.com/Effect-TS/effect/commit/cfcfbdfe586b011a5edc28083fd5391edeee0023)]:
  - @effect/sql@0.9.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`e9da539`](https://github.com/Effect-TS/effect/commit/e9da5396bba99b2ddc20c97c7955154e6da4cab5), [`4fabf75`](https://github.com/Effect-TS/effect/commit/4fabf75b44ea98b1773059bd589167d5d8f64f06)]:
  - @effect/sql@0.9.1

## 0.6.0

### Minor Changes

- [#3457](https://github.com/Effect-TS/effect/pull/3457) [`a07990d`](https://github.com/Effect-TS/effect/commit/a07990de977fb60ab4af1e8f3a2250454dedbb34) Thanks @IMax153! - Add support for executing raw SQL queries with the underlying SQL client.

  This is primarily useful when the SQL client returns special results for certain
  query types.

  For example, because MySQL does not support the `RETURNING` clause, the `mysql2`
  client will return a [`ResultSetHeader`](https://sidorares.github.io/node-mysql2/docs/documentation/typescript-examples#resultsetheader)
  for `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` operations.

  To gain access to the raw results of a query, you can use the `.raw` property on
  the `Statement`:

  ```ts
  import * as Effect from "effect/Effect";
  import * as SqlClient from "@effect/sql/SqlClient";
  import * as MysqlClient from "@effect/sql/MysqlClient";

  const DatabaseLive = MysqlClient.layer({
    database: Config.succeed("database"),
    username: Config.succeed("root"),
    password: Config.succeed(Redacted.make("password")),
  });

  const program = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    const result = yield* sql`INSERT INTO usernames VALUES ("Bob")`.raw;

    console.log(result);
    /**
     * ResultSetHeader {
     *   fieldCount: 0,
     *   affectedRows: 1,
     *   insertId: 0,
     *   info: '',
     *   serverStatus: 2,
     *   warningStatus: 0,
     *   changedRows: 0
     * }
     */
  });

  program.pipe(Effect.provide(DatabaseLive), Effect.runPromise);
  ```

### Patch Changes

- [#3450](https://github.com/Effect-TS/effect/pull/3450) [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`a07990d`](https://github.com/Effect-TS/effect/commit/a07990de977fb60ab4af1e8f3a2250454dedbb34), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4)]:
  - effect@3.6.4
  - @effect/sql@0.9.0
  - @effect/platform@0.62.0

## 0.5.7

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/platform@0.61.8
  - @effect/sql@0.8.7

## 0.5.6

### Patch Changes

- Updated dependencies [[`17245a4`](https://github.com/Effect-TS/effect/commit/17245a4e783c19dee51529600b3b40f164fa59bc), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09)]:
  - @effect/platform@0.61.7
  - @effect/sql@0.8.6

## 0.5.5

### Patch Changes

- Updated dependencies [[`d829b57`](https://github.com/Effect-TS/effect/commit/d829b576357f2e3b203ab7e107a1492de903a106), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/platform@0.61.6
  - effect@3.6.2
  - @effect/sql@0.8.5

## 0.5.4

### Patch Changes

- Updated dependencies [[`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38)]:
  - @effect/platform@0.61.5
  - @effect/sql@0.8.4

## 0.5.3

### Patch Changes

- Updated dependencies [[`e7cb109`](https://github.com/Effect-TS/effect/commit/e7cb109d0754207024a64d55b6bd2a674dd8ed7d)]:
  - @effect/platform@0.61.4
  - @effect/sql@0.8.3

## 0.5.2

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`fb9f786`](https://github.com/Effect-TS/effect/commit/fb9f7867f0c895e63f9ef23e8d0941248c42179d), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/platform@0.61.3
  - @effect/sql@0.8.2

## 0.5.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.61.2
  - @effect/sql@0.8.1

## 0.5.0

### Patch Changes

- Updated dependencies [[`42d0706`](https://github.com/Effect-TS/effect/commit/42d07067e9823ceb8977eff9672d9a290941dad5), [`11223bf`](https://github.com/Effect-TS/effect/commit/11223bf9cbf5b822e0bf9a9fb2b35b2ad88af692)]:
  - @effect/sql@0.8.0
  - @effect/platform@0.61.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/platform@0.61.0
  - @effect/sql@0.7.0

## 0.3.3

### Patch Changes

- Updated dependencies [[`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - effect@3.5.9
  - @effect/platform@0.60.3
  - @effect/sql@0.6.3

## 0.3.2

### Patch Changes

- Updated dependencies [[`eb4d014`](https://github.com/Effect-TS/effect/commit/eb4d014c559e1b4c95b3fb9295fe77593c17ed7a), [`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231), [`fc20f73`](https://github.com/Effect-TS/effect/commit/fc20f73c69e577981cb64714de2adc97e1004dae)]:
  - @effect/platform@0.60.2
  - effect@3.5.8
  - @effect/sql@0.6.2

## 0.3.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.1
  - @effect/sql@0.6.1

## 0.3.0

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.0
  - @effect/sql@0.6.0

## 0.2.3

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc)]:
  - effect@3.5.7
  - @effect/platform@0.59.3
  - @effect/sql@0.5.3

## 0.2.2

### Patch Changes

- Updated dependencies [[`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - effect@3.5.6
  - @effect/platform@0.59.2
  - @effect/sql@0.5.2

## 0.2.1

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39), [`fcecff7`](https://github.com/Effect-TS/effect/commit/fcecff7f7e12b295a252f124861b801c73072151), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65)]:
  - effect@3.5.5
  - @effect/platform@0.59.1
  - @effect/sql@0.5.1

## 0.2.0

### Minor Changes

- [#3260](https://github.com/Effect-TS/effect/pull/3260) [`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c) Thanks @tim-smart! - replace /platform RefailError with use of the "cause" property

### Patch Changes

- [#3253](https://github.com/Effect-TS/effect/pull/3253) [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c), [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - @effect/platform@0.59.0
  - @effect/sql@0.5.0
  - effect@3.5.4

## 0.1.4

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`a1db40a`](https://github.com/Effect-TS/effect/commit/a1db40a650ab842e778654f0d88e80f2ef4fd6f3), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/platform@0.58.27
  - @effect/sql@0.4.27

## 0.1.3

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/platform@0.58.26
  - @effect/sql@0.4.26

## 0.1.2

### Patch Changes

- Updated dependencies [[`0623fca`](https://github.com/Effect-TS/effect/commit/0623fca41679b0e3c5a10dd0f8985f91670bd721)]:
  - @effect/platform@0.58.25
  - @effect/sql@0.4.25

## 0.1.1

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/platform@0.58.24
  - @effect/sql@0.4.24

## 0.1.0

### Minor Changes

- [#3048](https://github.com/Effect-TS/effect/pull/3048) [`7f52592`](https://github.com/Effect-TS/effect/commit/7f525927454f16d5dc7657fa79ea1140378d7c30) Thanks @ecyrbe! - Add new cloudflare @effect/sql-d1 package

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/platform@0.58.23
  - @effect/sql@0.4.23
