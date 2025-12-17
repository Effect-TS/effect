# @effect/sql-sqlite-do

## 0.27.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/experimental@0.58.0
  - @effect/sql@0.49.0

## 0.26.0

### Minor Changes

- [#5686](https://github.com/Effect-TS/effect/pull/5686) [`571025c`](https://github.com/Effect-TS/effect/commit/571025ceaff6ef432a61bf65735a5a0f45118313) Thanks @tim-smart! - allow any type to be used as sql parameters

### Patch Changes

- Updated dependencies [[`571025c`](https://github.com/Effect-TS/effect/commit/571025ceaff6ef432a61bf65735a5a0f45118313)]:
  - @effect/sql@0.48.0
  - @effect/experimental@0.57.0

## 0.25.0

### Patch Changes

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/experimental@0.57.0
  - @effect/sql@0.47.0

## 0.24.0

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0
  - @effect/experimental@0.56.0
  - @effect/sql@0.46.0

## 0.23.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.55.0
  - @effect/sql@0.45.0

## 0.22.1

### Patch Changes

- [#5397](https://github.com/Effect-TS/effect/pull/5397) [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034) Thanks @IMax153! - Avoid issues with ESM builds by removing dependency on `@opentelemetry/semantic-conventions`

- Updated dependencies [[`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034)]:
  - @effect/sql@0.44.2

## 0.22.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.54.0
  - @effect/sql@0.44.0

## 0.21.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/experimental@0.53.0
  - @effect/sql@0.43.0

## 0.20.0

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
  - @effect/experimental@0.52.1

## 0.19.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.52.0
  - @effect/sql@0.41.0

## 0.18.14

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/experimental@0.51.14
  - @effect/sql@0.40.14

## 0.18.13

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.13
  - @effect/sql@0.40.13

## 0.18.12

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.12
  - @effect/sql@0.40.12

## 0.18.11

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.11
  - @effect/sql@0.40.11

## 0.18.10

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.10
  - @effect/sql@0.40.10

## 0.18.9

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.9
  - @effect/sql@0.40.9

## 0.18.8

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.8
  - @effect/sql@0.40.8

## 0.18.7

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/experimental@0.51.7
  - @effect/sql@0.40.7

## 0.18.6

### Patch Changes

- Updated dependencies [[`96c1292`](https://github.com/Effect-TS/effect/commit/96c129262835410b311a51d0bf7f58b8f6fc9a12)]:
  - @effect/experimental@0.51.6
  - @effect/sql@0.40.6

## 0.18.5

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.5
  - @effect/sql@0.40.5

## 0.18.4

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.4
  - @effect/sql@0.40.4

## 0.18.3

### Patch Changes

- Updated dependencies [[`46c3216`](https://github.com/Effect-TS/effect/commit/46c321657d93393506278327418e36f8e7a77f86)]:
  - @effect/sql@0.40.3
  - @effect/experimental@0.51.3

## 0.18.2

### Patch Changes

- Updated dependencies [[`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - effect@3.16.11
  - @effect/experimental@0.51.2
  - @effect/sql@0.40.2

## 0.18.1

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/experimental@0.51.1
  - @effect/sql@0.40.1

## 0.18.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.51.0
  - @effect/sql@0.40.0

## 0.17.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99)]:
  - effect@3.16.9
  - @effect/experimental@0.50.0
  - @effect/sql@0.39.0

## 0.16.2

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.49.2
  - @effect/sql@0.38.2

## 0.16.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/experimental@0.49.1
  - @effect/sql@0.38.1

## 0.16.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.49.0
  - @effect/sql@0.38.0

## 0.15.12

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294)]:
  - effect@3.16.7
  - @effect/experimental@0.48.12
  - @effect/sql@0.37.12

## 0.15.11

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/experimental@0.48.11
  - @effect/sql@0.37.11

## 0.15.10

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/experimental@0.48.10
  - @effect/sql@0.37.10

## 0.15.9

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.48.9
  - @effect/sql@0.37.9

## 0.15.8

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/experimental@0.48.8
  - @effect/sql@0.37.8

## 0.15.7

### Patch Changes

- Updated dependencies [[`a2d57c9`](https://github.com/Effect-TS/effect/commit/a2d57c9ac596445009ca12859b78e00e5d89b936)]:
  - @effect/experimental@0.48.7
  - @effect/sql@0.37.7

## 0.15.6

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.48.6
  - @effect/sql@0.37.6

## 0.15.5

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.48.5
  - @effect/sql@0.37.5

## 0.15.4

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3
  - @effect/experimental@0.48.4
  - @effect/sql@0.37.4

## 0.15.3

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.48.3
  - @effect/sql@0.37.3

## 0.15.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897)]:
  - effect@3.16.2
  - @effect/experimental@0.48.2
  - @effect/sql@0.37.2

## 0.15.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - effect@3.16.1
  - @effect/experimental@0.48.1
  - @effect/sql@0.37.1

## 0.15.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/experimental@0.48.0
  - @effect/sql@0.37.0

## 0.14.0

### Patch Changes

- Updated dependencies [[`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - effect@3.15.5
  - @effect/experimental@0.47.0
  - @effect/sql@0.36.0

## 0.13.8

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.46.8
  - @effect/sql@0.35.8

## 0.13.7

### Patch Changes

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561)]:
  - effect@3.15.4
  - @effect/experimental@0.46.7
  - @effect/sql@0.35.7

## 0.13.6

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.46.6
  - @effect/sql@0.35.6

## 0.13.5

### Patch Changes

- Updated dependencies [[`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a)]:
  - effect@3.15.3
  - @effect/experimental@0.46.5
  - @effect/sql@0.35.5

## 0.13.4

### Patch Changes

- Updated dependencies [[`89657ac`](https://github.com/Effect-TS/effect/commit/89657ac2fbda9ba38ac2962ce96949e536a464f9)]:
  - @effect/sql@0.35.4
  - @effect/experimental@0.46.4

## 0.13.3

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961)]:
  - effect@3.15.2
  - @effect/experimental@0.46.3
  - @effect/sql@0.35.3

## 0.13.2

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.46.2
  - @effect/sql@0.35.2

## 0.13.1

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/experimental@0.46.1
  - @effect/sql@0.35.1

## 0.13.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/experimental@0.46.0
  - @effect/sql@0.35.0

## 0.12.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/experimental@0.45.1
  - @effect/sql@0.34.1

## 0.12.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.45.0
  - @effect/sql@0.34.0

## 0.11.21

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/experimental@0.44.21
  - @effect/sql@0.33.21

## 0.11.20

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/experimental@0.44.20
  - @effect/sql@0.33.20

## 0.11.19

### Patch Changes

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19
  - @effect/experimental@0.44.19
  - @effect/sql@0.33.19

## 0.11.18

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/experimental@0.44.18
  - @effect/sql@0.33.18

## 0.11.17

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/experimental@0.44.17
  - @effect/sql@0.33.17

## 0.11.16

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495)]:
  - effect@3.14.16
  - @effect/experimental@0.44.16
  - @effect/sql@0.33.16

## 0.11.15

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/experimental@0.44.15
  - @effect/sql@0.33.15

## 0.11.14

### Patch Changes

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14
  - @effect/experimental@0.44.14
  - @effect/sql@0.33.14

## 0.11.13

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/experimental@0.44.13
  - @effect/sql@0.33.13

## 0.11.12

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/experimental@0.44.12
  - @effect/sql@0.33.12

## 0.11.11

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b)]:
  - effect@3.14.11
  - @effect/experimental@0.44.11
  - @effect/sql@0.33.11

## 0.11.10

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/experimental@0.44.10
  - @effect/sql@0.33.10

## 0.11.9

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/experimental@0.44.9
  - @effect/sql@0.33.9

## 0.11.8

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8
  - @effect/experimental@0.44.8
  - @effect/sql@0.33.8

## 0.11.7

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7
  - @effect/experimental@0.44.7
  - @effect/sql@0.33.7

## 0.11.6

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6
  - @effect/experimental@0.44.6
  - @effect/sql@0.33.6

## 0.11.5

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5
  - @effect/experimental@0.44.5
  - @effect/sql@0.33.5

## 0.11.4

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef)]:
  - effect@3.14.4
  - @effect/experimental@0.44.4
  - @effect/sql@0.33.4

