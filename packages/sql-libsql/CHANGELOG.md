# @effect/sql-libsql

## 0.39.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/platform@0.94.0
  - @effect/experimental@0.58.0
  - @effect/sql@0.49.0

## 0.38.0

### Minor Changes

- [#5686](https://github.com/Effect-TS/effect/pull/5686) [`571025c`](https://github.com/Effect-TS/effect/commit/571025ceaff6ef432a61bf65735a5a0f45118313) Thanks @tim-smart! - allow any type to be used as sql parameters

### Patch Changes

- Updated dependencies [[`571025c`](https://github.com/Effect-TS/effect/commit/571025ceaff6ef432a61bf65735a5a0f45118313)]:
  - @effect/sql@0.48.0
  - @effect/experimental@0.57.0

## 0.37.0

### Patch Changes

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/platform@0.93.0
  - @effect/experimental@0.57.0
  - @effect/sql@0.47.0

## 0.36.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0
  - @effect/platform@0.92.0
  - @effect/experimental@0.56.0
  - @effect/sql@0.46.0

## 0.35.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0
  - @effect/experimental@0.55.0
  - @effect/sql@0.45.0

## 0.34.1

### Patch Changes

- [#5397](https://github.com/Effect-TS/effect/pull/5397) [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034) Thanks @IMax153! - Avoid issues with ESM builds by removing dependency on `@opentelemetry/semantic-conventions`

- Updated dependencies [[`8c7bb52`](https://github.com/Effect-TS/effect/commit/8c7bb52dc78850be72566decba6222870e3733d0), [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034)]:
  - @effect/platform@0.90.4
  - @effect/sql@0.44.2

## 0.34.0

### Patch Changes

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0
  - @effect/experimental@0.54.0
  - @effect/sql@0.44.0

## 0.33.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/experimental@0.53.0
  - @effect/platform@0.89.0
  - @effect/sql@0.43.0

## 0.32.0

### Minor Changes

- [#5192](https://github.com/Effect-TS/effect/pull/5192) [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38) Thanks @nikelborm! - Updated deprecated OTel Resource attributes names and values.

  Many of the attributes have undergone the process of deprecation not once, but twice. Most of the constants holding attribute names have been renamed. These are minor changes.

  Additionally, there were numerous changes to the attribute keys themselves. These changes can be considered major.

  In the `@opentelemetry/semantic-conventions` package, new attributes having ongoing discussion about them are going through a process called incubation, until a consensus about their necessity and form is reached. Otel team [recommends](https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv) devs to copy them directly into their code. Luckily, it's not necessary because all of the new attribute names and values came out of this process (some of them were changed again) and are now considered stable.

  ## Reasoning for minor version bump

  | Package                    | Major attribute changes                                                       | Major value changes               |
  | -------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
  | Clickhouse client          | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
  | MsSQL client               | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             | `mssql` -> `microsoft.sql_server` |
  | MySQL client               | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
  | Pg client                  | `db.system` -> `db.system.name` <br/> `db.name` -> `db.namespace`             |                                   |
  | Bun SQLite client          | `db.system` -> `db.system.name`                                               |                                   |
  | Node SQLite client         | `db.system` -> `db.system.name`                                               |                                   |
  | React.Native SQLite client | `db.system` -> `db.system.name`                                               |                                   |
  | Wasm SQLite client         | `db.system` -> `db.system.name`                                               |                                   |
  | SQLite Do client           | `db.system` -> `db.system.name`                                               |                                   |
  | LibSQL client              | `db.system` -> `db.system.name`                                               |                                   |
  | D1 client                  | `db.system` -> `db.system.name`                                               |                                   |
  | Kysely client              | `db.statement` -> `db.query.text`                                             |                                   |
  | @effect/sql                | `db.statement` -> `db.query.text` <br/> `db.operation` -> `db.operation.name` |                                   |

### Patch Changes

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/sql@0.42.0
  - @effect/platform@0.88.1
  - @effect/experimental@0.52.1

## 0.31.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0
  - @effect/experimental@0.52.0
  - @effect/sql@0.41.0

## 0.30.14

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/experimental@0.51.14
  - @effect/platform@0.87.13
  - @effect/sql@0.40.14

## 0.30.13

### Patch Changes

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12
  - @effect/experimental@0.51.13
  - @effect/sql@0.40.13

## 0.30.12

### Patch Changes

- Updated dependencies [[`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/platform@0.87.11
  - @effect/experimental@0.51.12
  - @effect/sql@0.40.12

## 0.30.11

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10
  - @effect/experimental@0.51.11
  - @effect/sql@0.40.11

## 0.30.10

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9
  - @effect/experimental@0.51.10
  - @effect/sql@0.40.10

## 0.30.9

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8
  - @effect/experimental@0.51.9
  - @effect/sql@0.40.9

## 0.30.8

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7
  - @effect/experimental@0.51.8
  - @effect/sql@0.40.8

## 0.30.7

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/experimental@0.51.7
  - @effect/platform@0.87.6
  - @effect/sql@0.40.7

## 0.30.6

### Patch Changes

- Updated dependencies [[`96c1292`](https://github.com/Effect-TS/effect/commit/96c129262835410b311a51d0bf7f58b8f6fc9a12)]:
  - @effect/experimental@0.51.6
  - @effect/sql@0.40.6

## 0.30.5

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5
  - @effect/experimental@0.51.5
  - @effect/sql@0.40.5

## 0.30.4

### Patch Changes

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4
  - @effect/experimental@0.51.4
  - @effect/sql@0.40.4

## 0.30.3

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e), [`46c3216`](https://github.com/Effect-TS/effect/commit/46c321657d93393506278327418e36f8e7a77f86)]:
  - @effect/platform@0.87.3
  - @effect/sql@0.40.3
  - @effect/experimental@0.51.3

## 0.30.2

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11
  - @effect/experimental@0.51.2
  - @effect/sql@0.40.2

## 0.30.1

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/experimental@0.51.1
  - @effect/platform@0.87.1
  - @effect/sql@0.40.1

## 0.30.0

### Patch Changes

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba)]:
  - @effect/platform@0.87.0
  - @effect/experimental@0.51.0
  - @effect/sql@0.40.0

## 0.29.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0
  - @effect/experimental@0.50.0
  - @effect/sql@0.39.0

## 0.28.2

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2
  - @effect/experimental@0.49.2
  - @effect/sql@0.38.2

## 0.28.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/experimental@0.49.1
  - @effect/platform@0.85.1
  - @effect/sql@0.38.1

## 0.28.0

### Patch Changes

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0
  - @effect/experimental@0.49.0
  - @effect/sql@0.38.0

## 0.27.12

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294)]:
  - effect@3.16.7
  - @effect/experimental@0.48.12
  - @effect/platform@0.84.11
  - @effect/sql@0.37.12

## 0.27.11

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/platform@0.84.10
  - @effect/experimental@0.48.11
  - @effect/sql@0.37.11

## 0.27.10

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/experimental@0.48.10
  - @effect/platform@0.84.9
  - @effect/sql@0.37.10

## 0.27.9

### Patch Changes

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8
  - @effect/experimental@0.48.9
  - @effect/sql@0.37.9

## 0.27.8

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/experimental@0.48.8
  - @effect/platform@0.84.7
  - @effect/sql@0.37.8

## 0.27.7

### Patch Changes

- Updated dependencies [[`a2d57c9`](https://github.com/Effect-TS/effect/commit/a2d57c9ac596445009ca12859b78e00e5d89b936)]:
  - @effect/experimental@0.48.7
  - @effect/sql@0.37.7

## 0.27.6

### Patch Changes

- Updated dependencies [[`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/platform@0.84.6
  - @effect/experimental@0.48.6
  - @effect/sql@0.37.6

## 0.27.5

### Patch Changes

- Updated dependencies [[`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a)]:
  - @effect/platform@0.84.5
  - @effect/experimental@0.48.5
  - @effect/sql@0.37.5

## 0.27.4

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3
  - @effect/experimental@0.48.4
  - @effect/platform@0.84.4
  - @effect/sql@0.37.4

## 0.27.3

### Patch Changes

- Updated dependencies [[`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e)]:
  - @effect/platform@0.84.3
  - @effect/experimental@0.48.3
  - @effect/sql@0.37.3

## 0.27.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897)]:
  - effect@3.16.2
  - @effect/experimental@0.48.2
  - @effect/platform@0.84.2
  - @effect/sql@0.37.2

## 0.27.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - @effect/platform@0.84.1
  - effect@3.16.1
  - @effect/experimental@0.48.1
  - @effect/sql@0.37.1

## 0.27.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/experimental@0.48.0
  - @effect/platform@0.84.0
  - @effect/sql@0.37.0

## 0.26.0

### Patch Changes

- Updated dependencies [[`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd), [`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - @effect/platform@0.83.0
  - effect@3.15.5
  - @effect/experimental@0.47.0
  - @effect/sql@0.36.0

## 0.25.8

### Patch Changes

- Updated dependencies [[`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524)]:
  - @effect/platform@0.82.8
  - @effect/experimental@0.46.8
  - @effect/sql@0.35.8

## 0.25.7

### Patch Changes

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561), [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6), [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2)]:
  - effect@3.15.4
  - @effect/platform@0.82.7
  - @effect/experimental@0.46.7
  - @effect/sql@0.35.7

## 0.25.6

### Patch Changes

- Updated dependencies [[`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36)]:
  - @effect/platform@0.82.6
  - @effect/experimental@0.46.6
  - @effect/sql@0.35.6

## 0.25.5

### Patch Changes

- Updated dependencies [[`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a), [`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a), [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7)]:
  - @effect/platform@0.82.5
  - effect@3.15.3
  - @effect/experimental@0.46.5
  - @effect/sql@0.35.5

## 0.25.4

### Patch Changes

- Updated dependencies [[`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225), [`89657ac`](https://github.com/Effect-TS/effect/commit/89657ac2fbda9ba38ac2962ce96949e536a464f9), [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087)]:
  - @effect/platform@0.82.4
  - @effect/sql@0.35.4
  - @effect/experimental@0.46.4

## 0.25.3

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961), [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328)]:
  - effect@3.15.2
  - @effect/platform@0.82.3
  - @effect/experimental@0.46.3
  - @effect/sql@0.35.3

## 0.25.2

### Patch Changes

- Updated dependencies [[`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc)]:
  - @effect/platform@0.82.2
  - @effect/experimental@0.46.2
  - @effect/sql@0.35.2

## 0.25.1

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/experimental@0.46.1
  - @effect/platform@0.82.1
  - @effect/sql@0.35.1

## 0.25.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/platform@0.82.0
  - @effect/experimental@0.46.0
  - @effect/sql@0.35.0

## 0.24.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/experimental@0.45.1
  - @effect/platform@0.81.1
  - @effect/sql@0.34.1

## 0.24.0

### Patch Changes

- Updated dependencies [[`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8)]:
  - @effect/platform@0.81.0
  - @effect/experimental@0.45.0
  - @effect/sql@0.34.0

## 0.23.21

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/experimental@0.44.21
  - @effect/platform@0.80.21
  - @effect/sql@0.33.21

## 0.23.20

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/experimental@0.44.20
  - @effect/platform@0.80.20
  - @effect/sql@0.33.20

## 0.23.19

### Patch Changes

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19
  - @effect/platform@0.80.19
  - @effect/experimental@0.44.19
  - @effect/sql@0.33.19

## 0.23.18

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/experimental@0.44.18
  - @effect/platform@0.80.18
  - @effect/sql@0.33.18

## 0.23.17

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/experimental@0.44.17
  - @effect/platform@0.80.17
  - @effect/sql@0.33.17

## 0.23.16

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495), [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a)]:
  - effect@3.14.16
  - @effect/platform@0.80.16
  - @effect/experimental@0.44.16
  - @effect/sql@0.33.16

## 0.23.15

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/experimental@0.44.15
  - @effect/platform@0.80.15
  - @effect/sql@0.33.15

## 0.23.14

### Patch Changes

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14
  - @effect/experimental@0.44.14
  - @effect/platform@0.80.14
  - @effect/sql@0.33.14

## 0.23.13

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/experimental@0.44.13
  - @effect/platform@0.80.13
  - @effect/sql@0.33.13

## 0.23.12

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/experimental@0.44.12
  - @effect/platform@0.80.12
  - @effect/sql@0.33.12

## 0.23.11

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b)]:
  - effect@3.14.11
  - @effect/experimental@0.44.11
  - @effect/platform@0.80.11
  - @effect/sql@0.33.11

## 0.23.10

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/experimental@0.44.10
  - @effect/platform@0.80.10
  - @effect/sql@0.33.10

## 0.23.9

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/experimental@0.44.9
  - @effect/platform@0.80.9
  - @effect/sql@0.33.9

## 0.23.8

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8
  - @effect/experimental@0.44.8
  - @effect/platform@0.80.8
  - @effect/sql@0.33.8

## 0.23.7

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7
  - @effect/experimental@0.44.7
  - @effect/platform@0.80.7
  - @effect/sql@0.33.7

## 0.23.6

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6
  - @effect/experimental@0.44.6
  - @effect/platform@0.80.6
  - @effect/sql@0.33.6

## 0.23.5

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`85fba81`](https://github.com/Effect-TS/effect/commit/85fba815ac07eb13d4227a69ac76a18e4b94df18), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5
  - @effect/platform@0.80.5
  - @effect/experimental@0.44.5
  - @effect/sql@0.33.5

## 0.23.4

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef)]:
  - effect@3.14.4
  - @effect/experimental@0.44.4
  - @effect/platform@0.80.4
  - @effect/sql@0.33.4

## 0.23.3

### Patch Changes

- Updated dependencies [[`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - effect@3.14.3
  - @effect/experimental@0.44.3
  - @effect/platform@0.80.3
  - @effect/sql@0.33.3

## 0.23.2

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2
  - @effect/experimental@0.44.2
  - @effect/platform@0.80.2
  - @effect/sql@0.33.2

## 0.23.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1
  - @effect/experimental@0.44.1
  - @effect/platform@0.80.1
  - @effect/sql@0.33.1

## 0.23.0

### Patch Changes

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0
  - @effect/experimental@0.44.0
  - @effect/platform@0.80.0
  - @effect/sql@0.33.0

## 0.22.4

### Patch Changes

- Updated dependencies [[`5662363`](https://github.com/Effect-TS/effect/commit/566236361e270e575ef1cbf308ad1967c82a362c), [`5f1fd15`](https://github.com/Effect-TS/effect/commit/5f1fd15308ab154791580059b89877d19a2055c2), [`8bb1460`](https://github.com/Effect-TS/effect/commit/8bb1460c824f66f0f25ebd899c5e74e388089c37)]:
  - @effect/platform@0.79.4
  - @effect/experimental@0.43.4
  - @effect/sql@0.32.4

## 0.22.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12
  - @effect/experimental@0.43.3
  - @effect/platform@0.79.3
  - @effect/sql@0.32.3

## 0.22.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11
  - @effect/experimental@0.43.2
  - @effect/platform@0.79.2
  - @effect/sql@0.32.2

## 0.22.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10
  - @effect/experimental@0.43.1
  - @effect/platform@0.79.1
  - @effect/sql@0.32.1

## 0.22.0

### Patch Changes

- Updated dependencies [[`88fe129`](https://github.com/Effect-TS/effect/commit/88fe12923740765c0335a6e6203fdcc6a463edca), [`d630249`](https://github.com/Effect-TS/effect/commit/d630249426113088abe8b382db4f14d80f2160c2), [`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - @effect/platform@0.79.0
  - effect@3.13.9
  - @effect/experimental@0.43.0
  - @effect/sql@0.32.0

## 0.21.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8
  - @effect/experimental@0.42.1
  - @effect/platform@0.78.1
  - @effect/sql@0.31.1

## 0.21.0

### Patch Changes

- Updated dependencies [[`c5bcf53`](https://github.com/Effect-TS/effect/commit/c5bcf53b7cb49dacffdd2a6cd8eb48cc452b417e)]:
  - @effect/platform@0.78.0
  - @effect/experimental@0.42.0
  - @effect/sql@0.31.0

## 0.20.7

### Patch Changes

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64), [`f910880`](https://github.com/Effect-TS/effect/commit/f91088069057f3b4529753f5bc5532b028d726df), [`0d01480`](https://github.com/Effect-TS/effect/commit/0d014803e4f688f74386a80abd65485e1a319244)]:
  - @effect/platform@0.77.7
  - effect@3.13.7
  - @effect/experimental@0.41.7
  - @effect/sql@0.30.7

## 0.20.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6
  - @effect/experimental@0.41.6
  - @effect/platform@0.77.6
  - @effect/sql@0.30.6

## 0.20.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5
  - @effect/experimental@0.41.5
  - @effect/platform@0.77.5
  - @effect/sql@0.30.5

## 0.20.4

### Patch Changes

- Updated dependencies [[`e0746f9`](https://github.com/Effect-TS/effect/commit/e0746f9aa398b69c6542e375910683bf17f49f46), [`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - @effect/platform@0.77.4
  - effect@3.13.4
  - @effect/experimental@0.41.4
  - @effect/sql@0.30.4

## 0.20.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3
  - @effect/experimental@0.41.3
  - @effect/platform@0.77.3
  - @effect/sql@0.30.3

## 0.20.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f), [`3e7ce97`](https://github.com/Effect-TS/effect/commit/3e7ce97f8a41756a039cf635d0b3d9a75d781097), [`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/platform@0.77.2
  - @effect/experimental@0.41.2
  - @effect/sql@0.30.2

## 0.20.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1
  - @effect/experimental@0.41.1
  - @effect/platform@0.77.1
  - @effect/sql@0.30.1

## 0.20.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0
  - @effect/experimental@0.41.0
  - @effect/platform@0.77.0
  - @effect/sql@0.30.0

## 0.19.1

### Patch Changes

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`c407726`](https://github.com/Effect-TS/effect/commit/c407726f79df4a567a9631cddd8effaa16b3535d), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12
  - @effect/platform@0.76.1
  - @effect/experimental@0.40.1
  - @effect/sql@0.29.1

## 0.19.0

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e), [`2473ad5`](https://github.com/Effect-TS/effect/commit/2473ad5cf23582e3a41338091fa526ffe611288d)]:
  - effect@3.12.11
  - @effect/platform@0.76.0
  - @effect/experimental@0.40.0
  - @effect/sql@0.29.0

## 0.18.4

### Patch Changes

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`7d57ecd`](https://github.com/Effect-TS/effect/commit/7d57ecdaf5da2345ebbf9c22df50317578bde0f5), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10
  - @effect/platform@0.75.4
  - @effect/experimental@0.39.4
  - @effect/sql@0.28.4

## 0.18.3

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9
  - @effect/experimental@0.39.3
  - @effect/platform@0.75.3
  - @effect/sql@0.28.3

## 0.18.2

### Patch Changes

- Updated dependencies [[`59b3cfb`](https://github.com/Effect-TS/effect/commit/59b3cfbbd5713dd9475998e95fad5534c0b21466), [`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`bb05fb8`](https://github.com/Effect-TS/effect/commit/bb05fb83457355b1ca567228a9e041edfb6fd85d), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`8f6006a`](https://github.com/Effect-TS/effect/commit/8f6006a610fb6d6c7b8d14209a7323338a8964ff), [`c45b559`](https://github.com/Effect-TS/effect/commit/c45b5592b5fd1189a5c932cfe05bd7d5f6d68508), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`c9175ae`](https://github.com/Effect-TS/effect/commit/c9175aef41cb1e3b689d0ac0a4f53d8107376b58), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - @effect/platform@0.75.2
  - effect@3.12.8
  - @effect/experimental@0.39.2
  - @effect/sql@0.28.2

## 0.18.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7
  - @effect/experimental@0.39.1
  - @effect/platform@0.75.1
  - @effect/sql@0.28.1

## 0.18.0

### Patch Changes

- Updated dependencies [[`5e43ce5`](https://github.com/Effect-TS/effect/commit/5e43ce50bae116865906112e7f88d390739d778b), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`76eb7d0`](https://github.com/Effect-TS/effect/commit/76eb7d0fbce3c009c8f77e84c178cb15bbed9709), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`eb264ed`](https://github.com/Effect-TS/effect/commit/eb264ed8a6e8c92a9dc7006f766c6ca2e5d29e03), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - @effect/experimental@0.39.0
  - @effect/platform@0.75.0
  - effect@3.12.6
  - @effect/sql@0.28.0

## 0.17.0

### Patch Changes

- Updated dependencies [[`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8653072`](https://github.com/Effect-TS/effect/commit/86530720d7a03e118d2c5a8bf5a997cee7e7f3d6), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e)]:
  - @effect/experimental@0.38.0
  - @effect/sql@0.27.0
  - effect@3.12.5
  - @effect/platform@0.74.0

## 0.16.1

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718), [`c9e5e1b`](https://github.com/Effect-TS/effect/commit/c9e5e1be17c0c84d3d4e2abc3c60215cdb56bbbe), [`7b3d58d`](https://github.com/Effect-TS/effect/commit/7b3d58d7aec2152ec282460871d3e9de45ed254d)]:
  - effect@3.12.4
  - @effect/platform@0.73.1
  - @effect/experimental@0.37.1
  - @effect/sql@0.26.1

## 0.16.0

### Patch Changes

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`c110032`](https://github.com/Effect-TS/effect/commit/c110032322450a8824ba38ae24335a538cd2ce9a), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`23ac740`](https://github.com/Effect-TS/effect/commit/23ac740c7dd4610b7d265c2071b88b0968419e9a), [`8cd7319`](https://github.com/Effect-TS/effect/commit/8cd7319b6568bfc7a30ca16c104d189e37eac3a0)]:
  - effect@3.12.3
  - @effect/platform@0.73.0
  - @effect/experimental@0.37.0
  - @effect/sql@0.26.0

## 0.15.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`f852cb0`](https://github.com/Effect-TS/effect/commit/f852cb02040ea2f165e9b449615b8b1366add5d5), [`7276ae2`](https://github.com/Effect-TS/effect/commit/7276ae21062896adbb7508ac5b2dece95316322f), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2
  - @effect/platform@0.72.2
  - @effect/experimental@0.36.2
  - @effect/sql@0.25.2

## 0.15.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1
  - @effect/experimental@0.36.1
  - @effect/platform@0.72.1
  - @effect/sql@0.25.1

## 0.15.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`ef64c6f`](https://github.com/Effect-TS/effect/commit/ef64c6fec0d47da573c04230dde9ea729366d871), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0
  - @effect/platform@0.72.0
  - @effect/experimental@0.36.0
  - @effect/sql@0.25.0

## 0.14.1

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10
  - @effect/experimental@0.35.3
  - @effect/platform@0.71.7
  - @effect/sql@0.24.3

## 0.14.0

### Minor Changes

- [#4112](https://github.com/Effect-TS/effect/pull/4112) [`28de34a`](https://github.com/Effect-TS/effect/commit/28de34a9f8329bc4f08339ea45a66fa771541774) Thanks @thewilkybarkid! - libSQL now requires redacted values instead of strings for:
  - `authToken`
  - `encryptionKey`

  Before

  ```ts
  import { LibsqlClient } from "@effect/sql-libsql"

  LibsqlClient.layerConfig({
    url: Config.string("LIBSQL_URL"),
    authToken: Config.string("LIBSQL_AUTH_TOKEN")
  })
  ```

  After

  ```ts
  import { LibsqlClient } from "@effect/sql-libsql"
  import { Config } from "effect"

  LibsqlClient.layerConfig({
    url: Config.string("LIBSQL_URL"),
    authToken: Config.redacted("LIBSQL_AUTH_TOKEN")
  })
  ```

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9
  - @effect/experimental@0.35.2
  - @effect/platform@0.71.6
  - @effect/sql@0.24.2

## 0.13.1

### Patch Changes

- Updated dependencies [[`05d71f8`](https://github.com/Effect-TS/effect/commit/05d71f85622305705d8316817694a09762e60865), [`e66b920`](https://github.com/Effect-TS/effect/commit/e66b9205f25ab425d30640886eb3fb2c4715bc26)]:
  - @effect/platform@0.71.5
  - @effect/experimental@0.35.1
  - @effect/sql@0.24.1

## 0.13.0

### Patch Changes

- Updated dependencies [[`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f), [`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - @effect/platform@0.71.4
  - effect@3.11.8
  - @effect/experimental@0.35.0
  - @effect/sql@0.24.0

## 0.12.3

### Patch Changes

- Updated dependencies [[`6984508`](https://github.com/Effect-TS/effect/commit/6984508c87f1bd91213b44c19b25ab5e2dcc1ce0), [`883639c`](https://github.com/Effect-TS/effect/commit/883639cc8ce47757f1cd39439391a8028c0812fe)]:
  - @effect/platform@0.71.3
  - @effect/experimental@0.34.3
  - @effect/sql@0.23.3

## 0.12.2

### Patch Changes

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7
  - @effect/platform@0.71.2
  - @effect/experimental@0.34.2
  - @effect/sql@0.23.2

## 0.12.1

### Patch Changes

- Updated dependencies [[`1d3df5b`](https://github.com/Effect-TS/effect/commit/1d3df5bc4324e88a392c348db35fd9d029c7b25e)]:
  - @effect/platform@0.71.1
  - @effect/experimental@0.34.1
  - @effect/sql@0.23.1

## 0.12.0

### Patch Changes

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`11fc401`](https://github.com/Effect-TS/effect/commit/11fc401f436f99bf4be95f56d50b0e4bdfe5edea), [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6
  - @effect/platform@0.71.0
  - @effect/experimental@0.34.0
  - @effect/sql@0.23.0

## 0.11.7

### Patch Changes

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`ef70ffc`](https://github.com/Effect-TS/effect/commit/ef70ffc417ec035ede40c62b7316e447cc7c1932), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5
  - @effect/experimental@0.33.7
  - @effect/platform@0.70.7
  - @effect/sql@0.22.7

## 0.11.6

### Patch Changes

- Updated dependencies [[`9a5b8e3`](https://github.com/Effect-TS/effect/commit/9a5b8e36d184bd4967a88752cb6e755e1be263af)]:
  - @effect/platform@0.70.6
  - @effect/experimental@0.33.6
  - @effect/sql@0.22.6

## 0.11.5

### Patch Changes

- [#4082](https://github.com/Effect-TS/effect/pull/4082) [`733f8be`](https://github.com/Effect-TS/effect/commit/733f8be16d71f46875598458e41d640c6f1b1d29) Thanks @thewilkybarkid! - Allow use of the URL object with libSQL

- [#4090](https://github.com/Effect-TS/effect/pull/4090) [`e993627`](https://github.com/Effect-TS/effect/commit/e9936278d9b72a8b96c37cf7968d0e095069c488) Thanks @rocwang! - Add the missing dependency on @effect/experimental to @effect/sql-X

- Updated dependencies [[`415f4c9`](https://github.com/Effect-TS/effect/commit/415f4c98321868531727a83cbaad70164f5e4c40), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - @effect/platform@0.70.5
  - effect@3.11.4
  - @effect/experimental@0.33.5
  - @effect/sql@0.22.5

## 0.11.4

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3
  - @effect/platform@0.70.4
  - @effect/sql@0.22.4

## 0.11.3

### Patch Changes

- Updated dependencies [[`7044730`](https://github.com/Effect-TS/effect/commit/70447306be1aeeb7d87c230b2a96ec87b993ede9)]:
  - @effect/platform@0.70.3
  - @effect/sql@0.22.3

## 0.11.2

### Patch Changes

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41), [`c2249ea`](https://github.com/Effect-TS/effect/commit/c2249ea13fd98ab7d9aa628787931356d8ec2860), [`1358aa5`](https://github.com/Effect-TS/effect/commit/1358aa5326eaa85ef13ee8d1fed0b4a4288ed3eb), [`1de3fe7`](https://github.com/Effect-TS/effect/commit/1de3fe7d1cbafd6391eaa38c2300b99e332cc2aa)]:
  - effect@3.11.2
  - @effect/platform@0.70.2
  - @effect/sql@0.22.2

## 0.11.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1
  - @effect/platform@0.70.1
  - @effect/sql@0.22.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`672bde5`](https://github.com/Effect-TS/effect/commit/672bde5bec51c7d6f9862828e6a654cb2cb6f93d), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0
  - @effect/platform@0.70.0
  - @effect/sql@0.22.0

## 0.10.4

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20
  - @effect/platform@0.69.32
  - @effect/sql@0.21.4

## 0.10.3

### Patch Changes

- Updated dependencies [[`e6d4a37`](https://github.com/Effect-TS/effect/commit/e6d4a37c1d7e657b5ea44063a1cf586808228fe5)]:
  - @effect/platform@0.69.31
  - @effect/sql@0.21.3

## 0.10.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.21.2

## 0.10.1

### Patch Changes

- Updated dependencies [[`270f199`](https://github.com/Effect-TS/effect/commit/270f199b31810fd643e4c22818698adcbdb5d396)]:
  - @effect/platform@0.69.30
  - @effect/sql@0.21.1

## 0.10.0

### Minor Changes

- [#4022](https://github.com/Effect-TS/effect/pull/4022) [`1b1ba09`](https://github.com/Effect-TS/effect/commit/1b1ba099bca49ff48ffe931cc1b607314a5eaafa) Thanks @tim-smart! - allow cloning a SqlClient with transforms disabled

### Patch Changes

- [#4021](https://github.com/Effect-TS/effect/pull/4021) [`e9dfea3`](https://github.com/Effect-TS/effect/commit/e9dfea3f394444ebd8929e5cfe05ce740cf84d6e) Thanks @tim-smart! - add .reactive method to SqlClient interface

- Updated dependencies [[`e9dfea3`](https://github.com/Effect-TS/effect/commit/e9dfea3f394444ebd8929e5cfe05ce740cf84d6e), [`1b1ba09`](https://github.com/Effect-TS/effect/commit/1b1ba099bca49ff48ffe931cc1b607314a5eaafa), [`24cc35e`](https://github.com/Effect-TS/effect/commit/24cc35e26d6ed4a076470bc687ffd99cc50991b3)]:
  - @effect/sql@0.21.0
  - @effect/platform@0.69.29

## 0.9.12

### Patch Changes

- Updated dependencies [[`edd72be`](https://github.com/Effect-TS/effect/commit/edd72be57b904d60c9cbffc2537901821a9da537), [`a3e2771`](https://github.com/Effect-TS/effect/commit/a3e277170a1f7cf61fd629acb60304c7e81d9498), [`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7), [`a9e00e4`](https://github.com/Effect-TS/effect/commit/a9e00e43f0b5dd22c1f9d5b78be6383daea09c20)]:
  - @effect/platform@0.69.28
  - effect@3.10.19
  - @effect/sql@0.20.12

## 0.9.11

### Patch Changes

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de), [`beaccae`](https://github.com/Effect-TS/effect/commit/beaccae2d15931e9fe475fb50a0b3638243fe3f7)]:
  - effect@3.10.18
  - @effect/platform@0.69.27
  - @effect/sql@0.20.11

## 0.9.10

### Patch Changes

- Updated dependencies [[`c963886`](https://github.com/Effect-TS/effect/commit/c963886d5817986fcbd6bfa4ddf50aca8b6c8184), [`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - @effect/platform@0.69.26
  - effect@3.10.17
  - @effect/sql@0.20.10

## 0.9.9

### Patch Changes

- Updated dependencies [[`320557a`](https://github.com/Effect-TS/effect/commit/320557ab18d13c5e22fc7dc0d2a157eae461012f), [`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232), [`7b93dd6`](https://github.com/Effect-TS/effect/commit/7b93dd622e2ab79c7072d79d0d9611e446202201)]:
  - @effect/platform@0.69.25
  - effect@3.10.16
  - @effect/sql@0.20.9

## 0.9.8

### Patch Changes

- Updated dependencies [[`3cc6514`](https://github.com/Effect-TS/effect/commit/3cc6514d2dd64e010cb760cc29bfce98c349bb10)]:
  - @effect/platform@0.69.24
  - @effect/sql@0.20.8

## 0.9.7

### Patch Changes

- Updated dependencies [[`3aff4d3`](https://github.com/Effect-TS/effect/commit/3aff4d38837c213bb2987973dc4b98febb9f92d2)]:
  - @effect/platform@0.69.23
  - @effect/sql@0.20.7

## 0.9.6

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15
  - @effect/platform@0.69.22
  - @effect/sql@0.20.6

## 0.9.5

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14
  - @effect/platform@0.69.21
  - @effect/sql@0.20.5

## 0.9.4

### Patch Changes

- Updated dependencies [[`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - effect@3.10.13
  - @effect/platform@0.69.20
  - @effect/sql@0.20.4

## 0.9.3

### Patch Changes

- Updated dependencies [[`eb8c52d`](https://github.com/Effect-TS/effect/commit/eb8c52d8b4c5e067ebf0a81eb742f5822e6439b5)]:
  - @effect/platform@0.69.19
  - @effect/sql@0.20.3

## 0.9.2

### Patch Changes

- Updated dependencies [[`a0584ec`](https://github.com/Effect-TS/effect/commit/a0584ece92ed784bfb139e9c5a699f02d1e71c2d), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6), [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - @effect/platform@0.69.18
  - effect@3.10.12
  - @effect/sql@0.20.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a), [`8240b1c`](https://github.com/Effect-TS/effect/commit/8240b1c10d45312fc863cb679b1a1e8441af0c1a), [`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11
  - @effect/platform@0.69.17
  - @effect/sql@0.20.1

## 0.9.0

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.20.0

## 0.8.0

### Patch Changes

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6), [`7d89650`](https://github.com/Effect-TS/effect/commit/7d8965036cd2ea435c8441ffec3345488baebf85)]:
  - effect@3.10.10
  - @effect/platform@0.69.16
  - @effect/sql@0.19.0

## 0.7.5

### Patch Changes

- Updated dependencies [[`8a30e1d`](https://github.com/Effect-TS/effect/commit/8a30e1dfa3a7103bf5414fc6a7fca3088d8c8c00)]:
  - @effect/platform@0.69.15
  - @effect/sql@0.18.16

## 0.7.4

### Patch Changes

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`07c493a`](https://github.com/Effect-TS/effect/commit/07c493a598e096c7810cd06def8cfa43493c46b1), [`257ab1b`](https://github.com/Effect-TS/effect/commit/257ab1b539fa6e930b7ae2583a188376372200d7), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9
  - @effect/platform@0.69.14
  - @effect/sql@0.18.15

## 0.7.3

### Patch Changes

- Updated dependencies [[`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - effect@3.10.8
  - @effect/sql@0.18.14
  - @effect/platform@0.69.13

## 0.7.2

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7
  - @effect/platform@0.69.12
  - @effect/sql@0.18.13

## 0.7.1

### Patch Changes

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552), [`81ddd45`](https://github.com/Effect-TS/effect/commit/81ddd45fc074b98206fafab416d9a5a28b31e07a)]:
  - effect@3.10.6
  - @effect/platform@0.69.11
  - @effect/sql@0.18.12

## 0.7.0

### Minor Changes

- [#3852](https://github.com/Effect-TS/effect/pull/3852) [`70dd4d7`](https://github.com/Effect-TS/effect/commit/70dd4d7cd2376e39244fa1729938f1b3ec55aec7) Thanks @sukovanej! - Use `layer` / `layerConfig` naming convention for the /sql-\* packages. Make `layer` constructors accept a raw config object. Add `layerConfig` constructors that accept `Config.Config<...>`.

### Patch Changes

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5
  - @effect/platform@0.69.10
  - @effect/sql@0.18.11

## 0.6.10

### Patch Changes

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - @effect/platform@0.69.9
  - effect@3.10.4
  - @effect/sql@0.18.10

## 0.6.9

### Patch Changes

- Updated dependencies [[`522f7c5`](https://github.com/Effect-TS/effect/commit/522f7c518a5acfb55ef96d6796869f002cc3eaf8)]:
  - @effect/platform@0.69.8
  - @effect/sql@0.18.9

## 0.6.8

### Patch Changes

- Updated dependencies [[`690d6c5`](https://github.com/Effect-TS/effect/commit/690d6c54d2145adb0af545c447db7d4755bf3c6b), [`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5), [`279fe3a`](https://github.com/Effect-TS/effect/commit/279fe3a7168fe84e520c2cc88ba189a15f03a2bc)]:
  - @effect/platform@0.69.7
  - effect@3.10.3
  - @effect/sql@0.18.8

## 0.6.7

### Patch Changes

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37), [`42cd72a`](https://github.com/Effect-TS/effect/commit/42cd72a44ca9593e4d81fbb50e8111625fd0fb81)]:
  - effect@3.10.2
  - @effect/platform@0.69.6
  - @effect/sql@0.18.7

## 0.6.6

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - effect@3.10.1
  - @effect/sql@0.18.6
  - @effect/platform@0.69.5

## 0.6.5

### Patch Changes

- Updated dependencies [[`c86b1d7`](https://github.com/Effect-TS/effect/commit/c86b1d7cd47b66df190ef9775a475467c1abdbd6)]:
  - @effect/platform@0.69.4
  - @effect/sql@0.18.5

## 0.6.4

### Patch Changes

- Updated dependencies [[`d5fba63`](https://github.com/Effect-TS/effect/commit/d5fba6391e1005e374aa0238f13edfbd65848313), [`1eb2c30`](https://github.com/Effect-TS/effect/commit/1eb2c30ba064398db5790e376dedcfad55b7b005), [`02d413e`](https://github.com/Effect-TS/effect/commit/02d413e7b6bc1c64885969c37cc3e4e690c94d7d)]:
  - @effect/platform@0.69.3
  - @effect/sql@0.18.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`e7afc47`](https://github.com/Effect-TS/effect/commit/e7afc47ce83e381c3f4aed2b2974e3b3d86a2340)]:
  - @effect/platform@0.69.2
  - @effect/sql@0.18.3

## 0.6.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.18.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8), [`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8)]:
  - @effect/platform@0.69.1
  - @effect/sql@0.18.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`6d9de6b`](https://github.com/Effect-TS/effect/commit/6d9de6b871c5c08e6509a4e830c3d74758faa198), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0
  - @effect/platform@0.69.0
  - @effect/sql@0.18.0

## 0.5.0

### Patch Changes

- Updated dependencies [[`dacbf7d`](https://github.com/Effect-TS/effect/commit/dacbf7db59899065aee4e5dd95a6459880e09ceb)]:
  - @effect/sql@0.17.0

## 0.4.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.68.6
  - @effect/sql@0.16.6

## 0.4.5

### Patch Changes

- Updated dependencies [[`2036402`](https://github.com/Effect-TS/effect/commit/20364020b8b75a684791aa93d90626758023e9e9)]:
  - @effect/platform@0.68.5
  - @effect/sql@0.16.5

## 0.4.4

### Patch Changes

- Updated dependencies [[`1b1ef29`](https://github.com/Effect-TS/effect/commit/1b1ef29ae302322f69dc938f9337aa97b4c63266)]:
  - @effect/platform@0.68.4
  - @effect/sql@0.16.4

## 0.4.3

### Patch Changes

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d), [`8c33087`](https://github.com/Effect-TS/effect/commit/8c330879425e80bed2f65e407cd59e991f0d7bec)]:
  - effect@3.9.2
  - @effect/platform@0.68.3
  - @effect/sql@0.16.3

## 0.4.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.16.2
  - @effect/platform@0.68.2

## 0.4.1

### Patch Changes

- [#3759](https://github.com/Effect-TS/effect/pull/3759) [`d200f38`](https://github.com/Effect-TS/effect/commit/d200f38af7c87fbf4720cf12e3608310565ef8b3) Thanks @jkonowitch! - allow client instance to be passed in to LibsqlClient

- Updated dependencies [[`b75ac5d`](https://github.com/Effect-TS/effect/commit/b75ac5d0909115507bedc90f18f2d34deb217769)]:
  - @effect/platform@0.68.1
  - @effect/sql@0.16.1

## 0.4.0

### Minor Changes

- [#3720](https://github.com/Effect-TS/effect/pull/3720) [`e0a5dad`](https://github.com/Effect-TS/effect/commit/e0a5dadd786c1ec9cbfdd80e9a53f1cacb7ee2ed) Thanks @jkonowitch! - Fix transactions

### Patch Changes

- [#3720](https://github.com/Effect-TS/effect/pull/3720) [`e0a5dad`](https://github.com/Effect-TS/effect/commit/e0a5dadd786c1ec9cbfdd80e9a53f1cacb7ee2ed) Thanks @jkonowitch! - add SqlClient.makeWithTransaction api

- Updated dependencies [[`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363)]:
  - @effect/platform@0.68.0
  - @effect/sql@0.16.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - @effect/platform@0.67.1
  - effect@3.9.1
  - @effect/sql@0.15.1

## 0.3.0

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/platform@0.67.0
  - @effect/sql@0.15.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`8e94585`](https://github.com/Effect-TS/effect/commit/8e94585abe62753bf3af28bfae77926a7c570ac3), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/platform@0.66.3
  - @effect/sql@0.14.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`f100e20`](https://github.com/Effect-TS/effect/commit/f100e2087172d7e4ab8c0d1ee9a5780b9712382a)]:
  - @effect/sql@0.14.0

## 0.1.2

### Patch Changes

- Updated dependencies []:
  - @effect/sql@0.13.4

## 0.1.1

### Patch Changes

- [#3649](https://github.com/Effect-TS/effect/pull/3649) [`6aa5edc`](https://github.com/Effect-TS/effect/commit/6aa5edcbba46e5d1545634cb218df1f6dd398bd0) Thanks @thewilkybarkid! - Add sql-libsql package

- Updated dependencies [[`0a68746`](https://github.com/Effect-TS/effect/commit/0a68746c89651c364db2ee8c72dcfe552e1782ea), [`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/sql@0.13.3
  - @effect/platform@0.66.2
  - effect@3.8.4
