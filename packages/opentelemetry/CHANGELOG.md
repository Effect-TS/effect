# @effect/opentelemetry

## 0.60.0

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13
  - @effect/platform@0.94.0

## 0.59.3

### Patch Changes

- [#5890](https://github.com/Effect-TS/effect/pull/5890) [`03355c1`](https://github.com/Effect-TS/effect/commit/03355c1470705168e79ca62f57a30f236cc8033d) Thanks @schickling! - Fix `Tracer.currentOtelSpan` to work with OTLP module

  `currentOtelSpan` now works with both the official OpenTelemetry SDK and the lightweight OTLP module. When using OTLP, it returns a wrapper that conforms to the OpenTelemetry Span interface.

  Closes #5889

- Updated dependencies [[`a6dfca9`](https://github.com/Effect-TS/effect/commit/a6dfca93b676eeffe4db64945b01e2004b395cb8), [`a0a84d8`](https://github.com/Effect-TS/effect/commit/a0a84d8df05d18023ffcb1f60af91d14c2b8db57)]:
  - effect@3.19.12
  - @effect/platform@0.93.8

## 0.59.2

### Patch Changes

- [#5863](https://github.com/Effect-TS/effect/pull/5863) [`5be3b6a`](https://github.com/Effect-TS/effect/commit/5be3b6add400dcf281475dbefbfede5b69c63940) Thanks @mikearnaldi! - Widen @opentelemetry/sdk-logs peer dependency range

- Updated dependencies [[`3f9bbfe`](https://github.com/Effect-TS/effect/commit/3f9bbfe9ef78303ecc6817b68ec9671f4d42d249)]:
  - effect@3.19.9

## 0.59.1

### Patch Changes

- [#5735](https://github.com/Effect-TS/effect/pull/5735) [`973c90a`](https://github.com/Effect-TS/effect/commit/973c90af48a43a48070a56128f8ce0d0b98afbab) Thanks @tim-smart! - convert bigints to string for opentelemetry attributes

## 0.59.0

### Patch Changes

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0
  - @effect/platform@0.93.0

## 0.58.0

### Minor Changes

- [#5302](https://github.com/Effect-TS/effect/pull/5302) [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137) Thanks @mikearnaldi! - Automatically set otel parent when present as external span

### Patch Changes

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0
  - @effect/platform@0.92.0

## 0.57.0

### Patch Changes

- Updated dependencies [[`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a)]:
  - @effect/platform@0.91.0

## 0.56.6

### Patch Changes

- [#5485](https://github.com/Effect-TS/effect/pull/5485) [`f8b8d3d`](https://github.com/Effect-TS/effect/commit/f8b8d3db1a3a53069a134eaad9f4fb42117193c7) Thanks @tim-smart! - fix traceFlags propagation when set to 0

- Updated dependencies [[`333be04`](https://github.com/Effect-TS/effect/commit/333be046b50e8300f5cb70b871448e0628b7b37c)]:
  - @effect/platform@0.90.8

## 0.56.5

### Patch Changes

- [#5444](https://github.com/Effect-TS/effect/pull/5444) [`8f8c401`](https://github.com/Effect-TS/effect/commit/8f8c4011f4b90c540c08efd2e850fe7b265e098c) Thanks @mikearnaldi! - Propagate spanId and traceId to otel logs

## 0.56.4

### Patch Changes

- [#5413](https://github.com/Effect-TS/effect/pull/5413) [`2965aa7`](https://github.com/Effect-TS/effect/commit/2965aa7cff54d7155f291f97b0154486176e81be) Thanks @IMax153! - Remove @opentelemetry/semantic-conventions from Effect-native OTLP modules

- Updated dependencies [[`84bc300`](https://github.com/Effect-TS/effect/commit/84bc3003b42ad51210e9e1248efd04c5d0e3dd1e), [`fef9771`](https://github.com/Effect-TS/effect/commit/fef9771eab24af6415be946df0c9f64eba01cef7)]:
  - effect@3.17.8
  - @effect/platform@0.90.5

## 0.56.3

### Patch Changes

- [#5397](https://github.com/Effect-TS/effect/pull/5397) [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034) Thanks @IMax153! - Avoid issues with ESM builds by removing dependency on `@opentelemetry/semantic-conventions`

- Updated dependencies [[`8c7bb52`](https://github.com/Effect-TS/effect/commit/8c7bb52dc78850be72566decba6222870e3733d0), [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034)]:
  - @effect/platform@0.90.4

## 0.56.2

### Patch Changes

- [#5380](https://github.com/Effect-TS/effect/pull/5380) [`1689874`](https://github.com/Effect-TS/effect/commit/168987408de9270b15802e7d6cc0ec42a57452d5) Thanks @tim-smart! - temporarily disable otlp exporter if endpoint can't be reached

## 0.56.1

### Patch Changes

- [#5334](https://github.com/Effect-TS/effect/pull/5334) [`6df2620`](https://github.com/Effect-TS/effect/commit/6df262086342cb215877863e85b0562e2780a2d5) Thanks @johtso! - improve baseUrl handling in Otlp constructor

## 0.56.0

### Patch Changes

- [#5257](https://github.com/Effect-TS/effect/pull/5257) [`d070f2e`](https://github.com/Effect-TS/effect/commit/d070f2e7d51da490ed64ce06652f4ae119fae331) Thanks @jrmdayn! - use URL constructor for joining url's in Otlp.layer

- Updated dependencies [[`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f)]:
  - @effect/platform@0.90.0

## 0.55.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0
  - @effect/platform@0.89.0

## 0.54.1

### Patch Changes

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

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14
  - @effect/platform@0.88.1

## 0.54.0

### Patch Changes

- Updated dependencies [[`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e), [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c)]:
  - @effect/platform@0.88.0

## 0.53.14

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13
  - @effect/platform@0.87.13

## 0.53.13

### Patch Changes

- Updated dependencies [[`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d), [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7)]:
  - @effect/platform@0.87.12

## 0.53.12

### Patch Changes

- Updated dependencies [[`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72), [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528)]:
  - @effect/platform@0.87.11

## 0.53.11

### Patch Changes

- Updated dependencies [[`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0), [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0)]:
  - @effect/platform@0.87.10

## 0.53.10

### Patch Changes

- Updated dependencies [[`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af)]:
  - @effect/platform@0.87.9

## 0.53.9

### Patch Changes

- Updated dependencies [[`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89)]:
  - @effect/platform@0.87.8

## 0.53.8

### Patch Changes

- [#5161](https://github.com/Effect-TS/effect/pull/5161) [`03f4e8c`](https://github.com/Effect-TS/effect/commit/03f4e8cdb25f43e5ecddf9ba3627105d7e957185) Thanks @tim-smart! - load otel attributes from Config in Otlp modules

## 0.53.7

### Patch Changes

- Updated dependencies [[`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70), [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2)]:
  - @effect/platform@0.87.7

## 0.53.6

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12
  - @effect/platform@0.87.6

## 0.53.5

### Patch Changes

- Updated dependencies [[`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2)]:
  - @effect/platform@0.87.5

## 0.53.4

### Patch Changes

- Updated dependencies [[`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad)]:
  - @effect/platform@0.87.4

## 0.53.3

### Patch Changes

- Updated dependencies [[`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e)]:
  - @effect/platform@0.87.3

## 0.53.2

### Patch Changes

- Updated dependencies [[`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81), [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0), [`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - @effect/platform@0.87.2
  - effect@3.16.11

## 0.53.1

### Patch Changes

- [#5107](https://github.com/Effect-TS/effect/pull/5107) [`c1a9c9d`](https://github.com/Effect-TS/effect/commit/c1a9c9d0c32ea25e890bf0e3aea23fa8d05b4d4f) Thanks @tim-smart! - add option to exclude log spans from OtlpLogger

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10
  - @effect/platform@0.87.1

## 0.53.0

### Patch Changes

- Updated dependencies [[`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba)]:
  - @effect/platform@0.87.0

## 0.52.0

### Patch Changes

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07)]:
  - effect@3.16.9
  - @effect/platform@0.86.0

## 0.51.2

### Patch Changes

- Updated dependencies [[`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44)]:
  - @effect/platform@0.85.2

## 0.51.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8
  - @effect/platform@0.85.1

## 0.51.0

### Patch Changes

- Updated dependencies [[`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e), [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e)]:
  - @effect/platform@0.85.0

## 0.50.11

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294)]:
  - effect@3.16.7
  - @effect/platform@0.84.11

## 0.50.10

### Patch Changes

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6
  - @effect/platform@0.84.10

## 0.50.9

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5
  - @effect/platform@0.84.9

## 0.50.8

### Patch Changes

- Updated dependencies [[`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec)]:
  - @effect/platform@0.84.8

## 0.50.7

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4
  - @effect/platform@0.84.7

## 0.50.6

### Patch Changes

- Updated dependencies [[`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f)]:
  - @effect/platform@0.84.6

## 0.50.5

### Patch Changes

- Updated dependencies [[`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a)]:
  - @effect/platform@0.84.5

## 0.50.4

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3
  - @effect/platform@0.84.4

## 0.50.3

### Patch Changes

- Updated dependencies [[`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e)]:
  - @effect/platform@0.84.3

## 0.50.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897)]:
  - effect@3.16.2
  - @effect/platform@0.84.2

## 0.50.1

### Patch Changes

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - @effect/platform@0.84.1
  - effect@3.16.1

## 0.50.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0
  - @effect/platform@0.84.0

## 0.49.0

### Patch Changes

- Updated dependencies [[`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd), [`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - @effect/platform@0.83.0
  - effect@3.15.5

## 0.48.8

### Patch Changes

- Updated dependencies [[`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524)]:
  - @effect/platform@0.82.8

## 0.48.7

### Patch Changes

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561), [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6), [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2)]:
  - effect@3.15.4
  - @effect/platform@0.82.7

## 0.48.6

### Patch Changes

- Updated dependencies [[`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36)]:
  - @effect/platform@0.82.6

## 0.48.5

### Patch Changes

- Updated dependencies [[`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a), [`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a), [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7)]:
  - @effect/platform@0.82.5
  - effect@3.15.3

## 0.48.4

### Patch Changes

- Updated dependencies [[`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225), [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087)]:
  - @effect/platform@0.82.4

## 0.48.3

### Patch Changes

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961), [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328)]:
  - effect@3.15.2
  - @effect/platform@0.82.3

## 0.48.2

### Patch Changes

- Updated dependencies [[`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc)]:
  - @effect/platform@0.82.2

## 0.48.1

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1
  - @effect/platform@0.82.1

## 0.48.0

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0
  - @effect/platform@0.82.0

## 0.47.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22
  - @effect/platform@0.81.1

## 0.47.0

### Patch Changes

- Updated dependencies [[`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8)]:
  - @effect/platform@0.81.0

## 0.46.18

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21
  - @effect/platform@0.80.21

## 0.46.17

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20
  - @effect/platform@0.80.20

## 0.46.16

### Patch Changes

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19
  - @effect/platform@0.80.19

## 0.46.15

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18
  - @effect/platform@0.80.18

## 0.46.14

### Patch Changes

- [#4808](https://github.com/Effect-TS/effect/pull/4808) [`b5b7da3`](https://github.com/Effect-TS/effect/commit/b5b7da31998dac258677fb51225800f313a87c86) Thanks @tim-smart! - add a shutdownTimeout option to the @effect/opentelemetry exporters

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17
  - @effect/platform@0.80.17

## 0.46.13

### Patch Changes

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495), [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a)]:
  - effect@3.14.16
  - @effect/platform@0.80.16

## 0.46.12

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15
  - @effect/platform@0.80.15

## 0.46.11

### Patch Changes

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14
  - @effect/platform@0.80.14

## 0.46.10

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13
  - @effect/platform@0.80.13

## 0.46.9

### Patch Changes

- [#4772](https://github.com/Effect-TS/effect/pull/4772) [`082e615`](https://github.com/Effect-TS/effect/commit/082e6157493f2ba4c943620cdaf858cbfefd7df6) Thanks @tim-smart! - include error cause in otel exception.stacktrace

## 0.46.8

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12
  - @effect/platform@0.80.12

## 0.46.7

### Patch Changes

- [#4760](https://github.com/Effect-TS/effect/pull/4760) [`43b22df`](https://github.com/Effect-TS/effect/commit/43b22df02f9504ef17b3462c2305f4e89e190763) Thanks @tim-smart! - disable tracer for Otlp http client

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b)]:
  - effect@3.14.11
  - @effect/platform@0.80.11

## 0.46.6

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10
  - @effect/platform@0.80.10

## 0.46.5

### Patch Changes

- [#4740](https://github.com/Effect-TS/effect/pull/4740) [`b7a64c9`](https://github.com/Effect-TS/effect/commit/b7a64c90bbd7fcdedb56a2bcb1e080a3323d7699) Thanks @tim-smart! - add Otlp module to @effect/opentelemetry

  This module allows you to setup an exporter for Traces, Metrics & Logs with one
  Layer.

  It also has no dependency on the @opentelemetry libraries, so you don't need to
  add any additional deps to your package.json.

  ```ts
  import * as Otlp from "@effect/opentelemetry/Otlp"
  import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
  import { Effect, Layer, Schedule } from "effect"

  // Includes an Effect Tracer, Logger & Metric exporter
  const Observability = Otlp.layer({
    baseUrl: "http://localhost:4318",
    resource: {
      serviceName: "my-service"
    }
  }).pipe(Layer.provide(FetchHttpClient.layer))
  ```

- [#4740](https://github.com/Effect-TS/effect/pull/4740) [`b7a64c9`](https://github.com/Effect-TS/effect/commit/b7a64c90bbd7fcdedb56a2bcb1e080a3323d7699) Thanks @tim-smart! - add Effect native OtlpMetrics & OtlpLogger

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9
  - @effect/platform@0.80.9

## 0.46.4

### Patch Changes

- [#4732](https://github.com/Effect-TS/effect/pull/4732) [`049f0ec`](https://github.com/Effect-TS/effect/commit/049f0ec78e9e9333daaeab67e6182632684e5310) Thanks @tim-smart! - include cause in otel exceptions

## 0.46.3

### Patch Changes

- [#4730](https://github.com/Effect-TS/effect/pull/4730) [`d36ccc0`](https://github.com/Effect-TS/effect/commit/d36ccc0c3ce79d2f4214fc5341272812aefaca0e) Thanks @tim-smart! - adjust otel export when max batch size is reached

## 0.46.2

### Patch Changes

- [#4727](https://github.com/Effect-TS/effect/pull/4727) [`46a64bd`](https://github.com/Effect-TS/effect/commit/46a64bd30b69176d6d2ca99823a4de02b3dcf40c) Thanks @tim-smart! - add effect native otlp exporter

## 0.46.1

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8

## 0.46.0

### Minor Changes

- [#4696](https://github.com/Effect-TS/effect/pull/4696) [`f367477`](https://github.com/Effect-TS/effect/commit/f3674777fcd4c1797ac1b46be48c3ad2d6321cfc) Thanks @titouancreach! - update otel peer dependencies to ^2.0.0 and fix breaking changes

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7

## 0.45.6

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6

## 0.45.5

### Patch Changes

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5

## 0.45.4

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef)]:
  - effect@3.14.4

## 0.45.3

### Patch Changes

- Updated dependencies [[`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - effect@3.14.3

## 0.45.2

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2

## 0.45.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1

## 0.45.0

### Minor Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86) Thanks @tim-smart! - add Tracer Span.addLinks, for dynamically linking spans

### Patch Changes

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0

## 0.44.12

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12

## 0.44.11

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11

## 0.44.10

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10

## 0.44.9

### Patch Changes

- Updated dependencies [[`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - effect@3.13.9

## 0.44.8

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8

## 0.44.7

### Patch Changes

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64)]:
  - effect@3.13.7

## 0.44.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6

## 0.44.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5

## 0.44.4

### Patch Changes

- Updated dependencies [[`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - effect@3.13.4

## 0.44.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3

## 0.44.2

### Patch Changes

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2

## 0.44.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1

## 0.44.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0

## 0.43.2

### Patch Changes

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12

## 0.43.1

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e)]:
  - effect@3.12.11

## 0.43.0

### Minor Changes

- [#4371](https://github.com/Effect-TS/effect/pull/4371) [`57d1623`](https://github.com/Effect-TS/effect/commit/57d1623d78883a7e3efd00a5ccf4c2ae8273e222) Thanks @jpowersdev! - Add `LoggerProvider` support from `@opentelemetry/sdk-logs` to `@effect/opentelemetry`.

### Patch Changes

- [#4371](https://github.com/Effect-TS/effect/pull/4371) [`57d1623`](https://github.com/Effect-TS/effect/commit/57d1623d78883a7e3efd00a5ccf4c2ae8273e222) Thanks @jpowersdev! - Use Resource.layerFromEnv by default in NodeSdk.layer

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10

## 0.42.9

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9

## 0.42.8

### Patch Changes

- [#4380](https://github.com/Effect-TS/effect/pull/4380) [`c45b559`](https://github.com/Effect-TS/effect/commit/c45b5592b5fd1189a5c932cfe05bd7d5f6d68508) Thanks @fubhy! - Fixed module imports

- Updated dependencies [[`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - effect@3.12.8

## 0.42.7

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7

## 0.42.6

### Patch Changes

- Updated dependencies [[`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - effect@3.12.6

## 0.42.5

### Patch Changes

- Updated dependencies [[`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b)]:
  - effect@3.12.5

## 0.42.4

### Patch Changes

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718)]:
  - effect@3.12.4

## 0.42.3

### Patch Changes

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5)]:
  - effect@3.12.3

## 0.42.2

### Patch Changes

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2

## 0.42.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1

## 0.42.0

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0

## 0.41.8

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10

## 0.41.7

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9

## 0.41.6

### Patch Changes

- Updated dependencies [[`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - effect@3.11.8

## 0.41.5

### Patch Changes

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7

## 0.41.4

### Patch Changes

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6

## 0.41.3

### Patch Changes

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5

## 0.41.2

### Patch Changes

- Updated dependencies [[`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - effect@3.11.4

## 0.41.1

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3

## 0.41.0

### Minor Changes

- [#4070](https://github.com/Effect-TS/effect/pull/4070) [`ac662f4`](https://github.com/Effect-TS/effect/commit/ac662f44646bb3370528e76b0545cf485bcf659c) Thanks @tim-smart! - ensure opentelemetry tags have unique identifiers

### Patch Changes

- [#4070](https://github.com/Effect-TS/effect/pull/4070) [`ac662f4`](https://github.com/Effect-TS/effect/commit/ac662f44646bb3370528e76b0545cf485bcf659c) Thanks @tim-smart! - expose Otel Tracer in Tracer layers

## 0.40.2

### Patch Changes

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41)]:
  - effect@3.11.2

## 0.40.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1

## 0.40.0

### Patch Changes

- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0

## 0.39.20

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20

## 0.39.19

### Patch Changes

- Updated dependencies [[`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7)]:
  - effect@3.10.19

## 0.39.18

### Patch Changes

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de)]:
  - effect@3.10.18

## 0.39.17

### Patch Changes

- Updated dependencies [[`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - effect@3.10.17

## 0.39.16

### Patch Changes

- Updated dependencies [[`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232)]:
  - effect@3.10.16

## 0.39.15

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15

## 0.39.14

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14

## 0.39.13

### Patch Changes

- Updated dependencies [[`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - effect@3.10.13

## 0.39.12

### Patch Changes

- Updated dependencies [[`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - effect@3.10.12

## 0.39.11

### Patch Changes

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11

## 0.39.10

### Patch Changes

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6)]:
  - effect@3.10.10

## 0.39.9

### Patch Changes

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9

## 0.39.8

### Patch Changes

- [#3874](https://github.com/Effect-TS/effect/pull/3874) [`c348b4a`](https://github.com/Effect-TS/effect/commit/c348b4abf07b3dec4ba9bb64ec38615e87e1b195) Thanks @jbmusso! - Fix WebSdk.layer not properly infering when passing an evaluate argument of type Effect

- Updated dependencies [[`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - effect@3.10.8

## 0.39.7

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7

## 0.39.6

### Patch Changes

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552)]:
  - effect@3.10.6

## 0.39.5

### Patch Changes

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5

## 0.39.4

### Patch Changes

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - effect@3.10.4

## 0.39.3

### Patch Changes

- Updated dependencies [[`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5)]:
  - effect@3.10.3

## 0.39.2

### Patch Changes

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37)]:
  - effect@3.10.2

## 0.39.1

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - effect@3.10.1

## 0.39.0

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0

## 0.38.2

### Patch Changes

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d)]:
  - effect@3.9.2

## 0.38.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - effect@3.9.1

## 0.38.0

### Minor Changes

- [#3737](https://github.com/Effect-TS/effect/pull/3737) [`6fc1e02`](https://github.com/Effect-TS/effect/commit/6fc1e020623dc10ece26572350db6ef824f8734d) Thanks @tim-smart! - remove Tracer.withActiveSpan

### Patch Changes

- [#3737](https://github.com/Effect-TS/effect/pull/3737) [`6fc1e02`](https://github.com/Effect-TS/effect/commit/6fc1e020623dc10ece26572350db6ef824f8734d) Thanks @tim-smart! - add Tracer.withSpanContext

  This api is useful for attaching a parent span to an Effect from an opentelemetry
  span outside of Effect.

  ```typescript
  import { Effect } from "effect"
  import { Tracer } from "@effect/opentelemetry"
  import * as OtelApi from "@opentelemetry/api"

  await OtelApi.trace.getTracer("test").startActiveSpan(
    "otel-span",
    {
      root: true
    },
    async (span) => {
      try {
        await Effect.runPromise(
          Effect.log("inside otel parent span").pipe(
            Tracer.withSpanContext(span.spanContext())
          )
        )
      } finally {
        span.end()
      }
    }
  )
  ```

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0

## 0.37.6

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5

## 0.37.5

### Patch Changes

- [#3705](https://github.com/Effect-TS/effect/pull/3705) [`534abce`](https://github.com/Effect-TS/effect/commit/534abce3c9455ee2612f51d2d1449b4e0510fbe4) Thanks @Schniz! - add withActiveSpan function to attach Effect to current Span

  This function allows you to connect the Effect spans into a parent span
  that was created outside of Effect, using the OpenTelemetry context propagation:

  ```ts
  Effect.gen(function* () {
    yield* Effect.sleep("100 millis").pipe(Effect.withSpan("sleep"))
    yield* Console.log("done")
  }).pipe(
    Effect.withSpan("program"),
    // This connects child spans to the current OpenTelemetry context
    Tracer.withActiveSpan
  )
  ```

## 0.37.4

### Patch Changes

- Updated dependencies [[`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683)]:
  - effect@3.8.4

## 0.37.3

### Patch Changes

- [#3644](https://github.com/Effect-TS/effect/pull/3644) [`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4) Thanks @tim-smart! - fix encoding of logs to tracer span events

- Updated dependencies [[`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - effect@3.8.3

## 0.37.2

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2

## 0.37.1

### Patch Changes

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1

## 0.37.0

### Minor Changes

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd) Thanks @mikearnaldi! - Cache some fiber references in the runtime to optimize reading in hot-paths

### Patch Changes

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0

## 0.36.3

### Patch Changes

- Updated dependencies [[`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be)]:
  - effect@3.7.3

## 0.36.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2

## 0.36.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1

## 0.36.0

### Patch Changes

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0

## 0.35.8

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8

## 0.35.7

### Patch Changes

- Updated dependencies [[`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - effect@3.6.7

## 0.35.6

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6

## 0.35.5

### Patch Changes

- Updated dependencies [[`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae)]:
  - effect@3.6.5

## 0.35.4

### Patch Changes

- Updated dependencies [[`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4)]:
  - effect@3.6.4

## 0.35.3

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3

## 0.35.2

### Patch Changes

- Updated dependencies [[`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - effect@3.6.2

## 0.35.1

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1

## 0.35.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0

## 0.34.42

### Patch Changes

- Updated dependencies [[`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - effect@3.5.9

## 0.34.41

### Patch Changes

- Updated dependencies [[`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231)]:
  - effect@3.5.8

## 0.34.40

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc)]:
  - effect@3.5.7

## 0.34.39

### Patch Changes

- Updated dependencies [[`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - effect@3.5.6

## 0.34.38

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39)]:
  - effect@3.5.5

## 0.34.37

### Patch Changes

- [#3254](https://github.com/Effect-TS/effect/pull/3254) [`1b45236`](https://github.com/Effect-TS/effect/commit/1b4523699f91bc1e04ce30de1c007f0c0cf6e214) Thanks @tim-smart! - force flush otel provider before calling shutdown

- Updated dependencies [[`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - effect@3.5.4

## 0.34.36

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3

## 0.34.35

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2

## 0.34.34

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1

## 0.34.33

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0

## 0.34.32

### Patch Changes

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9

## 0.34.31

### Patch Changes

- Updated dependencies [[`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c)]:
  - effect@3.4.8

## 0.34.30

### Patch Changes

- Updated dependencies [[`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - effect@3.4.7

## 0.34.29

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6

## 0.34.28

### Patch Changes

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91)]:
  - effect@3.4.5

## 0.34.27

### Patch Changes

- Updated dependencies [[`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c)]:
  - effect@3.4.4

## 0.34.26

### Patch Changes

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update dependencies

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - effect@3.4.3

## 0.34.25

### Patch Changes

- Updated dependencies [[`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - effect@3.4.2

## 0.34.24

### Patch Changes

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a)]:
  - effect@3.4.1

## 0.34.23

### Patch Changes

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0

## 0.34.22

### Patch Changes

- Updated dependencies [[`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7)]:
  - effect@3.3.5

## 0.34.21

### Patch Changes

- Updated dependencies [[`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352)]:
  - effect@3.3.4

## 0.34.20

### Patch Changes

- Updated dependencies [[`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad), [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d)]:
  - effect@3.3.3

## 0.34.19

### Patch Changes

- Updated dependencies [[`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd), [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85), [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2), [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d)]:
  - effect@3.3.2

## 0.34.18

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36)]:
  - effect@3.3.1

## 0.34.17

### Patch Changes

- Updated dependencies [[`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - effect@3.3.0

## 0.34.16

### Patch Changes

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa)]:
  - effect@3.2.9

## 0.34.15

### Patch Changes

- Updated dependencies [[`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - effect@3.2.8

## 0.34.14

### Patch Changes

- Updated dependencies [[`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - effect@3.2.7

## 0.34.13

### Patch Changes

- Updated dependencies [[`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba)]:
  - effect@3.2.6

## 0.34.12

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0)]:
  - effect@3.2.5

## 0.34.11

### Patch Changes

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d)]:
  - effect@3.2.4

## 0.34.10

### Patch Changes

- Updated dependencies [[`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - effect@3.2.3

## 0.34.9

### Patch Changes

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2)]:
  - effect@3.2.2

## 0.34.8

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1

## 0.34.7

### Patch Changes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - properly record exceptions in otel spans

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0

## 0.34.6

### Patch Changes

- Updated dependencies [[`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e)]:
  - effect@3.1.6

## 0.34.5

### Patch Changes

- [#2736](https://github.com/Effect-TS/effect/pull/2736) [`40c2b1d`](https://github.com/Effect-TS/effect/commit/40c2b1d9234bcfc9ab4039282b621ca092f800cd) Thanks [@patroza](https://github.com/patroza)! - update otel dependencies

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - effect@3.1.5

## 0.34.4

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4

## 0.34.3

### Patch Changes

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3

## 0.34.2

### Patch Changes

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - effect@3.1.2

## 0.34.1

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1

## 0.34.0

### Minor Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85) Thanks [@github-actions](https://github.com/apps/github-actions)! - add `kind` property to `Tracer.Span`

  This can be used to specify what kind of service created the span.

### Patch Changes

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0

## 0.33.5

### Patch Changes

- [#2656](https://github.com/Effect-TS/effect/pull/2656) [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - effect@3.0.8

## 0.33.4

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7

## 0.33.3

### Patch Changes

- [#2623](https://github.com/Effect-TS/effect/pull/2623) [`8492f5b`](https://github.com/Effect-TS/effect/commit/8492f5b944459fc966807202eccc9b7802799e6f) Thanks [@tim-smart](https://github.com/tim-smart)! - allow for multiple otel span processors & metric readers

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1)]:
  - effect@3.0.6

## 0.33.2

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5

## 0.33.1

### Patch Changes

- Updated dependencies [[`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - effect@3.0.4

## 0.33.0

### Minor Changes

- [#2572](https://github.com/Effect-TS/effect/pull/2572) [`c8c798a`](https://github.com/Effect-TS/effect/commit/c8c798a46a193fa678194b31fe2af99048fe71e0) Thanks [@nickrttn](https://github.com/nickrttn)! - Update @opentelemetry/\* peer dependencies to ensure allowed versions include used imports

### Patch Changes

- [#2575](https://github.com/Effect-TS/effect/pull/2575) [`d2ebe0e`](https://github.com/Effect-TS/effect/commit/d2ebe0e48aae248ac014fb976fa2d7bf3038394d) Thanks [@tim-smart](https://github.com/tim-smart)! - add otel Resource.layerFromEnv, for constructing a resource from env variables

## 0.32.3

### Patch Changes

- Updated dependencies [[`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e)]:
  - effect@3.0.3

## 0.32.2

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - effect@3.0.2

## 0.32.1

### Patch Changes

- [#2555](https://github.com/Effect-TS/effect/pull/2555) [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent use of `Array` as import name to solve bundler issues

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1

## 0.32.0

### Minor Changes

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

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0

## 0.31.29

### Patch Changes

- Updated dependencies [[`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871), [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b), [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c), [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9), [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1), [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212)]:
  - effect@2.4.19

## 0.31.28

### Patch Changes

- Updated dependencies [[`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594)]:
  - effect@2.4.18

## 0.31.27

### Patch Changes

- Updated dependencies [[`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f)]:
  - effect@2.4.17

## 0.31.26

### Patch Changes

- [#2433](https://github.com/Effect-TS/effect/pull/2433) [`ee10a50`](https://github.com/Effect-TS/effect/commit/ee10a50da859abf7154636d6d3e59511f0e0f590) Thanks [@vecerek](https://github.com/vecerek)! - Exports an empty NodeSDK layer suitable for incremental adoption and unit testing purposes

- Updated dependencies [[`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2)]:
  - effect@2.4.16

## 0.31.25

### Patch Changes

- Updated dependencies [[`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546), [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a)]:
  - effect@2.4.15

## 0.31.24

### Patch Changes

- Updated dependencies [[`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa)]:
  - effect@2.4.14

## 0.31.23

### Patch Changes

- Updated dependencies [[`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499)]:
  - effect@2.4.13

## 0.31.22

### Patch Changes

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - update typescript to 5.4

- Updated dependencies [[`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87)]:
  - effect@2.4.12

## 0.31.21

### Patch Changes

- [#2384](https://github.com/Effect-TS/effect/pull/2384) [`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8), [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5), [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60)]:
  - effect@2.4.11

## 0.31.20

### Patch Changes

- [#2375](https://github.com/Effect-TS/effect/pull/2375) [`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a) Thanks [@tim-smart](https://github.com/tim-smart)! - Make @effect/opentelemetry metrics conform to the spec
  - Metric labels add new data points instead of completely new metric data
  - Start times are determined from the first occurrence of a metric

- Updated dependencies [[`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a), [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968)]:
  - effect@2.4.10

## 0.31.19

### Patch Changes

- Updated dependencies [[`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99)]:
  - effect@2.4.9

## 0.31.18

### Patch Changes

- Updated dependencies [[`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566), [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb), [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0), [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9)]:
  - effect@2.4.8

## 0.31.17

### Patch Changes

- Updated dependencies [[`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6)]:
  - effect@2.4.7

## 0.31.16

### Patch Changes

- Updated dependencies [[`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be), [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f)]:
  - effect@2.4.6

## 0.31.15

### Patch Changes

- Updated dependencies [[`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3), [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f)]:
  - effect@2.4.5

## 0.31.14

### Patch Changes

- Updated dependencies [[`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38), [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b)]:
  - effect@2.4.4

## 0.31.13

### Patch Changes

- Updated dependencies [[`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e)]:
  - effect@2.4.3

## 0.31.12

### Patch Changes

- Updated dependencies [[`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0), [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8), [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00), [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27)]:
  - effect@2.4.2

## 0.31.11

### Patch Changes

- Updated dependencies [[`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac), [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831), [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31)]:
  - effect@2.4.1

## 0.31.10

### Patch Changes

- Updated dependencies [[`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101), [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f), [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f), [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484), [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff), [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe), [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a), [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e), [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561), [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108)]:
  - effect@2.4.0

## 0.31.9

### Patch Changes

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

- Updated dependencies [[`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9), [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf)]:
  - effect@2.3.8

## 0.31.8

### Patch Changes

- Updated dependencies [[`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f), [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de), [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241)]:
  - effect@2.3.7

## 0.31.7

### Patch Changes

- Updated dependencies [[`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444), [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8), [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333), [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e), [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a), [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0), [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62), [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12), [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880), [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce)]:
  - effect@2.3.6

## 0.31.6

### Patch Changes

- [#2131](https://github.com/Effect-TS/effect/pull/2131) [`9ee4de0`](https://github.com/Effect-TS/effect/commit/9ee4de01bb7edeefaa20cdd470e85f3c539d858f) Thanks [@tim-smart](https://github.com/tim-smart)! - ignore errors when attempting to shutdown otel

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