## 0.11.3

### Patch Changes

- Updated dependencies [[`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - effect@3.14.3
  - @effect/experimental@0.44.3
  - @effect/sql@0.33.3

## 0.11.2

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2
  - @effect/experimental@0.44.2
  - @effect/sql@0.33.2

## 0.11.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1
  - @effect/experimental@0.44.1
  - @effect/sql@0.33.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0
  - @effect/experimental@0.44.0
  - @effect/sql@0.33.0

## 0.10.4

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.43.4
  - @effect/sql@0.32.4

## 0.10.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12
  - @effect/experimental@0.43.3
  - @effect/sql@0.32.3

## 0.10.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11
  - @effect/experimental@0.43.2
  - @effect/sql@0.32.2

## 0.10.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10
  - @effect/experimental@0.43.1
  - @effect/sql@0.32.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - effect@3.13.9
  - @effect/experimental@0.43.0
  - @effect/sql@0.32.0

## 0.9.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8
  - @effect/experimental@0.42.1
  - @effect/sql@0.31.1

## 0.9.0

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.42.0
  - @effect/sql@0.31.0

## 0.8.7

### Patch Changes

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64)]:
  - effect@3.13.7
  - @effect/experimental@0.41.7
  - @effect/sql@0.30.7

## 0.8.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6
  - @effect/experimental@0.41.6
  - @effect/sql@0.30.6

## 0.8.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5
  - @effect/experimental@0.41.5
  - @effect/sql@0.30.5

## 0.8.4

### Patch Changes

- Updated dependencies [[`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - effect@3.13.4
  - @effect/experimental@0.41.4
  - @effect/sql@0.30.4

## 0.8.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3
  - @effect/experimental@0.41.3
  - @effect/sql@0.30.3

## 0.8.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2
  - @effect/experimental@0.41.2
  - @effect/sql@0.30.2

## 0.8.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1
  - @effect/experimental@0.41.1
  - @effect/sql@0.30.1

## 0.8.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0
  - @effect/experimental@0.41.0
  - @effect/sql@0.30.0

## 0.7.1

### Patch Changes

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12
  - @effect/experimental@0.40.1
  - @effect/sql@0.29.1

## 0.7.0

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e)]:
  - effect@3.12.11
  - @effect/experimental@0.40.0
  - @effect/sql@0.29.0

## 0.6.4

### Patch Changes

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10
  - @effect/experimental@0.39.4
  - @effect/sql@0.28.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9
  - @effect/experimental@0.39.3
  - @effect/sql@0.28.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - effect@3.12.8
  - @effect/experimental@0.39.2
  - @effect/sql@0.28.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7
  - @effect/experimental@0.39.1
  - @effect/sql@0.28.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`5e43ce5`](https://github.com/Effect-TS/effect/commit/5e43ce50bae116865906112e7f88d390739d778b), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - @effect/experimental@0.39.0
  - effect@3.12.6
  - @effect/sql@0.28.0

## 0.5.0

### Patch Changes

- Updated dependencies [[`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`bd0d489`](https://github.com/Effect-TS/effect/commit/bd0d4892b098bc4c589444af9f50259c2c02ec0f), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b)]:
  - @effect/experimental@0.38.0
  - @effect/sql@0.27.0
  - effect@3.12.5

## 0.4.1

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718)]:
  - effect@3.12.4
  - @effect/experimental@0.37.1
  - @effect/sql@0.26.1

## 0.4.0

### Patch Changes

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5)]:
  - effect@3.12.3
  - @effect/experimental@0.37.0
  - @effect/sql@0.26.0

## 0.3.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2
  - @effect/experimental@0.36.2
  - @effect/sql@0.25.2

## 0.3.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1
  - @effect/experimental@0.36.1
  - @effect/sql@0.25.1

## 0.3.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0
  - @effect/experimental@0.36.0
  - @effect/sql@0.25.0

## 0.2.3

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10
  - @effect/experimental@0.35.3
  - @effect/sql@0.24.3

## 0.2.2

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9
  - @effect/experimental@0.35.2
  - @effect/sql@0.24.2

## 0.2.1

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.35.1
  - @effect/sql@0.24.1

## 0.2.0

### Patch Changes

- Updated dependencies [[`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - effect@3.11.8
  - @effect/experimental@0.35.0
  - @effect/sql@0.24.0

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.34.3
  - @effect/sql@0.23.3

## 0.1.0

### Minor Changes

- [#4141](https://github.com/Effect-TS/effect/pull/4141) [`b7a0a87`](https://github.com/Effect-TS/effect/commit/b7a0a87827056dfe6b6f8c460631c054b15ffcd5) Thanks @tim-smart! - add @effect/sql-sqlite-do for cloudflare durable object sqlite
