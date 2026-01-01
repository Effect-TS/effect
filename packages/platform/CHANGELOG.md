# @effect/platform

## 0.94.1

### Patch Changes

- [#5936](https://github.com/Effect-TS/effect/pull/5936) [`65e9e35`](https://github.com/Effect-TS/effect/commit/65e9e35157cbdfb40826ddad34555c4ebcf7c0b0) Thanks @schickling! - Document subtle CORS middleware `allowedHeaders` behavior: when empty array (default), it reflects back the client's `Access-Control-Request-Headers` (permissive), and when non-empty array, it only allows specified headers (restrictive). Added comprehensive JSDoc with examples.

- [#5940](https://github.com/Effect-TS/effect/pull/5940) [`ee69cd7`](https://github.com/Effect-TS/effect/commit/ee69cd796feb3d8d1046f52edd8950404cd4ed0e) Thanks @kitlangton! - HttpServerResponse: fix `fromWeb` to preserve Content-Type header when response has a body

  Previously, when converting a web `Response` to an `HttpServerResponse` via `fromWeb`, the `Content-Type` header was not passed to `Body.stream()`, causing it to default to `application/octet-stream`. This affected any code using `HttpApp.fromWebHandler` to wrap web handlers, as JSON responses would incorrectly have their Content-Type set to `application/octet-stream` instead of `application/json`.

- Updated dependencies [[`488d6e8`](https://github.com/Effect-TS/effect/commit/488d6e870eda3dfc137f4940bb69416f61ed8fe3)]:
  - effect@3.19.14

## 0.94.0

### Minor Changes

- [#5917](https://github.com/Effect-TS/effect/pull/5917) [`ff7053f`](https://github.com/Effect-TS/effect/commit/ff7053f6d8508567b6145239f97aacc5773b0c53) Thanks @tim-smart! - support non-errors in HttpClient.retryTransient

### Patch Changes

- Updated dependencies [[`77eeb86`](https://github.com/Effect-TS/effect/commit/77eeb86ddf208e51ec25932af83d52d3b4700371), [`287c32c`](https://github.com/Effect-TS/effect/commit/287c32c9f10da8e96f2b9ef8424316189d9ad4b3)]:
  - effect@3.19.13

## 0.93.8

### Patch Changes

- [#5902](https://github.com/Effect-TS/effect/pull/5902) [`a0a84d8`](https://github.com/Effect-TS/effect/commit/a0a84d8df05d18023ffcb1f60af91d14c2b8db57) Thanks @tim-smart! - add HttpApp.fromWebHandler

- Updated dependencies [[`a6dfca9`](https://github.com/Effect-TS/effect/commit/a6dfca93b676eeffe4db64945b01e2004b395cb8)]:
  - effect@3.19.12

## 0.93.7

### Patch Changes

- [#5896](https://github.com/Effect-TS/effect/pull/5896) [`65bff45`](https://github.com/Effect-TS/effect/commit/65bff451fc54d47b32995b3bc898ccc5f8b1beb6) Thanks @tim-smart! - add basic apis for converting to web Request/Response

## 0.93.6

### Patch Changes

- [#5835](https://github.com/Effect-TS/effect/pull/5835) [`25d1cb6`](https://github.com/Effect-TS/effect/commit/25d1cb60aadf8f8fdf9a4aad3dbaa31e1ca3b70d) Thanks @tim-smart! - consider clean http interrupts as successful responses

## 0.93.5

### Patch Changes

- [#5818](https://github.com/Effect-TS/effect/pull/5818) [`ebfbbd6`](https://github.com/Effect-TS/effect/commit/ebfbbd62e1daf235d1f25b825d80ae4880408df3) Thanks @KhraksMamtsov! - Support `HttpApiError` unification

## 0.93.4

### Patch Changes

- [#5797](https://github.com/Effect-TS/effect/pull/5797) [`8ebd29e`](https://github.com/Effect-TS/effect/commit/8ebd29ec10976222c200901d9b72779af743e6d5) Thanks @tim-smart! - use original status code if headers have already been sent

## 0.93.3

### Patch Changes

- [#5759](https://github.com/Effect-TS/effect/pull/5759) [`e144f02`](https://github.com/Effect-TS/effect/commit/e144f02c93258f0bb37bd10ee9849f2836914e2f) Thanks @rohovskoi! - fix scalar configuration and types

## 0.93.2

### Patch Changes

- [#5737](https://github.com/Effect-TS/effect/pull/5737) [`2bb8242`](https://github.com/Effect-TS/effect/commit/2bb8242cb094e516665116707b798fc8e2bc5837) Thanks @tim-smart! - ensure HttpApiScalar source is tree-shakable

## 0.93.1

### Patch Changes

- [#5728](https://github.com/Effect-TS/effect/pull/5728) [`1961185`](https://github.com/Effect-TS/effect/commit/1961185e502459a188216f319a38c3dfe30fc6f0) Thanks @kitlangton! - Fix UrlParams.setAll overwrite semantics

## 0.93.0

### Patch Changes

- [#5606](https://github.com/Effect-TS/effect/pull/5606) [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433) Thanks @tim-smart! - expose Layer output in HttpLayerRouter.serve

- Updated dependencies [[`3c15d5f`](https://github.com/Effect-TS/effect/commit/3c15d5f99fb8d8470a00c5a33d9ba3cac89dfe4c), [`3863fa8`](https://github.com/Effect-TS/effect/commit/3863fa89f61e63e5529fd961e37333bddf7db64a), [`2a03c76`](https://github.com/Effect-TS/effect/commit/2a03c76c2781ca7e9e228e838eab2eb0d0795b1d), [`24a1685`](https://github.com/Effect-TS/effect/commit/24a1685c70a9ed157468650f95a5c3da3f2c2433)]:
  - effect@3.19.0

## 0.92.1

### Patch Changes

- [#5588](https://github.com/Effect-TS/effect/pull/5588) [`f6987c0`](https://github.com/Effect-TS/effect/commit/f6987c04ebf1386dc37729dfea1631ce364a5a96) Thanks @wmaurer! - add additional predicate typings for HttpMiddleware.cors allowOrigins

## 0.92.0

### Patch Changes

- [#5302](https://github.com/Effect-TS/effect/pull/5302) [`c60956e`](https://github.com/Effect-TS/effect/commit/c60956e18fe20841d39d0127c8c488af657ab936) Thanks @OliverJAsh! - Adjust `xForwardedHeaders` middleware to always use `x-forwarded-for`

- Updated dependencies [[`1c6ab74`](https://github.com/Effect-TS/effect/commit/1c6ab74b314b2b6df8bb1b1a0cb9527ceda0e3fa), [`70fe803`](https://github.com/Effect-TS/effect/commit/70fe803469db3355ffbf8359b52c351f1c2dc137), [`c296e32`](https://github.com/Effect-TS/effect/commit/c296e32554143b84ae8987046984e1cf1852417c), [`a098ddf`](https://github.com/Effect-TS/effect/commit/a098ddfc551f5aa0a7c36f9b4928372a64d4d9f2)]:
  - effect@3.18.0

## 0.91.1

### Patch Changes

- [#5552](https://github.com/Effect-TS/effect/pull/5552) [`ffa494c`](https://github.com/Effect-TS/effect/commit/ffa494cbc3e62039502b09718b0a9d5e0fb4e04c) Thanks @tim-smart! - allow predicates for HttpMiddleware.cors allowOrigins

## 0.91.0

### Minor Changes

- [#5549](https://github.com/Effect-TS/effect/pull/5549) [`d4d86a8`](https://github.com/Effect-TS/effect/commit/d4d86a81f02b94e09fce8004ce2c5369c505ca5a) Thanks @tim-smart! - remove msgpackr re-exports

## 0.90.10

### Patch Changes

- [#5517](https://github.com/Effect-TS/effect/pull/5517) [`de07e58`](https://github.com/Effect-TS/effect/commit/de07e5805496b80226ba6a5efc2b4c05e1aba4b8) Thanks @tim-smart! - add onOpen option to Socket.run

## 0.90.9

### Patch Changes

- [#5492](https://github.com/Effect-TS/effect/pull/5492) [`0421c8c`](https://github.com/Effect-TS/effect/commit/0421c8ce2ee614ae46b5684c850ab6aab8fa02e9) Thanks @tim-smart! - provide http span to global middleware

## 0.90.8

### Patch Changes

- [#5481](https://github.com/Effect-TS/effect/pull/5481) [`333be04`](https://github.com/Effect-TS/effect/commit/333be046b50e8300f5cb70b871448e0628b7b37c) Thanks @jpowersdev! - Allow user to set extension of file created using `FileSystem.makeTempFile`

## 0.90.7

### Patch Changes

- [#5466](https://github.com/Effect-TS/effect/pull/5466) [`75dffc8`](https://github.com/Effect-TS/effect/commit/75dffc877b1fa8c95fc026747b9060b7eba44232) Thanks @tim-smart! - ensure HttpApiClient adds encoding contentType to headers

## 0.90.6

### Patch Changes

- [#5418](https://github.com/Effect-TS/effect/pull/5418) [`7ad7b3c`](https://github.com/Effect-TS/effect/commit/7ad7b3c7de299d8d37bfcbe23b2717b7732d490b) Thanks @tim-smart! - exclude layer services from HttpLayerRouter.toWebHandler request context

## 0.90.5

### Patch Changes

- [#5410](https://github.com/Effect-TS/effect/pull/5410) [`fef9771`](https://github.com/Effect-TS/effect/commit/fef9771eab24af6415be946df0c9f64eba01cef7) Thanks @beeman! - export isQuitExection function from @effect/platform/Terminal

- Updated dependencies [[`84bc300`](https://github.com/Effect-TS/effect/commit/84bc3003b42ad51210e9e1248efd04c5d0e3dd1e)]:
  - effect@3.17.8

## 0.90.4

### Patch Changes

- [#5402](https://github.com/Effect-TS/effect/pull/5402) [`8c7bb52`](https://github.com/Effect-TS/effect/commit/8c7bb52dc78850be72566decba6222870e3733d0) Thanks @tim-smart! - abort HttpClientResponse.stream regardless of how stream ends

- [#5397](https://github.com/Effect-TS/effect/pull/5397) [`0e46e24`](https://github.com/Effect-TS/effect/commit/0e46e24c24e9edb8bf2e29835a94013e9c34d034) Thanks @IMax153! - Avoid issues with ESM builds by removing dependency on `@opentelemetry/semantic-conventions`

## 0.90.3

### Patch Changes

- [#5391](https://github.com/Effect-TS/effect/pull/5391) [`786867b`](https://github.com/Effect-TS/effect/commit/786867b1a443d4965aae4b4fd6391aaa85b6573a) Thanks @tim-smart! - support multiple HttpLayerRouter.addHttpApi

## 0.90.2

### Patch Changes

- [#5357](https://github.com/Effect-TS/effect/pull/5357) [`99302f4`](https://github.com/Effect-TS/effect/commit/99302f4233029ba3f4446f284d01af501cf1f4d6) Thanks @nounder! - Add `HttpServerResponse.expireCookie`

## 0.90.1

### Patch Changes

- [#5355](https://github.com/Effect-TS/effect/pull/5355) [`27a4e02`](https://github.com/Effect-TS/effect/commit/27a4e0285226cc0c084d19b5cdc4db1f38227559) Thanks @nounder! - Use `302 Found` status in `HttpServerResponse.redirect` as default

## 0.90.0

### Minor Changes

- [#5258](https://github.com/Effect-TS/effect/pull/5258) [`7813640`](https://github.com/Effect-TS/effect/commit/7813640279d9e3a3e7fc0a29bfb5c6d5fb3c270f) Thanks @kitlangton! - Changes Terminal.readInput to return a ReadonlyMailbox of events

  This allows for more efficient handling of input events, as well as ensuring
  events are not lost.

## 0.89.0

### Patch Changes

- Updated dependencies [[`40c3c87`](https://github.com/Effect-TS/effect/commit/40c3c875f724264312b43002859c82bed9ad0df9), [`ed2c74a`](https://github.com/Effect-TS/effect/commit/ed2c74ae8fa4ea0dd06ea84a3e58cd32e6916104), [`073a1b8`](https://github.com/Effect-TS/effect/commit/073a1b8be5dbfa87454393ee7346f5bc36a4fd63), [`f382e99`](https://github.com/Effect-TS/effect/commit/f382e99e409838a879246250fc3994b9bf5b3c2c), [`e8c7ba5`](https://github.com/Effect-TS/effect/commit/e8c7ba5fd3eb0c3ae3039fc24c09d69391987989), [`7e10415`](https://github.com/Effect-TS/effect/commit/7e1041599ade25103428703f5d2dfd7378a09636), [`e9bdece`](https://github.com/Effect-TS/effect/commit/e9bdececdc24f60a246be5055eca71a0d49ea7f2), [`8d95eb0`](https://github.com/Effect-TS/effect/commit/8d95eb0356b1d1736204836c275d201a547d208d)]:
  - effect@3.17.0

## 0.88.2

### Patch Changes

- [#5234](https://github.com/Effect-TS/effect/pull/5234) [`de513d9`](https://github.com/Effect-TS/effect/commit/de513d9abb8311998ca7016635f53be0ac766472) Thanks @tim-smart! - ensure duplicate paths are a defect in HttpApi

## 0.88.1

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

- [#5211](https://github.com/Effect-TS/effect/pull/5211) [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48) Thanks @mattiamanzati! - Removed some unnecessary single-arg pipe calls

- Updated dependencies [[`f5dfabf`](https://github.com/Effect-TS/effect/commit/f5dfabf51ba481a4468c1509c537314978ef6cec), [`17a5ea8`](https://github.com/Effect-TS/effect/commit/17a5ea8fa29785fe6e4c9480f2a2e9c8c59f3f38), [`d25f22b`](https://github.com/Effect-TS/effect/commit/d25f22be7598abe977caf6cdac3b0dd78b438c48)]:
  - effect@3.16.14

## 0.88.0

### Minor Changes

- [#5208](https://github.com/Effect-TS/effect/pull/5208) [`dbabf5e`](https://github.com/Effect-TS/effect/commit/dbabf5e76fa63b050d2b6c466713c7dc59f07d3c) Thanks @tim-smart! - consolidate Http web handler layer apis

### Patch Changes

- [#5206](https://github.com/Effect-TS/effect/pull/5206) [`27206d7`](https://github.com/Effect-TS/effect/commit/27206d7f0558d7fe28de57bf54f1d0cc83acc92e) Thanks @tim-smart! - lazily build HttpLayerRouter web handlers

## 0.87.13

### Patch Changes

- Updated dependencies [[`c1c05a8`](https://github.com/Effect-TS/effect/commit/c1c05a8242fb5df7445b4a12387a60eac7726eb7), [`81fe4a2`](https://github.com/Effect-TS/effect/commit/81fe4a2c81d5e30e180a60e68c52016a27b350db)]:
  - effect@3.16.13

## 0.87.12

### Patch Changes

- [#5177](https://github.com/Effect-TS/effect/pull/5177) [`32ba77a`](https://github.com/Effect-TS/effect/commit/32ba77ae304d2161362a73e8b61965332626cf2d) Thanks @johtso! - Fix KeyValueStore.make type mismatch

- [#5174](https://github.com/Effect-TS/effect/pull/5174) [`d5e25b2`](https://github.com/Effect-TS/effect/commit/d5e25b237f05670ee42b386cb40b2cb448fc11d7) Thanks @schickling! - feat(platform): add recursive option to FileSystem.watch

  Added a `recursive` option to `FileSystem.watch` that allows watching for changes in subdirectories. When set to `true`, the watcher will monitor changes in all nested directories.

  Note: The recursive option is only supported on macOS and Windows. On other platforms, it will be ignored.

  Example:

  ```ts
  import { FileSystem } from "@effect/platform"
  import { Effect, Stream } from "effect"

  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // Watch directory and all subdirectories
    yield* fs
      .watch("src", { recursive: true })
      .pipe(Stream.runForEach(console.log))
  })
  ```

## 0.87.11

### Patch Changes

- [#5184](https://github.com/Effect-TS/effect/pull/5184) [`001392b`](https://github.com/Effect-TS/effect/commit/001392ba8bfcad101bb034348a7415012fb12f72) Thanks @tim-smart! - ensure HttpApiClient schemas are composed correctly

- [#5181](https://github.com/Effect-TS/effect/pull/5181) [`7bfb099`](https://github.com/Effect-TS/effect/commit/7bfb099cb5528511b8d63045c4fbb4dc9cb18528) Thanks @tim-smart! - update find-my-way-ts

## 0.87.10

### Patch Changes

- [#5175](https://github.com/Effect-TS/effect/pull/5175) [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0) Thanks @tim-smart! - rename HttpLayerRouter.Type to Request

- [#5175](https://github.com/Effect-TS/effect/pull/5175) [`678318d`](https://github.com/Effect-TS/effect/commit/678318d2e88233156b006acda56c2d138ee3ffa0) Thanks @tim-smart! - propagate headers to HttpServerResponse.raw(Response)

## 0.87.9

### Patch Changes

- [#5170](https://github.com/Effect-TS/effect/pull/5170) [`54514a2`](https://github.com/Effect-TS/effect/commit/54514a2f53166de27ad7e756dbf12194691fd4af) Thanks @tim-smart! - add HttpLayerRouter.toWebHandler

## 0.87.8

### Patch Changes

- [#5166](https://github.com/Effect-TS/effect/pull/5166) [`4ce4f82`](https://github.com/Effect-TS/effect/commit/4ce4f824f6fdef492be1d35c05a490ffce518c89) Thanks @tim-smart! - add global middleware to HttpLayerRouter

## 0.87.7

### Patch Changes

- [#5153](https://github.com/Effect-TS/effect/pull/5153) [`a9b617f`](https://github.com/Effect-TS/effect/commit/a9b617f125171ed76cd79ab46d7a924daf3b0e70) Thanks @thewilkybarkid! - Fix UrlParams.toRecord when there's a **proto** key

- [#5159](https://github.com/Effect-TS/effect/pull/5159) [`7e26e86`](https://github.com/Effect-TS/effect/commit/7e26e86524abcc93713d6ad7eee486638c98f7c2) Thanks @tim-smart! - add HttpLayerRouter.add & addAll apis

## 0.87.6

### Patch Changes

- Updated dependencies [[`905da99`](https://github.com/Effect-TS/effect/commit/905da996aad665057b4ca6dba1a4af44fb8835bd)]:
  - effect@3.16.12

## 0.87.5

### Patch Changes

- [#5142](https://github.com/Effect-TS/effect/pull/5142) [`2fd8676`](https://github.com/Effect-TS/effect/commit/2fd8676c803cd40000dfc3231f5daecaa0e0ebd2) Thanks @tim-smart! - improve type safety of HttpLayerRouter.middleware error handling

## 0.87.4

### Patch Changes

- [#5137](https://github.com/Effect-TS/effect/pull/5137) [`e82a4fd`](https://github.com/Effect-TS/effect/commit/e82a4fd60f6528d08cef1a4aba0abe0d3ba741ad) Thanks @tim-smart! - move HttpLayerRouter request errors to Layer error channel

## 0.87.3

### Patch Changes

- [#5128](https://github.com/Effect-TS/effect/pull/5128) [`1b6e396`](https://github.com/Effect-TS/effect/commit/1b6e396d699f3cbbc56b68f99055cf746529bb9e) Thanks @tim-smart! - attach http request scope to stream lifetime for stream responses

## 0.87.2

### Patch Changes

- [#5111](https://github.com/Effect-TS/effect/pull/5111) [`4fea68c`](https://github.com/Effect-TS/effect/commit/4fea68ca7a25a3c39a1ab68b3885534513ab0c81) Thanks @mlegenhausen! - `HttpRouter.mountApp` prefix matching fixed

- [#5117](https://github.com/Effect-TS/effect/pull/5117) [`b927954`](https://github.com/Effect-TS/effect/commit/b9279543cf5688dd8a577af80456959c615217d0) Thanks @tim-smart! - add HttpLayerRouter module

  The experimental HttpLayerRouter module provides a simplified way to create HTTP servers.

  You can read more in the /platform README:

  https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md#httplayerrouter

- Updated dependencies [[`99590a6`](https://github.com/Effect-TS/effect/commit/99590a6ca9128eb1ede265b6670b655311995614), [`6c3e24c`](https://github.com/Effect-TS/effect/commit/6c3e24c2308f7d4a29b8f4270ab81bca22ac6bb4)]:
  - effect@3.16.11

## 0.87.1

### Patch Changes

- Updated dependencies [[`faad30e`](https://github.com/Effect-TS/effect/commit/faad30ec8742916be59f9db642d0fc98225b636c)]:
  - effect@3.16.10

## 0.87.0

### Minor Changes

- [#5087](https://github.com/Effect-TS/effect/pull/5087) [`b5bac9a`](https://github.com/Effect-TS/effect/commit/b5bac9ac2913fcd11b02322624f03b544eef53ba) Thanks @tim-smart! - add HttpApiClient.makeWith, for supporting passing in HttpClient with errors and requirements

## 0.86.0

### Minor Changes

- [#5081](https://github.com/Effect-TS/effect/pull/5081) [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07) Thanks @tim-smart! - use Context.Reference for Multipart configuration

### Patch Changes

- [#5081](https://github.com/Effect-TS/effect/pull/5081) [`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07) Thanks @tim-smart! - allow configuring multipart limits in HttpApiSchema.Multipart

- Updated dependencies [[`5137c70`](https://github.com/Effect-TS/effect/commit/5137c703461d8d3b363c112140a6e7f798241d07), [`c23d25c`](https://github.com/Effect-TS/effect/commit/c23d25c3e7c541f1f63b28484d8c461d86c67e99)]:
  - effect@3.16.9

## 0.85.2

### Patch Changes

- [#5053](https://github.com/Effect-TS/effect/pull/5053) [`914a191`](https://github.com/Effect-TS/effect/commit/914a191e7cb6341a3d0e965bccd27c336cf22e44) Thanks @tim-smart! - fix retrieval of HttpApiSchema.param annotations

## 0.85.1

### Patch Changes

- Updated dependencies [[`8cb98d5`](https://github.com/Effect-TS/effect/commit/8cb98d53e68330228287ce2a2e0d8a4c86bcab3b), [`db2dd3c`](https://github.com/Effect-TS/effect/commit/db2dd3c3a8a77d791eae19e66153527e1cde4e6e)]:
  - effect@3.16.8

## 0.85.0

### Minor Changes

- [#5042](https://github.com/Effect-TS/effect/pull/5042) [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e) Thanks @tim-smart! - HttpApiBuilder .handleRaw no longer parses the request body

### Patch Changes

- [#5042](https://github.com/Effect-TS/effect/pull/5042) [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e) Thanks @tim-smart! - allow return HttpServerResponse from HttpApiBuilder .handle

- [#5042](https://github.com/Effect-TS/effect/pull/5042) [`93687dd`](https://github.com/Effect-TS/effect/commit/93687ddbb25ce3b324cd2b83d2ccff225e97307e) Thanks @tim-smart! - add HttpApiSchema.MultipartStream

## 0.84.11

### Patch Changes

- Updated dependencies [[`1bb0d8a`](https://github.com/Effect-TS/effect/commit/1bb0d8ab96782e99434356266b38251554ea0294)]:
  - effect@3.16.7

## 0.84.10

### Patch Changes

- [#5032](https://github.com/Effect-TS/effect/pull/5032) [`bf369b2`](https://github.com/Effect-TS/effect/commit/bf369b2902a0e0b195d957c18b9efd180942cf8b) Thanks @tim-smart! - allow property signatures in HttpApiSchema.param

- Updated dependencies [[`a5f7595`](https://github.com/Effect-TS/effect/commit/a5f75956ef9a15a83c416517ef493f0ee2f5ee8a), [`a02470c`](https://github.com/Effect-TS/effect/commit/a02470c75579e91525a25adb3f21b3650d042fdd), [`f891d45`](https://github.com/Effect-TS/effect/commit/f891d45adffdafd3f94a2eca23faa354e3a409a8)]:
  - effect@3.16.6

## 0.84.9

### Patch Changes

- Updated dependencies [[`bf418ef`](https://github.com/Effect-TS/effect/commit/bf418ef14a0f2ec965535793d5cea8fa8ba177ac)]:
  - effect@3.16.5

## 0.84.8

### Patch Changes

- [#4996](https://github.com/Effect-TS/effect/pull/4996) [`8b9db77`](https://github.com/Effect-TS/effect/commit/8b9db7742846af0f58fd8e8b7acb7f4f5ff487ec) Thanks @tim-smart! - allow literals in HttpApiSchema.param

## 0.84.7

### Patch Changes

- Updated dependencies [[`74ab9a0`](https://github.com/Effect-TS/effect/commit/74ab9a0a9e16d6e019369d256e1e24175c8bc3f3), [`770008e`](https://github.com/Effect-TS/effect/commit/770008eca3aad2899a2ed951236e575793294b28)]:
  - effect@3.16.4

## 0.84.6

### Patch Changes

- [#4975](https://github.com/Effect-TS/effect/pull/4975) [`ceea77a`](https://github.com/Effect-TS/effect/commit/ceea77a13055f145520f763e3fce5b8ff15d728f) Thanks @tim-smart! - allow wrapping a web Response with HttpServerResponse.raw on some platforms

## 0.84.5

### Patch Changes

- [#4964](https://github.com/Effect-TS/effect/pull/4964) [`ec52c6a`](https://github.com/Effect-TS/effect/commit/ec52c6a2211e76972462b15b9d5a9d6d56761b7a) Thanks @tim-smart! - ensure HttpApi security middleware cache is not shared

## 0.84.4

### Patch Changes

- Updated dependencies [[`87722fc`](https://github.com/Effect-TS/effect/commit/87722fce693a9b49284bbddbf82d30714c688261), [`36217ee`](https://github.com/Effect-TS/effect/commit/36217eeb1337edd9ac3f9a635b80a6385d22ae8f)]:
  - effect@3.16.3

## 0.84.3

### Patch Changes

- [#4941](https://github.com/Effect-TS/effect/pull/4941) [`ab7684f`](https://github.com/Effect-TS/effect/commit/ab7684f1c2a0671bf091f255d220e3a4cc7f528e) Thanks @tim-smart! - decode HttpApiClient response from ArrayBuffer

## 0.84.2

### Patch Changes

- Updated dependencies [[`0ddf148`](https://github.com/Effect-TS/effect/commit/0ddf148a247aa87af043d276b8453a714a400897)]:
  - effect@3.16.2

## 0.84.1

### Patch Changes

- [#4936](https://github.com/Effect-TS/effect/pull/4936) [`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543) Thanks @mattiamanzati! - Escape JSON Schema $id for empty struct

- Updated dependencies [[`71174d0`](https://github.com/Effect-TS/effect/commit/71174d09691314a9b6b66189e456fd21e3eb6543), [`d615e6e`](https://github.com/Effect-TS/effect/commit/d615e6e5b944f6fd5e627e31752c7ca7e4e1c17d)]:
  - effect@3.16.1

## 0.84.0

### Patch Changes

- Updated dependencies [[`ee0bd5d`](https://github.com/Effect-TS/effect/commit/ee0bd5d24864752c54cb359f67a67dd903971ec4), [`5189800`](https://github.com/Effect-TS/effect/commit/51898004e11766b8cf6d95e960b636f6d5db79ec), [`58bfeaa`](https://github.com/Effect-TS/effect/commit/58bfeaa64ded8c88f772b184311c0c0dbac10960), [`194d748`](https://github.com/Effect-TS/effect/commit/194d7486943f56f3267ef415395ac220a4b3e634), [`918c9ea`](https://github.com/Effect-TS/effect/commit/918c9ea1a57facb154f0fb26792021f337054dee), [`9198e6f`](https://github.com/Effect-TS/effect/commit/9198e6fcc1a3ff4fefb3363004de558d8de01f40), [`2a370bf`](https://github.com/Effect-TS/effect/commit/2a370bf625fdeede5659721468eb0d527e403279), [`58ccb91`](https://github.com/Effect-TS/effect/commit/58ccb91328c8df5d49808b673738bc09df355201), [`fd47834`](https://github.com/Effect-TS/effect/commit/fd478348203fa89462b0a1d067ce4de034353df4)]:
  - effect@3.16.0

## 0.83.0

### Minor Changes

- [#4932](https://github.com/Effect-TS/effect/pull/4932) [`5522520`](https://github.com/Effect-TS/effect/commit/55225206ab9af0ad60b1c0654690a8a096d625cd) Thanks @tim-smart! - refactor PlatformError and make it a schema

### Patch Changes

- Updated dependencies [[`cc5bb2b`](https://github.com/Effect-TS/effect/commit/cc5bb2b918a9450a975f702dabcea891bda382cb)]:
  - effect@3.15.5

## 0.82.8

### Patch Changes

- [#4927](https://github.com/Effect-TS/effect/pull/4927) [`0617b9d`](https://github.com/Effect-TS/effect/commit/0617b9dc365f1963b36949ad7f9023ab6eb94524) Thanks @fubhy! - Fix package internal imports

## 0.82.7

### Patch Changes

- [#4921](https://github.com/Effect-TS/effect/pull/4921) [`c20b95a`](https://github.com/Effect-TS/effect/commit/c20b95a99ffe452b4774c844d397a905f713b6d6) Thanks @tim-smart! - update /platform dependencies

- [#4916](https://github.com/Effect-TS/effect/pull/4916) [`94ada43`](https://github.com/Effect-TS/effect/commit/94ada430928d5685bdbef513e87562c20774a3a2) Thanks @mattiamanzati! - Fix missing encoding of path parameters in HttpApiClient

- Updated dependencies [[`f570554`](https://github.com/Effect-TS/effect/commit/f57055459524587b041340577dad85476bb35f81), [`78047e8`](https://github.com/Effect-TS/effect/commit/78047e8dfc8005b66f87afe50bb95981fea51561)]:
  - effect@3.15.4

## 0.82.6

### Patch Changes

- [#4855](https://github.com/Effect-TS/effect/pull/4855) [`618903b`](https://github.com/Effect-TS/effect/commit/618903ba9ae96e2bfe6ee31f61c4359b915f2a36) Thanks @gcanti! - Enhance OpenAPI documentation handling by adding safe serialization and HTML escaping functions. This prevents script injection and ensures valid JSON output in the Swagger UI

## 0.82.5

### Patch Changes

- [#4912](https://github.com/Effect-TS/effect/pull/4912) [`7764a07`](https://github.com/Effect-TS/effect/commit/7764a07d960c60df81f14e1dc949518f4bbe494a) Thanks @tim-smart! - add HttpClient.withScope, for tying the lifetime of the request to a Scope

- [#4909](https://github.com/Effect-TS/effect/pull/4909) [`30a0d9c`](https://github.com/Effect-TS/effect/commit/30a0d9cb51c84290d51b1361d72ff5cee33c13c7) Thanks @tim-smart! - add HttpClientRequest.toUrl

- Updated dependencies [[`4577f54`](https://github.com/Effect-TS/effect/commit/4577f548d67273e576cdde423bdd34a4b910766a)]:
  - effect@3.15.3

## 0.82.4

### Patch Changes

- [#4896](https://github.com/Effect-TS/effect/pull/4896) [`d45e8a8`](https://github.com/Effect-TS/effect/commit/d45e8a8ac8227192f504e39e6d04fdcf4fb1d225) Thanks @seniorkonung! - Handle `Respondable` defects in `toResponseOrElseDefect`

- [#4890](https://github.com/Effect-TS/effect/pull/4890) [`d13b68e`](https://github.com/Effect-TS/effect/commit/d13b68e3a9456d0bfee9bca8273a7b44a9c69087) Thanks @KhraksMamtsov! - `Url.setPassword` supports `Redacted<string>` values

## 0.82.3

### Patch Changes

- [#4889](https://github.com/Effect-TS/effect/pull/4889) [`a328f4b`](https://github.com/Effect-TS/effect/commit/a328f4b4fe717dd53e5b04a30f387433c32f7328) Thanks @tim-smart! - add HttpBody.formDataRecord

- Updated dependencies [[`b8722b8`](https://github.com/Effect-TS/effect/commit/b8722b817e2306fe8c8245f3f9e32d85b824b961)]:
  - effect@3.15.2

## 0.82.2

### Patch Changes

- [#4882](https://github.com/Effect-TS/effect/pull/4882) [`739a3d4`](https://github.com/Effect-TS/effect/commit/739a3d4a4565915fe2e690003f4f9085cb4422fc) Thanks @tim-smart! - remove content headers for FormData bodies

## 0.82.1

### Patch Changes

- Updated dependencies [[`787ce70`](https://github.com/Effect-TS/effect/commit/787ce7042e35b657963473c6efe47752868cd811), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348), [`1269641`](https://github.com/Effect-TS/effect/commit/1269641a99ae43069f7648ff79ffe8729b54b348)]:
  - effect@3.15.1

## 0.82.0

### Minor Changes

- [#4641](https://github.com/Effect-TS/effect/pull/4641) [`a9b3fb7`](https://github.com/Effect-TS/effect/commit/a9b3fb78abcfdb525318a956fd02fcadeb56143e) Thanks @thewilkybarkid! - Allow removing multiple Headers

### Patch Changes

- Updated dependencies [[`c654595`](https://github.com/Effect-TS/effect/commit/c65459587b51da140b78098e81fdbfece65d53e2), [`d9f5dea`](https://github.com/Effect-TS/effect/commit/d9f5deae0f02f5de2b9fcb1cca8b142ba4bc2bba), [`49aa723`](https://github.com/Effect-TS/effect/commit/49aa7236a15e13f818c86edbca08c4af67c8dfaf), [`74c14d0`](https://github.com/Effect-TS/effect/commit/74c14d01d0cb48cf517a1b6e29a373a96ed0ff5b), [`e4f49b6`](https://github.com/Effect-TS/effect/commit/e4f49b66857e01b74ab6a9a0bc7132f44cd04cbb), [`6f02224`](https://github.com/Effect-TS/effect/commit/6f02224b3fc46a682ad2defb1a260841956c6780), [`1dcfd41`](https://github.com/Effect-TS/effect/commit/1dcfd41ff96abd706901293a00c1893cb29dd8fd), [`b21ab16`](https://github.com/Effect-TS/effect/commit/b21ab16b6f773e7ec4369db4e752c35e719f7870), [`fcf1822`](https://github.com/Effect-TS/effect/commit/fcf1822f98fcda60351d64e9d2c2c13563d7e6db), [`0061dd1`](https://github.com/Effect-TS/effect/commit/0061dd140740165e91569a684cce27a77b23229e), [`8421e6e`](https://github.com/Effect-TS/effect/commit/8421e6e49332bca8f96f482dfd48680e238b3a89), [`fa10f56`](https://github.com/Effect-TS/effect/commit/fa10f56b96bd9af070ba99ebc3279aa93954261e)]:
  - effect@3.15.0

## 0.81.1

### Patch Changes

- Updated dependencies [[`24a9ebb`](https://github.com/Effect-TS/effect/commit/24a9ebbb5af598f0bfd6ecc45307e528043fe011)]:
  - effect@3.14.22

## 0.81.0

### Minor Changes

- [#4842](https://github.com/Effect-TS/effect/pull/4842) [`672920f`](https://github.com/Effect-TS/effect/commit/672920f85da8abd5f9d4ad85e29248a2aca57ed8) Thanks @tim-smart! - allow overriding http span names

  ```ts
  import { FetchHttpClient, HttpClient } from "@effect/platform"
  import { NodeRuntime } from "@effect/platform-node"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      // Customize the span names for this HttpClient
      HttpClient.withSpanNameGenerator(
        (request) => `http.client ${request.method} ${request.url}`
      )
    )

    yield* client.get("https://jsonplaceholder.typicode.com/posts/1")
  }).pipe(Effect.provide(FetchHttpClient.layer), NodeRuntime.runMain)
  ```

  And for a server:

  ```ts
  import {
    HttpMiddleware,
    HttpRouter,
    HttpServer,
    HttpServerResponse
  } from "@effect/platform"
  import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
  import { Layer } from "effect"
  import { createServer } from "http"

  HttpRouter.empty.pipe(
    HttpRouter.get("/", HttpServerResponse.empty()),
    HttpServer.serve(),
    // Customize the span names for this HttpApp
    HttpMiddleware.withSpanNameGenerator((request) => `GET ${request.url}`),
    Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
    Layer.launch,
    NodeRuntime.runMain
  )
  ```

## 0.80.21

### Patch Changes

- Updated dependencies [[`2f3b7d4`](https://github.com/Effect-TS/effect/commit/2f3b7d4e1fa1ef8790b0ca4da22eb88872ee31df)]:
  - effect@3.14.21

## 0.80.20

### Patch Changes

- Updated dependencies [[`17e2f30`](https://github.com/Effect-TS/effect/commit/17e2f3091408cf0fca9414d4af3bdf7b2765b378)]:
  - effect@3.14.20

## 0.80.19

### Patch Changes

- [#4821](https://github.com/Effect-TS/effect/pull/4821) [`e25e7bb`](https://github.com/Effect-TS/effect/commit/e25e7bbc1797733916f48f501425d9f2ef310d9f) Thanks @seniorkonung! - Ensure HttpApp defects are always 500

- Updated dependencies [[`056a910`](https://github.com/Effect-TS/effect/commit/056a910d0a0b8b00b0dc9df4a070466b2b5c2f6c), [`3273d57`](https://github.com/Effect-TS/effect/commit/3273d572c2b3175a842677f19efeea4cd65ab016)]:
  - effect@3.14.19

## 0.80.18

### Patch Changes

- Updated dependencies [[`b1164d4`](https://github.com/Effect-TS/effect/commit/b1164d49a1dfdf299e9971367b6fc6be4df0ddff)]:
  - effect@3.14.18

## 0.80.17

### Patch Changes

- Updated dependencies [[`0b54681`](https://github.com/Effect-TS/effect/commit/0b54681cd89245e211d8f49272be0f1bf2f81813), [`41a59d5`](https://github.com/Effect-TS/effect/commit/41a59d5916a296b12b0d5ead9e859e05f40b4cce)]:
  - effect@3.14.17

## 0.80.16

### Patch Changes

- [#4803](https://github.com/Effect-TS/effect/pull/4803) [`f1c8583`](https://github.com/Effect-TS/effect/commit/f1c8583f8c3ea9415f813795ca2940a897c9ba9a) Thanks @tim-smart! - expose uninteruptible option to HttpApiBuilder .handle apis

- Updated dependencies [[`ee14444`](https://github.com/Effect-TS/effect/commit/ee144441021ec77039e43396eaf90714687bb495)]:
  - effect@3.14.16

## 0.80.15

### Patch Changes

- Updated dependencies [[`239cc99`](https://github.com/Effect-TS/effect/commit/239cc995ce645946210a3c3d2cb52bd3547c0687), [`8b6c947`](https://github.com/Effect-TS/effect/commit/8b6c947eaa8e45a67ecb3c37d45cd27f3e41d165), [`c50a63b`](https://github.com/Effect-TS/effect/commit/c50a63bbecb9f560b9cae349c447eed877d1b9b6)]:
  - effect@3.14.15

## 0.80.14

### Patch Changes

- Updated dependencies [[`6ed8d15`](https://github.com/Effect-TS/effect/commit/6ed8d1589beb181d30abc79afebdaabc1d101538)]:
  - effect@3.14.14

## 0.80.13

### Patch Changes

- Updated dependencies [[`ee77788`](https://github.com/Effect-TS/effect/commit/ee77788747e7ebbde6bfa88256cde49dbbad3608), [`5fce6ba`](https://github.com/Effect-TS/effect/commit/5fce6ba19c3cc63cc0104e737e581ad989dedbf0), [`570e45f`](https://github.com/Effect-TS/effect/commit/570e45f8cb936e42ec48f67f21bb2b7252f36c0c)]:
  - effect@3.14.13

## 0.80.12

### Patch Changes

- Updated dependencies [[`c2ad9ee`](https://github.com/Effect-TS/effect/commit/c2ad9ee9f3c4c743390edf35ed9e85a20be33811), [`9c68654`](https://github.com/Effect-TS/effect/commit/9c686542b6eb3ea188cb70673ef2e41223633e89)]:
  - effect@3.14.12

## 0.80.11

### Patch Changes

- Updated dependencies [[`e536127`](https://github.com/Effect-TS/effect/commit/e536127c1e6f2fb3a542c73ae919435a629a346b)]:
  - effect@3.14.11

## 0.80.10

### Patch Changes

- Updated dependencies [[`bc7efa3`](https://github.com/Effect-TS/effect/commit/bc7efa3b031bb25e1ed3c8f2d3fb5e8da166cadc)]:
  - effect@3.14.10

## 0.80.9

### Patch Changes

- Updated dependencies [[`d78249f`](https://github.com/Effect-TS/effect/commit/d78249f0b67f63cf4baf806ff090cba33293daf0)]:
  - effect@3.14.9

## 0.80.8

### Patch Changes

- Updated dependencies [[`b3a2d32`](https://github.com/Effect-TS/effect/commit/b3a2d32772e6f7f20eacf2e18128e99324c4d378)]:
  - effect@3.14.8

## 0.80.7

### Patch Changes

- Updated dependencies [[`b542a4b`](https://github.com/Effect-TS/effect/commit/b542a4bf195be0c9af1523e1ba96c953decc4d25)]:
  - effect@3.14.7

## 0.80.6

### Patch Changes

- Updated dependencies [[`47618c1`](https://github.com/Effect-TS/effect/commit/47618c1ad84ebcc5a51133a3fff5aa5012d49d45), [`6077882`](https://github.com/Effect-TS/effect/commit/60778824a4794336c33807801f813f8751d1c7e4)]:
  - effect@3.14.6

## 0.80.5

### Patch Changes

- [#4642](https://github.com/Effect-TS/effect/pull/4642) [`85fba81`](https://github.com/Effect-TS/effect/commit/85fba815ac07eb13d4227a69ac76a18e4b94df18) Thanks @nounder! - Fix options in `HttpServerResponse.raw`

- Updated dependencies [[`40dbfef`](https://github.com/Effect-TS/effect/commit/40dbfeff239b6e567706752114f31b2fce7de4e3), [`5a5ebdd`](https://github.com/Effect-TS/effect/commit/5a5ebdddfaddd259538b4599a6676281faca778e)]:
  - effect@3.14.5

## 0.80.4

### Patch Changes

- Updated dependencies [[`e4ba2c6`](https://github.com/Effect-TS/effect/commit/e4ba2c66a878e81b5e295d6d49aaf724b80a28ef)]:
  - effect@3.14.4

## 0.80.3

### Patch Changes

- Updated dependencies [[`37aa8e1`](https://github.com/Effect-TS/effect/commit/37aa8e137725a902e70cd1e468ea98b873aa5056), [`34f03d6`](https://github.com/Effect-TS/effect/commit/34f03d66875f21f266f102223a03cd14c2ed6ea6)]:
  - effect@3.14.3

## 0.80.2

### Patch Changes

- Updated dependencies [[`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`f87991b`](https://github.com/Effect-TS/effect/commit/f87991b6d8a2edfaf90b01cebda4b466992ae865), [`0a3e3e1`](https://github.com/Effect-TS/effect/commit/0a3e3e18eea5e0d1882f1a6c906198e6ef226a41)]:
  - effect@3.14.2

## 0.80.1

### Patch Changes

- Updated dependencies [[`4a274fe`](https://github.com/Effect-TS/effect/commit/4a274fe9f623182b6b902827e0e83bd89ca3b05c)]:
  - effect@3.14.1

## 0.80.0

### Minor Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`3131f8f`](https://github.com/Effect-TS/effect/commit/3131f8fd12ba9eb31b90fa2f42bf88b12309133c) Thanks @tim-smart! - refactor of @effect/cluster packages

### Patch Changes

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce) Thanks @tim-smart! - move the MsgPack, Ndjson & ChannelSchema modules to @effect/platform

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce) Thanks @tim-smart! - add HttpRouter.Tag.serve api

- [#4469](https://github.com/Effect-TS/effect/pull/4469) [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce) Thanks @tim-smart! - Move SocketServer modules to @effect/platform

- Updated dependencies [[`1f47e4e`](https://github.com/Effect-TS/effect/commit/1f47e4e12546ab691b29bfb7b5128bb17b93baa5), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`04dff2d`](https://github.com/Effect-TS/effect/commit/04dff2d01ac68c260f29a6d4743381825c353c86), [`c7fac0c`](https://github.com/Effect-TS/effect/commit/c7fac0cd7eadcd5cc0c3a987051c5b57ad271638), [`aba2d1d`](https://github.com/Effect-TS/effect/commit/aba2d1d831ea149481bd4dd755528c0afa8239ce), [`ffaa3f3`](https://github.com/Effect-TS/effect/commit/ffaa3f3969df26610fcc02ad537340641d44e803), [`ab957c1`](https://github.com/Effect-TS/effect/commit/ab957c1fee714868f56c7ab4e802b9d449e9b666), [`35db9ce`](https://github.com/Effect-TS/effect/commit/35db9ce228f1416c8abacc6dc9c36fbd0f33ef0f), [`cf77ea9`](https://github.com/Effect-TS/effect/commit/cf77ea9ab4fc89e66a43f682a9926ccdee6c57ed), [`26dd75f`](https://github.com/Effect-TS/effect/commit/26dd75f276a0d8a63eab313bd5a167d5072c9780), [`baaab60`](https://github.com/Effect-TS/effect/commit/baaab60b737f35dfab8e4a21bce28a195d19e899)]:
  - effect@3.14.0

## 0.79.4

### Patch Changes

- [#4592](https://github.com/Effect-TS/effect/pull/4592) [`5662363`](https://github.com/Effect-TS/effect/commit/566236361e270e575ef1cbf308ad1967c82a362c) Thanks @tim-smart! - support nested records in UrlParams module

- [#4615](https://github.com/Effect-TS/effect/pull/4615) [`5f1fd15`](https://github.com/Effect-TS/effect/commit/5f1fd15308ab154791580059b89877d19a2055c2) Thanks @KhraksMamtsov! - - Relax `Url.setPort` constraint
  - Use `URL | ...` for `baseUrl` in `HttpApiClient.make`

- [#4614](https://github.com/Effect-TS/effect/pull/4614) [`8bb1460`](https://github.com/Effect-TS/effect/commit/8bb1460c824f66f0f25ebd899c5e74e388089c37) Thanks @gcanti! - HttpApiEndpoint: add missing `head` and `options` constructors, closes #4613.

## 0.79.3

### Patch Changes

- Updated dependencies [[`0c4803f`](https://github.com/Effect-TS/effect/commit/0c4803fcc69262d11a97ce49d0e9b4288df0651f), [`6f65ac4`](https://github.com/Effect-TS/effect/commit/6f65ac4eac1489cd6ea390e18b0908670722adad)]:
  - effect@3.13.12

## 0.79.2

### Patch Changes

- Updated dependencies [[`fad8cca`](https://github.com/Effect-TS/effect/commit/fad8cca9bbfcc2eaeb44b97c15dbe0a1eda75315), [`4296293`](https://github.com/Effect-TS/effect/commit/4296293049414d0cf2d915a26c552b09f946b9a0), [`9c241ab`](https://github.com/Effect-TS/effect/commit/9c241abe47ccf7a5257b98a4a64a63054a12741d), [`082b0c1`](https://github.com/Effect-TS/effect/commit/082b0c1b9f4252bcdd69608f2e4a9226f953ac3f), [`be12983`](https://github.com/Effect-TS/effect/commit/be12983bc7e7537b41cd8910fc4eb7d1da56ab07), [`de88127`](https://github.com/Effect-TS/effect/commit/de88127a5a5906ccece98af74787b5ae0e65e431)]:
  - effect@3.13.11

## 0.79.1

### Patch Changes

- Updated dependencies [[`527c964`](https://github.com/Effect-TS/effect/commit/527c9645229f5be9714a7e60a38a9e753c4bbfb1)]:
  - effect@3.13.10

## 0.79.0

### Minor Changes

- [#4573](https://github.com/Effect-TS/effect/pull/4573) [`88fe129`](https://github.com/Effect-TS/effect/commit/88fe12923740765c0335a6e6203fdcc6a463edca) Thanks @tim-smart! - remove Scope from HttpClient requirements

  Before:

  ```ts
  import { HttpClient } from "@effect/platform"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get("https://api.github.com/users/octocat")
    return yield* response.json
  }).pipe(Effect.scoped)
  ```

  After:

  ```ts
  import { HttpClient } from "@effect/platform"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.get("https://api.github.com/users/octocat")
    return yield* response.json
  }) // no need to add Effect.scoped
  ```

### Patch Changes

- [#4583](https://github.com/Effect-TS/effect/pull/4583) [`d630249`](https://github.com/Effect-TS/effect/commit/d630249426113088abe8b382db4f14d80f2160c2) Thanks @tim-smart! - support Layer.launch when using WorkerRunner

- Updated dependencies [[`2976e52`](https://github.com/Effect-TS/effect/commit/2976e52538d9dc9ffdcbc84d4ac748cff9305971)]:
  - effect@3.13.9

## 0.78.1

### Patch Changes

- Updated dependencies [[`c65d336`](https://github.com/Effect-TS/effect/commit/c65d3362d07ec815ff3b46278314e8a31706ddc2), [`22d2ebb`](https://github.com/Effect-TS/effect/commit/22d2ebb4b11f5a44351a4736e65da391a3b647d0)]:
  - effect@3.13.8

## 0.78.0

### Minor Changes

- [#4562](https://github.com/Effect-TS/effect/pull/4562) [`c5bcf53`](https://github.com/Effect-TS/effect/commit/c5bcf53b7cb49dacffdd2a6cd8eb48cc452b417e) Thanks @tim-smart! - expose ParseError in HttpApiClient

## 0.77.7

### Patch Changes

- [#4540](https://github.com/Effect-TS/effect/pull/4540) [`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd) Thanks @gcanti! - Add `additionalPropertiesStrategy` option to `OpenApi.fromApi`, closes #4531.

  This update introduces the `additionalPropertiesStrategy` option in `OpenApi.fromApi`, allowing control over how additional properties are handled in the generated OpenAPI schema.
  - When `"strict"` (default), additional properties are disallowed (`"additionalProperties": false`).
  - When `"allow"`, additional properties are allowed (`"additionalProperties": true`), making APIs more flexible.

  The `additionalPropertiesStrategy` option has also been added to:
  - `JSONSchema.fromAST`
  - `OpenApiJsonSchema.makeWithDefs`

  **Example**

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/").addSuccess(
        Schema.Struct({ a: Schema.String })
      )
    )
  )

  const schema = OpenApi.fromApi(api, {
    additionalPropertiesStrategy: "allow"
  })

  console.log(JSON.stringify(schema, null, 2))
  /*
  {
    "openapi": "3.1.0",
    "info": {
      "title": "Api",
      "version": "0.0.1"
    },
    "paths": {
      "/": {
        "get": {
          "tags": [
            "group"
          ],
          "operationId": "group.get",
          "parameters": [],
          "security": [],
          "responses": {
            "200": {
              "description": "Success",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": [
                      "a"
                    ],
                    "properties": {
                      "a": {
                        "type": "string"
                      }
                    },
                    "additionalProperties": true
                  }
                }
              }
            },
            "400": {
              "description": "The request did not match the expected schema",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HttpApiDecodeError"
                  }
                }
              }
            }
          }
        }
      }
    },
    "components": {
      "schemas": {
        "HttpApiDecodeError": {
          "type": "object",
          "required": [
            "issues",
            "message",
            "_tag"
          ],
          "properties": {
            "issues": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Issue"
              }
            },
            "message": {
              "type": "string"
            },
            "_tag": {
              "type": "string",
              "enum": [
                "HttpApiDecodeError"
              ]
            }
          },
          "additionalProperties": true,
          "description": "The request did not match the expected schema"
        },
        "Issue": {
          "type": "object",
          "required": [
            "_tag",
            "path",
            "message"
          ],
          "properties": {
            "_tag": {
              "type": "string",
              "enum": [
                "Pointer",
                "Unexpected",
                "Missing",
                "Composite",
                "Refinement",
                "Transformation",
                "Type",
                "Forbidden"
              ],
              "description": "The tag identifying the type of parse issue"
            },
            "path": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/PropertyKey"
              },
              "description": "The path to the property where the issue occurred"
            },
            "message": {
              "type": "string",
              "description": "A descriptive message explaining the issue"
            }
          },
          "additionalProperties": true,
          "description": "Represents an error encountered while parsing a value to match the schema"
        },
        "PropertyKey": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "object",
              "required": [
                "_tag",
                "key"
              ],
              "properties": {
                "_tag": {
                  "type": "string",
                  "enum": [
                    "symbol"
                  ]
                },
                "key": {
                  "type": "string"
                }
              },
              "additionalProperties": true,
              "description": "an object to be decoded into a globally shared symbol"
            }
          ]
        }
      },
      "securitySchemes": {}
    },
    "security": [],
    "tags": [
      {
        "name": "group"
      }
    ]
  }
  */
  ```

- [#4541](https://github.com/Effect-TS/effect/pull/4541) [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c) Thanks @fubhy! - Disallowed excess properties for various function options

- [#4559](https://github.com/Effect-TS/effect/pull/4559) [`f910880`](https://github.com/Effect-TS/effect/commit/f91088069057f3b4529753f5bc5532b028d726df) Thanks @tim-smart! - add additional properties options to HttpApiBuilder.middlewareOpenApi

- [#4493](https://github.com/Effect-TS/effect/pull/4493) [`0d01480`](https://github.com/Effect-TS/effect/commit/0d014803e4f688f74386a80abd65485e1a319244) Thanks @leonitousconforti! - FetchHttpClient merge headers from request and requestInit

- Updated dependencies [[`840cc73`](https://github.com/Effect-TS/effect/commit/840cc7329908db7ca693ef47b07d4f845c29cadd), [`9bf8a74`](https://github.com/Effect-TS/effect/commit/9bf8a74b967f18d931743dd5196af326c9118e9c), [`87ba23c`](https://github.com/Effect-TS/effect/commit/87ba23c41c193503ed0c612b0d32d0b253794c64)]:
  - effect@3.13.7

## 0.77.6

### Patch Changes

- Updated dependencies [[`3154ce4`](https://github.com/Effect-TS/effect/commit/3154ce4692fa18b804982158d3c4c8a8a5fae386)]:
  - effect@3.13.6

## 0.77.5

### Patch Changes

- Updated dependencies [[`367bb35`](https://github.com/Effect-TS/effect/commit/367bb35f4c2a254e1fb211d96db2474a7aed9020), [`6cf11c3`](https://github.com/Effect-TS/effect/commit/6cf11c3a75773ceec2877c85ddc760f381f0866d), [`a0acec8`](https://github.com/Effect-TS/effect/commit/a0acec851f72e19466363d24b9cc218acd00006a)]:
  - effect@3.13.5

## 0.77.4

### Patch Changes

- [#4525](https://github.com/Effect-TS/effect/pull/4525) [`e0746f9`](https://github.com/Effect-TS/effect/commit/e0746f9aa398b69c6542e375910683bf17f49f46) Thanks @anderssjoberg97! - Fix w3c traceparent header parsing

- Updated dependencies [[`17d9e89`](https://github.com/Effect-TS/effect/commit/17d9e89f9851663bdbb6c1e685601d97806114a4)]:
  - effect@3.13.4

## 0.77.3

### Patch Changes

- Updated dependencies [[`cc5588d`](https://github.com/Effect-TS/effect/commit/cc5588df07f9103513547cb429ce041b9436a8bd), [`623c8cd`](https://github.com/Effect-TS/effect/commit/623c8cd053ed6ee3d353aaa8778d484670fca2bb), [`00b4eb1`](https://github.com/Effect-TS/effect/commit/00b4eb1ece12a16e222e6220965bb4024d6752ac), [`f2aee98`](https://github.com/Effect-TS/effect/commit/f2aee989b0a600900ce83e7f460d02908620c80f), [`fb798eb`](https://github.com/Effect-TS/effect/commit/fb798eb9061f1191badc017d1aa649360254da20), [`2251b15`](https://github.com/Effect-TS/effect/commit/2251b1528810bb695b37ce388b653cec0c5bf80c), [`2e15c1e`](https://github.com/Effect-TS/effect/commit/2e15c1e33648add0b29fe274fbcb7294b7515085), [`a4979db`](https://github.com/Effect-TS/effect/commit/a4979db021aef16e731be64df196b72088fc4376), [`b74255a`](https://github.com/Effect-TS/effect/commit/b74255a304ad49d60bedb1a260fd697f370af27a), [`d7f6a5c`](https://github.com/Effect-TS/effect/commit/d7f6a5c7d26c1963dcd864ca62360d20d08c7b49), [`9dd8979`](https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02), [`477b488`](https://github.com/Effect-TS/effect/commit/477b488284f47c5469d7fba3e4065fb7e3b6556e), [`10932cb`](https://github.com/Effect-TS/effect/commit/10932cbf58fc721ada631cebec42f773ce96d3cc), [`9f6c784`](https://github.com/Effect-TS/effect/commit/9f6c78468b3b5e9ebfc38ffdfb70702901ee977b), [`2c639ec`](https://github.com/Effect-TS/effect/commit/2c639ecee332de4266e36022c989c35ae4e02105), [`886aaa8`](https://github.com/Effect-TS/effect/commit/886aaa81e06dfd3cd9391e8ea987d8cd5ada1124)]:
  - effect@3.13.3

## 0.77.2

### Patch Changes

- [#4456](https://github.com/Effect-TS/effect/pull/4456) [`3e7ce97`](https://github.com/Effect-TS/effect/commit/3e7ce97f8a41756a039cf635d0b3d9a75d781097) Thanks @tim-smart! - ensure key for header security is lower case

- [#4472](https://github.com/Effect-TS/effect/pull/4472) [`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f) Thanks @gcanti! - Add support for `Schema.Enums` in `HttpApiBuilder.isSingleStringType`, closes #4471.

- Updated dependencies [[`31be72a`](https://github.com/Effect-TS/effect/commit/31be72ada118cb84a942e67b1663263f8db74a9f)]:
  - effect@3.13.2

## 0.77.1

### Patch Changes

- Updated dependencies [[`b56a211`](https://github.com/Effect-TS/effect/commit/b56a2110569fd0ec0b57ac137743e926d49f51cc)]:
  - effect@3.13.1

## 0.77.0

### Patch Changes

- Updated dependencies [[`8baef83`](https://github.com/Effect-TS/effect/commit/8baef83e7ff0b7bc0738b680e1ef013065386cff), [`655bfe2`](https://github.com/Effect-TS/effect/commit/655bfe29e44cc3f0fb9b4e53038f50b891c188df), [`d90cbc2`](https://github.com/Effect-TS/effect/commit/d90cbc274e2742d18671fe65aa4764c057eb6cba), [`75632bd`](https://github.com/Effect-TS/effect/commit/75632bd44b8025101d652ccbaeef898c7086c91c), [`c874a2e`](https://github.com/Effect-TS/effect/commit/c874a2e4b17e9d71904ca8375bb77b020975cb1d), [`bf865e5`](https://github.com/Effect-TS/effect/commit/bf865e5833f77fd8f6c06944ca9d507b54488301), [`f98b2b7`](https://github.com/Effect-TS/effect/commit/f98b2b7592cf20f9d85313e7f1e964cb65878138), [`de8ce92`](https://github.com/Effect-TS/effect/commit/de8ce924923eaa4e1b761a97eb45ec967389f3d5), [`cf8b2dd`](https://github.com/Effect-TS/effect/commit/cf8b2dd112f8e092ed99d78fd728db0f91c29050), [`db426a5`](https://github.com/Effect-TS/effect/commit/db426a5fb41ab84d18e3c8753a7329b4de544245), [`6862444`](https://github.com/Effect-TS/effect/commit/6862444094906ad4f2cb077ff3b9cc0b73880c8c), [`5fc8a90`](https://github.com/Effect-TS/effect/commit/5fc8a90ba46a5fd9f3b643f0b5aeadc69d717339), [`546a492`](https://github.com/Effect-TS/effect/commit/546a492e60eb2b8b048a489a474b934ea0877005), [`65c4796`](https://github.com/Effect-TS/effect/commit/65c47966ce39055f02cf5c808daabb3ea6442b0b), [`9760fdc`](https://github.com/Effect-TS/effect/commit/9760fdc37bdaef9da8b150e46b86ddfbe2ad9221), [`5b471e7`](https://github.com/Effect-TS/effect/commit/5b471e7d4317e8ee5d72bbbd3e0c9775160949ab), [`4f810cc`](https://github.com/Effect-TS/effect/commit/4f810cc2770e9f1f266851d2cb6257112c12af49)]:
  - effect@3.13.0

## 0.76.1

### Patch Changes

- [#4444](https://github.com/Effect-TS/effect/pull/4444) [`c407726`](https://github.com/Effect-TS/effect/commit/c407726f79df4a567a9631cddd8effaa16b3535d) Thanks @gcanti! - HttpApiBuilder: URL parameters are now automatically converted to arrays when needed, closes #4442.

  **Example**

  ```ts
  import {
    HttpApi,
    HttpApiBuilder,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpMiddleware,
    HttpServer
  } from "@effect/platform"
  import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
  import { Effect, Layer, Schema } from "effect"
  import { createServer } from "node:http"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/")
        .addSuccess(Schema.String)
        .setUrlParams(
          Schema.Struct({
            param: Schema.NonEmptyArray(Schema.String)
          })
        )
    )
  )

  const usersGroupLive = HttpApiBuilder.group(api, "group", (handlers) =>
    handlers.handle("get", (req) =>
      Effect.succeed(req.urlParams.param.join(", "))
    )
  )

  const MyApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(usersGroupLive))

  const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
    Layer.provide(MyApiLive),
    HttpServer.withLogAddress,
    Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
  )

  Layer.launch(HttpLive).pipe(NodeRuntime.runMain)
  ```

  Previously, if a query parameter was defined as a `NonEmptyArray` (an array that requires at least one element), providing a single value would cause a parsing error.

  For example, this worked fine:

  ```sh
  curl "http://localhost:3000/?param=1&param=2"
  ```

  But this would fail:

  ```sh
  curl "http://localhost:3000/?param=1"
  ```

  Resulting in an error because `"1"` was treated as a string instead of an array.

  With this update, single values are automatically wrapped in an array, so they match the expected schema without requiring manual fixes.

- Updated dependencies [[`4018eae`](https://github.com/Effect-TS/effect/commit/4018eaed2733241676ddb8c52416f463a8c32e35), [`543d36d`](https://github.com/Effect-TS/effect/commit/543d36d1a11452560b01ab966a82529ad5fee8c9), [`f70a65a`](https://github.com/Effect-TS/effect/commit/f70a65ac80c6635d80b12beaf4d32a9cc59fa143), [`ba409f6`](https://github.com/Effect-TS/effect/commit/ba409f69c41aeaa29e475c0630735726eaf4dbac), [`3d2e356`](https://github.com/Effect-TS/effect/commit/3d2e3565e8a43d1bdb5daee8db3b90f56d71d859)]:
  - effect@3.12.12

## 0.76.0

### Minor Changes

- [#4429](https://github.com/Effect-TS/effect/pull/4429) [`2473ad5`](https://github.com/Effect-TS/effect/commit/2473ad5cf23582e3a41338091fa526ffe611288d) Thanks @tim-smart! - run platform workers in a Scope, send errors or termination to a CloseLatch

### Patch Changes

- Updated dependencies [[`b6a032f`](https://github.com/Effect-TS/effect/commit/b6a032f07bffa020a848c813881879395134fa20), [`42ddd5f`](https://github.com/Effect-TS/effect/commit/42ddd5f144ce9f9d94a036679ebbd626446d37f5), [`2fe447c`](https://github.com/Effect-TS/effect/commit/2fe447c6354d334f9c591b8a8481818f5f0e797e)]:
  - effect@3.12.11

## 0.75.4

### Patch Changes

- [#4416](https://github.com/Effect-TS/effect/pull/4416) [`7d57ecd`](https://github.com/Effect-TS/effect/commit/7d57ecdaf5da2345ebbf9c22df50317578bde0f5) Thanks @tim-smart! - add HttpServerResponse.mergeCookies

- Updated dependencies [[`e30f132`](https://github.com/Effect-TS/effect/commit/e30f132c336c9d0760bad39f82a55c7ce5159eb7), [`33fa667`](https://github.com/Effect-TS/effect/commit/33fa667c2623be1026e1ccee91bd44f73b09020a), [`87f5f28`](https://github.com/Effect-TS/effect/commit/87f5f2842e4196cb88d13f10f443ff0567e82832), [`4dbd170`](https://github.com/Effect-TS/effect/commit/4dbd170538e8fb7a36aa7c469c6f93b6c7000091)]:
  - effect@3.12.10

## 0.75.3

### Patch Changes

- Updated dependencies [[`1b4a4e9`](https://github.com/Effect-TS/effect/commit/1b4a4e904ef5227ec7d9114d4e417eca19eed940)]:
  - effect@3.12.9

## 0.75.2

### Patch Changes

- [#4334](https://github.com/Effect-TS/effect/pull/4334) [`59b3cfb`](https://github.com/Effect-TS/effect/commit/59b3cfbbd5713dd9475998e95fad5534c0b21466) Thanks @gcanti! - Cookies: `unsafeMakeCookie` and `unsafeSetAll` now throw a more informative error instead of a generic one

- [#4360](https://github.com/Effect-TS/effect/pull/4360) [`bb05fb8`](https://github.com/Effect-TS/effect/commit/bb05fb83457355b1ca567228a9e041edfb6fd85d) Thanks @IMax153! - Ensure that nested configuration values can be properly loaded from an env file

- [#4353](https://github.com/Effect-TS/effect/pull/4353) [`8f6006a`](https://github.com/Effect-TS/effect/commit/8f6006a610fb6d6c7b8d14209a7323338a8964ff) Thanks @tim-smart! - fix HttpServerRequest.arrayBuffer for bun & web handlers

- [#4380](https://github.com/Effect-TS/effect/pull/4380) [`c45b559`](https://github.com/Effect-TS/effect/commit/c45b5592b5fd1189a5c932cfe05bd7d5f6d68508) Thanks @fubhy! - Fixed module imports

- [#4345](https://github.com/Effect-TS/effect/pull/4345) [`c9175ae`](https://github.com/Effect-TS/effect/commit/c9175aef41cb1e3b689d0ac0a4f53d8107376b58) Thanks @ethanniser! - Addition of `sync` property to `FileSystem.File` representing the `fsync` syscall.

- Updated dependencies [[`766113c`](https://github.com/Effect-TS/effect/commit/766113c0ea3512cdb887650ead8ba314236e22ee), [`712277f`](https://github.com/Effect-TS/effect/commit/712277f949052a24b46e4aa234063a6abf395c90), [`f269122`](https://github.com/Effect-TS/effect/commit/f269122508693b111142994dd48698ddc75f3d69), [`430c846`](https://github.com/Effect-TS/effect/commit/430c846cbac05b187e3d24ac8dfee0cf22506f7c), [`7b03057`](https://github.com/Effect-TS/effect/commit/7b03057507d2dab5e6793beb9c578dedaaeb15fe), [`a9c94c8`](https://github.com/Effect-TS/effect/commit/a9c94c807755610831211a686d2fad849ab38eb4), [`107e6f0`](https://github.com/Effect-TS/effect/commit/107e6f0557a1e2d3b0dce25d62fa1e2601521752), [`65c11b9`](https://github.com/Effect-TS/effect/commit/65c11b9266ec9447c31c26fe3ed35c73bd3b81fd), [`e386d2f`](https://github.com/Effect-TS/effect/commit/e386d2f1b3ab3ac2c14ee76de11f5963d32a3df4), [`9172efb`](https://github.com/Effect-TS/effect/commit/9172efba98bc6a82353e6ec2af61ac08f038ba64)]:
  - effect@3.12.8

## 0.75.1

### Patch Changes

- Updated dependencies [[`8dff1d1`](https://github.com/Effect-TS/effect/commit/8dff1d1bff76cdba643cad7f0bf864300f08bc61)]:
  - effect@3.12.7

## 0.75.0

### Minor Changes

- [#4306](https://github.com/Effect-TS/effect/pull/4306) [`5e43ce5`](https://github.com/Effect-TS/effect/commit/5e43ce50bae116865906112e7f88d390739d778b) Thanks @tim-smart! - eliminate Scope by default in some layer apis

### Patch Changes

- [#4304](https://github.com/Effect-TS/effect/pull/4304) [`76eb7d0`](https://github.com/Effect-TS/effect/commit/76eb7d0fbce3c009c8f77e84c178cb15bbed9709) Thanks @tim-smart! - ensure toWebHandler context argument is a Context before using it

  Fixes issues with next.js where they supply a different second argument to request handlers

- [#4286](https://github.com/Effect-TS/effect/pull/4286) [`eb264ed`](https://github.com/Effect-TS/effect/commit/eb264ed8a6e8c92a9dc7006f766c6ca2e5d29e03) Thanks @thewilkybarkid! - Fix following relative locations

- Updated dependencies [[`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`8b4e75d`](https://github.com/Effect-TS/effect/commit/8b4e75d35daea807c447ca760948a717aa66bb52), [`fc5e0f0`](https://github.com/Effect-TS/effect/commit/fc5e0f0d357a0051cfa01c1ede83ffdd3cb41ab1), [`004fd2b`](https://github.com/Effect-TS/effect/commit/004fd2bbd1459e64fb1b57f02eeb791ca5ea1ea5), [`b2a31be`](https://github.com/Effect-TS/effect/commit/b2a31be85c35d891351ce4f9a2cc93ece0c257f6), [`5514d05`](https://github.com/Effect-TS/effect/commit/5514d05b5cd586ff5868b8bd41c959e95e6c33cd), [`bf5f0ae`](https://github.com/Effect-TS/effect/commit/bf5f0ae9daa0170471678e22585e8ec14ce667bb), [`3b19bcf`](https://github.com/Effect-TS/effect/commit/3b19bcfd3aaadb6c9253428622df524537c8e626), [`b064b3b`](https://github.com/Effect-TS/effect/commit/b064b3b293615fd268cc5a5647d0981eb67750b8), [`289c13b`](https://github.com/Effect-TS/effect/commit/289c13b38e8e35b214d46d385d05dead176c87cd), [`f474678`](https://github.com/Effect-TS/effect/commit/f474678bf10b8f1c80e3dc096ddc7ecf20b2b23e), [`ee187d0`](https://github.com/Effect-TS/effect/commit/ee187d098007a402844c94d04f0cd8f07695377a)]:
  - effect@3.12.6

## 0.74.0

### Minor Changes

- [#4264](https://github.com/Effect-TS/effect/pull/4264) [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e) Thanks @gcanti! - Add support for symbols in the `Issue` definition within `platform/HttpApiError`.

### Patch Changes

- [#4277](https://github.com/Effect-TS/effect/pull/4277) [`8653072`](https://github.com/Effect-TS/effect/commit/86530720d7a03e118d2c5a8bf5a997cee7e7f3d6) Thanks @tim-smart! - simplify HttpApi path regex for parameters

  HttpApi path parameters now only support the following syntax:

  `:parameterName`

  Conditional parameters are no longer supported (i.e. using `?` etc after the
  parameter name).

- Updated dependencies [[`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`507d546`](https://github.com/Effect-TS/effect/commit/507d546bd49db31000425fb5da88c434e4291bea), [`a8b0ddb`](https://github.com/Effect-TS/effect/commit/a8b0ddb84710054799fc8f57485b95d00093ada1), [`8db239b`](https://github.com/Effect-TS/effect/commit/8db239b9c869a3707f6566b9d9dbdf53c4df03fc), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`84a0911`](https://github.com/Effect-TS/effect/commit/84a091181634c3a022c94234cec7764a3aeef1be), [`3179a9f`](https://github.com/Effect-TS/effect/commit/3179a9f65d23369a6a9a1f80f7750566dd28df22), [`6cb9b76`](https://github.com/Effect-TS/effect/commit/6cb9b766396d0b2ed995cf26957359713efd202e), [`1fcbe55`](https://github.com/Effect-TS/effect/commit/1fcbe55345042d8468f6a98c84081bd00b6bcf5a), [`d9a63d9`](https://github.com/Effect-TS/effect/commit/d9a63d9d385653865954cac895065360d54cc56b)]:
  - effect@3.12.5

## 0.73.1

### Patch Changes

- [#4250](https://github.com/Effect-TS/effect/pull/4250) [`c9e5e1b`](https://github.com/Effect-TS/effect/commit/c9e5e1be17c0c84d3d4e2abc3c60215cdb56bbbe) Thanks @thewilkybarkid! - Add isHttpMethod refinement

- [#4225](https://github.com/Effect-TS/effect/pull/4225) [`7b3d58d`](https://github.com/Effect-TS/effect/commit/7b3d58d7aec2152ec282460871d3e9de45ed254d) Thanks @thewilkybarkid! - Add HttpClient.tapError

- Updated dependencies [[`5b50ea4`](https://github.com/Effect-TS/effect/commit/5b50ea4a10cf9acd51f9624b2474d9d5ded74019), [`c170a68`](https://github.com/Effect-TS/effect/commit/c170a68b6266100774461fcd6c0e0fabb60112f2), [`a66c2eb`](https://github.com/Effect-TS/effect/commit/a66c2eb473245092cd41f04c2eb2b7b02cf53718)]:
  - effect@3.12.4

## 0.73.0

### Minor Changes

- [#4245](https://github.com/Effect-TS/effect/pull/4245) [`c110032`](https://github.com/Effect-TS/effect/commit/c110032322450a8824ba38ae24335a538cd2ce9a) Thanks @gcanti! - Update `HttpApi` to remove wildcard support for better OpenAPI compatibility.

  The `HttpApi*` modules previously reused the following type from `HttpRouter`:

  ```ts
  type PathInput = `/${string}` | "*"
  ```

  However, the `"*"` wildcard value was not handled correctly, as OpenAPI does not support wildcards.

  This has been updated to use a more specific type:

  ```ts
  type PathSegment = `/${string}`
  ```

  This change ensures better alignment with OpenAPI specifications and eliminates potential issues related to unsupported wildcard paths.

- [#4237](https://github.com/Effect-TS/effect/pull/4237) [`23ac740`](https://github.com/Effect-TS/effect/commit/23ac740c7dd4610b7d265c2071b88b0968419e9a) Thanks @gcanti! - Make `OpenApiSpec` mutable to make handling it more convenient.

### Patch Changes

- [#4177](https://github.com/Effect-TS/effect/pull/4177) [`8cd7319`](https://github.com/Effect-TS/effect/commit/8cd7319b6568bfc7a30ca16c104d189e37eac3a0) Thanks @KhraksMamtsov! - `Url` module has been introduced:
  - immutable setters with dual-function api
  - integration with `UrlParams`

- Updated dependencies [[`d7dac48`](https://github.com/Effect-TS/effect/commit/d7dac48a477cdfeec509dbe9f33fce6a1b02b63d), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5), [`1d7fd2b`](https://github.com/Effect-TS/effect/commit/1d7fd2b7ee8eeecc912d27adf76ed897db236dc5)]:
  - effect@3.12.3

## 0.72.2

### Patch Changes

- [#4226](https://github.com/Effect-TS/effect/pull/4226) [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a) Thanks @gcanti! - Ensure the encoding kind of success responses is respected in the OpenAPI spec.

  Before

  When generating an OpenAPI spec for a request with a success schema of type `HttpApiSchema.Text()``, the response content type was incorrectly set to "application/json" instead of "text/plain".

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpApiSchema,
    OpenApi
  } from "@effect/platform"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/").addSuccess(HttpApiSchema.Text())
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

  After

  ```diff
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpApiSchema,
    OpenApi
  } from "@effect/platform"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/").addSuccess(HttpApiSchema.Text())
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
  -            "application/json": {
  +            "text/plain": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

- [#4234](https://github.com/Effect-TS/effect/pull/4234) [`f852cb0`](https://github.com/Effect-TS/effect/commit/f852cb02040ea2f165e9b449615b8b1366add5d5) Thanks @gcanti! - Deduplicate errors in `OpenApi.fromApi`.

  When multiple identical errors were added to the same endpoint, group, or API, they were all included in the generated OpenAPI specification, leading to redundant entries in the `anyOf` array for error schemas.

  Identical errors are now deduplicated in the OpenAPI specification. This ensures that each error schema is included only once, simplifying the generated spec and improving readability.

  **Before**

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const err = Schema.String.annotations({ identifier: "err" })
  const api = HttpApi.make("api")
    .add(
      HttpApiGroup.make("group1")
        .add(
          HttpApiEndpoint.get("get1", "/1")
            .addSuccess(Schema.String)
            .addError(err)
            .addError(err)
        )
        .addError(err)
        .addError(err)
    )
    .addError(err)
    .addError(err)

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/1": {
      "get": {
        "tags": [
          "group1"
        ],
        "operationId": "group1.get1",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          },
          "500": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": "schema": {
                  "anyOf": [
                    {
                      "$ref": "#/components/schemas/err"
                    },
                    {
                      "$ref": "#/components/schemas/err"
                    },
                    {
                      "$ref": "#/components/schemas/err"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

  **After**

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const err = Schema.String.annotations({ identifier: "err" })
  const api = HttpApi.make("api")
    .add(
      HttpApiGroup.make("group1")
        .add(
          HttpApiEndpoint.get("get1", "/1")
            .addSuccess(Schema.String)
            .addError(err)
            .addError(err)
        )
        .addError(err)
        .addError(err)
    )
    .addError(err)
    .addError(err)

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/1": {
      "get": {
        "tags": [
          "group1"
        ],
        "operationId": "group1.get1",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          },
          "500": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/err"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

- [#4233](https://github.com/Effect-TS/effect/pull/4233) [`7276ae2`](https://github.com/Effect-TS/effect/commit/7276ae21062896adbb7508ac5b2dece95316322f) Thanks @gcanti! - Ensure the encoding kind of error responses is respected in the OpenAPI spec.

  Before

  When generating an OpenAPI spec for a request with an error schema of type `HttpApiSchema.Text()``, the response content type was incorrectly set to "application/json" instead of "text/plain".

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpApiSchema,
    OpenApi
  } from "@effect/platform"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/").addError(HttpApiSchema.Text())
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [],
        "security": [],
        "responses": {
          "204": {
            "description": "Success"
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          },
          "500": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

  After

  ```diff
  import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "@effect/platform"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/").addError(HttpApiSchema.Text())
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [],
        "security": [],
        "responses": {
          "204": {
            "description": "Success"
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          },
          "500": {
            "description": "a string",
            "content": {
  +            "text/plain": {
  -            "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

- [#4226](https://github.com/Effect-TS/effect/pull/4226) [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a) Thanks @gcanti! - Add missing `deprecated` key to `OpenApi.annotations` API.

- [#4226](https://github.com/Effect-TS/effect/pull/4226) [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a) Thanks @gcanti! - Fix: Prevent request body from being added to the OpenAPI spec for GET methods in `OpenApi.fromApi`.

  When creating a `GET` endpoint with a request payload, the `requestBody` was incorrectly added to the OpenAPI specification, which is invalid for `GET` methods.

  Before

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/")
        .addSuccess(Schema.String)
        .setPayload(
          Schema.Struct({
            a: Schema.String
          })
        )
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [
          {
            "name": "a",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "required": true
          }
        ],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        },
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "a"
                ],
                "properties": {
                  "a": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            }
          },
          "required": true
        }
      }
    }
  }
  */
  ```

  After

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.get("get", "/")
        .addSuccess(Schema.String)
        .setPayload(
          Schema.Struct({
            a: Schema.String
          })
        )
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "get": {
        "tags": [
          "group"
        ],
        "operationId": "group.get",
        "parameters": [
          {
            "name": "a",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "required": true
          }
        ],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        }
      }
    }
  }
  */
  ```

- [#4226](https://github.com/Effect-TS/effect/pull/4226) [`212e784`](https://github.com/Effect-TS/effect/commit/212e78475f527147ec27c090bd13f789f55add7a) Thanks @gcanti! - Add `"application/x-www-form-urlencoded"` to `OpenApiSpecContentType` type as it is generated by the system when using `HttpApiSchema.withEncoding({ kind: "UrlParams" })`

  **Example**

  ```ts
  import {
    HttpApi,
    HttpApiEndpoint,
    HttpApiGroup,
    HttpApiSchema,
    OpenApi
  } from "@effect/platform"
  import { Schema } from "effect"

  const api = HttpApi.make("api").add(
    HttpApiGroup.make("group").add(
      HttpApiEndpoint.post("post", "/")
        .addSuccess(Schema.String)
        .setPayload(
          Schema.Struct({ foo: Schema.String }).pipe(
            HttpApiSchema.withEncoding({ kind: "UrlParams" })
          )
        )
    )
  )

  const spec = OpenApi.fromApi(api)

  console.log(JSON.stringify(spec.paths, null, 2))
  /*
  Output:
  {
    "/": {
      "post": {
        "tags": [
          "group"
        ],
        "operationId": "group.post",
        "parameters": [],
        "security": [],
        "responses": {
          "200": {
            "description": "a string",
            "content": {
              "application/json": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "The request did not match the expected schema",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HttpApiDecodeError"
                }
              }
            }
          }
        },
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "type": "object",
                "required": [
                  "foo"
                ],
                "properties": {
                  "foo": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            }
          },
          "required": true
        }
      }
    }
  }
  */
  ```

- Updated dependencies [[`734af82`](https://github.com/Effect-TS/effect/commit/734af82138e78b9c57a8355b1c6b80e80d38b222), [`b63c780`](https://github.com/Effect-TS/effect/commit/b63c78010893101520448ddda7019c487cf7eedd), [`c640d77`](https://github.com/Effect-TS/effect/commit/c640d77b33ad417876f4e8ffe8574ee6cbe5607f), [`0def088`](https://github.com/Effect-TS/effect/commit/0def0887cfdb6755729a64dfd52b3b9f46b0576c)]:
  - effect@3.12.2

## 0.72.1

### Patch Changes

- Updated dependencies [[`302b57d`](https://github.com/Effect-TS/effect/commit/302b57d2cbf9b9ccc17450945aeebfb33cfe8d43), [`0988083`](https://github.com/Effect-TS/effect/commit/0988083d4594938590df5a287e5b27d38526dd07), [`8b46be6`](https://github.com/Effect-TS/effect/commit/8b46be6a3b8160362ab5ea9171c5e6932505125c), [`bfe8027`](https://github.com/Effect-TS/effect/commit/bfe802734b450a4b4ee069d1125dd37995db2bff), [`16dd657`](https://github.com/Effect-TS/effect/commit/16dd657033d8afac2ffea567b3c8bb27c9b249b6), [`39db211`](https://github.com/Effect-TS/effect/commit/39db211414e90c8db8fdad7dc8ce5b4661bcfaef)]:
  - effect@3.12.1

## 0.72.0

### Minor Changes

- [#4068](https://github.com/Effect-TS/effect/pull/4068) [`ef64c6f`](https://github.com/Effect-TS/effect/commit/ef64c6fec0d47da573c04230dde9ea729366d871) Thanks @tim-smart! - remove generics from HttpClient tag service

  Instead you can now use `HttpClient.With<E, R>` to specify the error and
  requirement types.

### Patch Changes

- Updated dependencies [[`abb22a4`](https://github.com/Effect-TS/effect/commit/abb22a429b9c52c31e84856294f175d2064a9b4d), [`f369a89`](https://github.com/Effect-TS/effect/commit/f369a89e98bc682969803b9304adaf4557bb36c2), [`642376c`](https://github.com/Effect-TS/effect/commit/642376c63fd7d78754db991631a4d50a5dc79aa3), [`3d2b7a7`](https://github.com/Effect-TS/effect/commit/3d2b7a7e942a7157afae5b1cdbc6f3fef116428e), [`73f9c6f`](https://github.com/Effect-TS/effect/commit/73f9c6f2ff091512cf904cc54ab59965b86e87c8), [`17cb451`](https://github.com/Effect-TS/effect/commit/17cb4514590e8a86263f7aed009f24da8a237342), [`d801820`](https://github.com/Effect-TS/effect/commit/d80182060c2ee945d7e0e4728812abf9465a0d6a), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1), [`c11f3a6`](https://github.com/Effect-TS/effect/commit/c11f3a60a05c3b5fc8e7ce90136728154dc505b0), [`618f7e0`](https://github.com/Effect-TS/effect/commit/618f7e092a1011e5090dca1e69b5e9285689654b), [`c0ba834`](https://github.com/Effect-TS/effect/commit/c0ba834d1995cf5a8b250e4780fd43f3e3881151), [`e1eeb2d`](https://github.com/Effect-TS/effect/commit/e1eeb2d7064b3870041dab142f3057970699bbf1)]:
  - effect@3.12.0

## 0.71.7

### Patch Changes

- Updated dependencies [[`39457d4`](https://github.com/Effect-TS/effect/commit/39457d4897d9bc7df8af5c05d352866bbeae82eb), [`a475cc2`](https://github.com/Effect-TS/effect/commit/a475cc25fd7c9f26b27a8e98f8fbe43cc9e6ee3e), [`199214e`](https://github.com/Effect-TS/effect/commit/199214e21c616d8a0ccd7ed5f92e944e6c580193), [`b3c160d`](https://github.com/Effect-TS/effect/commit/b3c160d7a1fdfc2d3fb2440530f1ab80efc65133)]:
  - effect@3.11.10

## 0.71.6

### Patch Changes

- Updated dependencies [[`1c08a0b`](https://github.com/Effect-TS/effect/commit/1c08a0b8505badcffb4d9cade5a746ea90c9557e), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd), [`1ce703b`](https://github.com/Effect-TS/effect/commit/1ce703b041bbd7560c5c437c9b9be48f027937fd)]:
  - effect@3.11.9

## 0.71.5

### Patch Changes

- [#4154](https://github.com/Effect-TS/effect/pull/4154) [`05d71f8`](https://github.com/Effect-TS/effect/commit/05d71f85622305705d8316817694a09762e60865) Thanks @thewilkybarkid! - Support URL objects in HttpServerResponse.redirect

- [#4157](https://github.com/Effect-TS/effect/pull/4157) [`e66b920`](https://github.com/Effect-TS/effect/commit/e66b9205f25ab425d30640886eb3fb2c4715bc26) Thanks @tim-smart! - ensure WebSocket's are always closed with an explicit code

## 0.71.4

### Patch Changes

- [#4152](https://github.com/Effect-TS/effect/pull/4152) [`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f) Thanks @tim-smart! - accept Headers.Input in HttpServerResponse constructors

- [#4152](https://github.com/Effect-TS/effect/pull/4152) [`909181a`](https://github.com/Effect-TS/effect/commit/909181a9ce9052a80432ccf52187e0723004bf7f) Thanks @tim-smart! - add HttpServerResponse.redirect api

- Updated dependencies [[`1a6b52d`](https://github.com/Effect-TS/effect/commit/1a6b52dcf020d36e38a7bc90b648152cf5a8ccba)]:
  - effect@3.11.8

## 0.71.3

### Patch Changes

- [#4147](https://github.com/Effect-TS/effect/pull/4147) [`6984508`](https://github.com/Effect-TS/effect/commit/6984508c87f1bd91213b44c19b25ab5e2dcc1ce0) Thanks @tim-smart! - ensure HttpApi union schemas don't transfer non-api related annotations

- [#4145](https://github.com/Effect-TS/effect/pull/4145) [`883639c`](https://github.com/Effect-TS/effect/commit/883639cc8ce47757f1cd39439391a8028c0812fe) Thanks @tim-smart! - ensure HttpApi preserves referential equality of error schemas

## 0.71.2

### Patch Changes

- [#4138](https://github.com/Effect-TS/effect/pull/4138) [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e) Thanks @gcanti! - JSONSchema: handle the `nullable` keyword for OpenAPI target, closes #4075.

  Before

  ```ts
  import { OpenApiJsonSchema } from "@effect/platform"
  import { Schema } from "effect"

  const schema = Schema.NullOr(Schema.String)

  console.log(JSON.stringify(OpenApiJsonSchema.make(schema), null, 2))
  /*
  {
    "anyOf": [
      {
        "type": "string"
      },
      {
        "enum": [
          null
        ]
      }
    ]
  }
  */
  ```

  After

  ```ts
  import { OpenApiJsonSchema } from "@effect/platform"
  import { Schema } from "effect"

  const schema = Schema.NullOr(Schema.String)

  console.log(JSON.stringify(OpenApiJsonSchema.make(schema), null, 2))
  /*
  {
    "type": "string",
    "nullable": true
  }
  */
  ```

- [#4128](https://github.com/Effect-TS/effect/pull/4128) [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36) Thanks @gcanti! - JSONSchema: add `type` for homogeneous enum schemas, closes #4127

  Before

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.Literal("a", "b")

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "enum": [
      "a",
      "b"
    ]
  }
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.Literal("a", "b")

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "string",
    "enum": [
      "a",
      "b"
    ]
  }
  */
  ```

- [#4138](https://github.com/Effect-TS/effect/pull/4138) [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e) Thanks @gcanti! - JSONSchema: use `{ "type": "null" }` to represent the `null` literal

  Before

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.NullOr(Schema.String)

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "anyOf": [
      {
        "type": "string"
      },
      {
        "enum": [
          null
        ]
      }
    ]
  }
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.NullOr(Schema.String)

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "anyOf": [
      {
        "type": "string"
      },
      {
        "type": "null"
      }
    ]
  }
  */
  ```

- Updated dependencies [[`2408616`](https://github.com/Effect-TS/effect/commit/24086163b60b09cc6d0885bd565ef080dcbe866b), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`8d978c5`](https://github.com/Effect-TS/effect/commit/8d978c53f6fcc98d9d645ecba3e4b55d4297dd36), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e), [`cec0b4d`](https://github.com/Effect-TS/effect/commit/cec0b4d152ef660be2ccdb0927255f2471436e6e)]:
  - effect@3.11.7

## 0.71.1

### Patch Changes

- [#4132](https://github.com/Effect-TS/effect/pull/4132) [`1d3df5b`](https://github.com/Effect-TS/effect/commit/1d3df5bc4324e88a392c348db35fd9d029c7b25e) Thanks @tim-smart! - allow passing Context to HttpApp web handlers

  This allows you to pass request-scoped data to your handlers.

  ```ts
  import { Context, Effect } from "effect"
  import { HttpApp, HttpServerResponse } from "@effect/platform"

  class Env extends Context.Reference<Env>()("Env", {
    defaultValue: () => ({ foo: "bar" })
  }) {}

  const handler = HttpApp.toWebHandler(
    Effect.gen(function* () {
      const env = yield* Env
      return yield* HttpServerResponse.json(env)
    })
  )

  const response = await handler(
    new Request("http://localhost:3000/"),
    Env.context({ foo: "baz" })
  )

  assert.deepStrictEqual(await response.json(), {
    foo: "baz"
  })
  ```

## 0.71.0

### Minor Changes

- [#4129](https://github.com/Effect-TS/effect/pull/4129) [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78) Thanks @tim-smart! - replace HttpApi.empty with HttpApi.make(identifier)

  This ensures if you have multiple HttpApi instances, the HttpApiGroup's are
  implemented correctly.

  ```ts
  import { HttpApi } from "@effect/platform"

  // Before
  class Api extends HttpApi.empty.add(...) {}

  // After
  class Api extends HttpApi.make("api").add(...) {}
  ```

### Patch Changes

- [#4130](https://github.com/Effect-TS/effect/pull/4130) [`11fc401`](https://github.com/Effect-TS/effect/commit/11fc401f436f99bf4be95f56d50b0e4bdfe5edea) Thanks @tim-smart! - add predefined empty errors to HttpApiError

- [#4129](https://github.com/Effect-TS/effect/pull/4129) [`c99a0f3`](https://github.com/Effect-TS/effect/commit/c99a0f376d049d3793ed33e146d9873b8a5e5b78) Thanks @tim-smart! - add OpenApi annotation for exluding parts of the api from the spec

- Updated dependencies [[`662d1ce`](https://github.com/Effect-TS/effect/commit/662d1ce6fb7da384a95888d5b2bb5605bdf3208d), [`31c62d8`](https://github.com/Effect-TS/effect/commit/31c62d83cbdcf9850a8b5331faa239601c60f78a)]:
  - effect@3.11.6

## 0.70.7

### Patch Changes

- [#4111](https://github.com/Effect-TS/effect/pull/4111) [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911) Thanks @gcanti! - JSONSchema: merge refinement fragments instead of just overwriting them.

  Before

  ```ts
  import { JSONSchema, Schema } from "effect"

  export const schema = Schema.String.pipe(
    Schema.startsWith("a"), // <= overwritten!
    Schema.endsWith("c")
  )

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "string",
    "description": "a string ending with \"c\"",
    "pattern": "^.*c$" // <= overwritten!
  }
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "effect"

  export const schema = Schema.String.pipe(
    Schema.startsWith("a"), // <= preserved!
    Schema.endsWith("c")
  )

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "type": "string",
    "description": "a string ending with \"c\"",
    "pattern": "^.*c$",
    "allOf": [
      {
        "pattern": "^a" // <= preserved!
      }
    ],
    "$schema": "http://json-schema.org/draft-07/schema#"
  }
  */
  ```

- [#4019](https://github.com/Effect-TS/effect/pull/4019) [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8) Thanks @gcanti! - OpenApiJsonSchema: Use the experimental `JSONSchema.fromAST` API for implementation.

- Updated dependencies [[`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`22905cf`](https://github.com/Effect-TS/effect/commit/22905cf5addfb1ff3d2a6135c52036be958ae911), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`1e59e4f`](https://github.com/Effect-TS/effect/commit/1e59e4fd778da18296812a2a32f36ca8ae50f60d), [`8d914e5`](https://github.com/Effect-TS/effect/commit/8d914e504e7a22d0ea628e8af265ee450ff9530f), [`03bb00f`](https://github.com/Effect-TS/effect/commit/03bb00faa74f9e168a54a8cc0828a664fbb1ab05), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`14e1149`](https://github.com/Effect-TS/effect/commit/14e1149f1af5a022f06eb8c2e4ba9fec17fe7426), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8), [`9f5a6f7`](https://github.com/Effect-TS/effect/commit/9f5a6f701bf7ba31adccd1f1bcfa8ab5614c9be8)]:
  - effect@3.11.5

## 0.70.6

### Patch Changes

- [#4097](https://github.com/Effect-TS/effect/pull/4097) [`9a5b8e3`](https://github.com/Effect-TS/effect/commit/9a5b8e36d184bd4967a88752cb6e755e1be263af) Thanks @tim-smart! - handle WebSocket's that emit ArrayBuffer instead of Uint8Array

## 0.70.5

### Patch Changes

- [#4091](https://github.com/Effect-TS/effect/pull/4091) [`415f4c9`](https://github.com/Effect-TS/effect/commit/415f4c98321868531727a83cbaad70164f5e4c40) Thanks @ryskajakub! - http api param inherits description from schema

- [#4087](https://github.com/Effect-TS/effect/pull/4087) [`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2) Thanks @tim-smart! - remove Socket write indirection

- Updated dependencies [[`518b258`](https://github.com/Effect-TS/effect/commit/518b258a8a67ecd332a9252c35cc060f8368dee2), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f), [`6e323a3`](https://github.com/Effect-TS/effect/commit/6e323a36faaee46b328c8e3cf60a76b3aff9907f)]:
  - effect@3.11.4

## 0.70.4

### Patch Changes

- Updated dependencies [[`90906f7`](https://github.com/Effect-TS/effect/commit/90906f7f154b12c7182e8f39e3c55ef3937db857), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`3862cd3`](https://github.com/Effect-TS/effect/commit/3862cd3c7f6a542ed65fb81255b3bd696ce2f567), [`343b6aa`](https://github.com/Effect-TS/effect/commit/343b6aa6ac4a74276bfc7c63ccbf4a1d72bc1bed), [`afba339`](https://github.com/Effect-TS/effect/commit/afba339adc11dad56b5a3b7ca94487e58f34d613)]:
  - effect@3.11.3

## 0.70.3

### Patch Changes

- [#4065](https://github.com/Effect-TS/effect/pull/4065) [`7044730`](https://github.com/Effect-TS/effect/commit/70447306be1aeeb7d87c230b2a96ec87b993ede9) Thanks @KhraksMamtsov! - Ensure the uniqueness of the parameters at the type level

  ```ts
  import { HttpApiEndpoint, HttpApiSchema } from "@effect/platform"
  import { Schema } from "effect"

  HttpApiEndpoint.get(
    "test"
  )`/${HttpApiSchema.param("id", Schema.NumberFromString)}/${
    // @ts-expect-error: Argument of type 'Param<"id", typeof NumberFromString>' is not assignable to parameter of type '"Duplicate param :id"'
    HttpApiSchema.param("id", Schema.NumberFromString)
  }`
  ```

## 0.70.2

### Patch Changes

- [#4064](https://github.com/Effect-TS/effect/pull/4064) [`c2249ea`](https://github.com/Effect-TS/effect/commit/c2249ea13fd98ab7d9aa628787931356d8ec2860) Thanks @tim-smart! - HttpApi OpenApi adjustments
  - Allow using transform annotation on endpoints & groups
  - Preserve descriptions for "empty" schemas

- [#4055](https://github.com/Effect-TS/effect/pull/4055) [`1358aa5`](https://github.com/Effect-TS/effect/commit/1358aa5326eaa85ef13ee8d1fed0b4a4288ed3eb) Thanks @thewilkybarkid! - Allow creating a route for all methods

- [#4062](https://github.com/Effect-TS/effect/pull/4062) [`1de3fe7`](https://github.com/Effect-TS/effect/commit/1de3fe7d1cbafd6391eaa38c2300b99e332cc2aa) Thanks @tim-smart! - simplify HttpApiClient param regex

- Updated dependencies [[`01cee56`](https://github.com/Effect-TS/effect/commit/01cee560b58d94b24cc20e98083251b73e658b41)]:
  - effect@3.11.2

## 0.70.1

### Patch Changes

- Updated dependencies [[`dd8a2d8`](https://github.com/Effect-TS/effect/commit/dd8a2d8e80d33b16719fc69361eaedf0b59d4620), [`a71bfef`](https://github.com/Effect-TS/effect/commit/a71bfef46f5061bb2502a61a333638a987b62273)]:
  - effect@3.11.1

## 0.70.0

### Minor Changes

- [#3835](https://github.com/Effect-TS/effect/pull/3835) [`672bde5`](https://github.com/Effect-TS/effect/commit/672bde5bec51c7d6f9862828e6a654cb2cb6f93d) Thanks @tim-smart! - support array of values in /platform url param schemas

### Patch Changes

- [#3835](https://github.com/Effect-TS/effect/pull/3835) [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92) Thanks @tim-smart! - fix multipart support for bun http server

- [#3835](https://github.com/Effect-TS/effect/pull/3835) [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e) Thanks @SandroMaglione! - New methods `extractAll` and `extractSchema` to `UrlParams` (added `Schema.BooleanFromString`).

- [#3835](https://github.com/Effect-TS/effect/pull/3835) [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd) Thanks @KhraksMamtsov! - - JSONSchema module
  - add `format?: string` optional field to `JsonSchema7String` interface
  - Schema module
    - add custom json schema annotation to `UUID` schema including `format: "uuid"`
  - OpenApiJsonSchema module
    - add `format?: string` optional field to `String` and ` Numeric` interfaces
- Updated dependencies [[`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`6e69493`](https://github.com/Effect-TS/effect/commit/6e694930048bbaf98110f35f41566aeb9752d471), [`147434b`](https://github.com/Effect-TS/effect/commit/147434b03d5e1fd692dd9f126e5ab0910f3b76d3), [`5eff3f6`](https://github.com/Effect-TS/effect/commit/5eff3f6fa3aae7e86948a62cbfd63b8d6c3bdf92), [`d9fe79b`](https://github.com/Effect-TS/effect/commit/d9fe79bb5a3fe105d8e7a3bc2922a8ad936a5d10), [`251d189`](https://github.com/Effect-TS/effect/commit/251d189420bbba71990574e91098c499065f9a9b), [`5a259f3`](https://github.com/Effect-TS/effect/commit/5a259f3711b4369f55d885b568bdb21136155261), [`b4ce4ea`](https://github.com/Effect-TS/effect/commit/b4ce4ea7fd514a7e572f2dcd879c98f334981b0e), [`15fcc5a`](https://github.com/Effect-TS/effect/commit/15fcc5a0ea4bbf40ab48fa6a04fdda74f76f4c07), [`9bc9a47`](https://github.com/Effect-TS/effect/commit/9bc9a476800dc645903c888a68bb1d3baa3383c6), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb), [`1e2747c`](https://github.com/Effect-TS/effect/commit/1e2747c63a4820d1459cbbc88c71212983bd68bd), [`9264162`](https://github.com/Effect-TS/effect/commit/9264162a82783a651776fb7b87604564a63e7070), [`e0b9b09`](https://github.com/Effect-TS/effect/commit/e0b9b09e70c386b2da17d1f0a15b0511861c89e8), [`c36f3b9`](https://github.com/Effect-TS/effect/commit/c36f3b95df5ce9d71b66f22f26ce12eda8d3e848), [`aadb8a4`](https://github.com/Effect-TS/effect/commit/aadb8a48d2cba197c06ec9996505510e48e4e5cb)]:
  - effect@3.11.0

## 0.69.32

### Patch Changes

- Updated dependencies [[`3069614`](https://github.com/Effect-TS/effect/commit/30696149271129fc618f6f2ccd1d8f2f6c0f9cd7), [`09a5e52`](https://github.com/Effect-TS/effect/commit/09a5e522fd9b221f05d85b1d1c8a740d4973c302)]:
  - effect@3.10.20

## 0.69.31

### Patch Changes

- [#4035](https://github.com/Effect-TS/effect/pull/4035) [`e6d4a37`](https://github.com/Effect-TS/effect/commit/e6d4a37c1d7e657b5ea44063a1cf586808228fe5) Thanks @tim-smart! - add template literal api for defining HttpApiEndpoint path schema

## 0.69.30

### Patch Changes

- [#4025](https://github.com/Effect-TS/effect/pull/4025) [`270f199`](https://github.com/Effect-TS/effect/commit/270f199b31810fd643e4c22818698adcbdb5d396) Thanks @tim-smart! - update OpenApi version to 3.1.0

## 0.69.29

### Patch Changes

- [#4024](https://github.com/Effect-TS/effect/pull/4024) [`24cc35e`](https://github.com/Effect-TS/effect/commit/24cc35e26d6ed4a076470bc687ffd99cc50991b3) Thanks @tim-smart! - improve HttpApi handling of payload encoding types

## 0.69.28

### Patch Changes

- [#4017](https://github.com/Effect-TS/effect/pull/4017) [`edd72be`](https://github.com/Effect-TS/effect/commit/edd72be57b904d60c9cbffc2537901821a9da537) Thanks @tim-smart! - try encode defects that match an Error schema in HttpApi

- [#4014](https://github.com/Effect-TS/effect/pull/4014) [`a3e2771`](https://github.com/Effect-TS/effect/commit/a3e277170a1f7cf61fd629acb60304c7e81d9498) Thanks @tim-smart! - consider TimeoutException a transient error in HttpClient.retryTransient

- [#4007](https://github.com/Effect-TS/effect/pull/4007) [`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1) Thanks @gcanti! - Wrap JSDoc @example tags with a TypeScript fence, closes #4002

- [#4016](https://github.com/Effect-TS/effect/pull/4016) [`a9e00e4`](https://github.com/Effect-TS/effect/commit/a9e00e43f0b5dd22c1f9d5b78be6383daea09c20) Thanks @tim-smart! - allow using HttpApiSchema.Multipart in a union

- Updated dependencies [[`944025b`](https://github.com/Effect-TS/effect/commit/944025bc5ce139f4a85846aa689bf30ec06a8ec1), [`54addee`](https://github.com/Effect-TS/effect/commit/54addee438a644bf010646c52042c7b89c5fc0a7)]:
  - effect@3.10.19

## 0.69.27

### Patch Changes

- [#4005](https://github.com/Effect-TS/effect/pull/4005) [`beaccae`](https://github.com/Effect-TS/effect/commit/beaccae2d15931e9fe475fb50a0b3638243fe3f7) Thanks @tim-smart! - fix HttpApiBuilder.middleware when used multiple times

- Updated dependencies [[`af409cf`](https://github.com/Effect-TS/effect/commit/af409cf1d2ff973be11cc079ea373eaeedca25de)]:
  - effect@3.10.18

## 0.69.26

### Patch Changes

- [#3977](https://github.com/Effect-TS/effect/pull/3977) [`c963886`](https://github.com/Effect-TS/effect/commit/c963886d5817986fcbd6bfa4ddf50aca8b6c8184) Thanks @KhraksMamtsov! - `HttpApiClient.group` & `HttpApiClient.endpoint` have been added
  This makes it possible to create `HttpApiClient` for some part of the `HttpApi`
  This eliminates the need to provide all the dependencies for the entire `HttpApi` - but only those necessary for its specific part to work
- Updated dependencies [[`42c4ce6`](https://github.com/Effect-TS/effect/commit/42c4ce6f8d8c7d847e97757650a8ad9419a829d7)]:
  - effect@3.10.17

## 0.69.25

### Patch Changes

- [#3968](https://github.com/Effect-TS/effect/pull/3968) [`320557a`](https://github.com/Effect-TS/effect/commit/320557ab18d13c5e22fc7dc0d2a157eae461012f) Thanks @KhraksMamtsov! - `OpenApi.Transform` annotation has been added

  This customization point allows you to transform the generated specification in an arbitrary way

  ```ts
  class Api extends HttpApi.empty
    .annotateContext(OpenApi.annotations({
      title: "API",
      summary: "test api summary",
      transform: (openApiSpec) => ({
        ...openApiSpec,
        tags: [...openApiSpec.tags ?? [], {
          name: "Tag from OpenApi.Transform annotation"
        }]
      })
    }))
  ```

- [#3962](https://github.com/Effect-TS/effect/pull/3962) [`7b93dd6`](https://github.com/Effect-TS/effect/commit/7b93dd622e2ab79c7072d79d0d9611e446202201) Thanks @KhraksMamtsov! - fix HttpApiGroup.addError signature

- Updated dependencies [[`4dca30c`](https://github.com/Effect-TS/effect/commit/4dca30cfcdafe4542e236489f71d6f171a5b4e38), [`1d99867`](https://github.com/Effect-TS/effect/commit/1d998671be3cd11043f232822e91dd8c98fccfa9), [`6dae414`](https://github.com/Effect-TS/effect/commit/6dae4147991a97ec14a99289bd25fadae7541e8d), [`6b0d737`](https://github.com/Effect-TS/effect/commit/6b0d737078bf63b97891e6bc47affc04b28f9cf7), [`d8356aa`](https://github.com/Effect-TS/effect/commit/d8356aad428a0c2290db52380220f81d9ec94232)]:
  - effect@3.10.16

## 0.69.24

### Patch Changes

- [#3939](https://github.com/Effect-TS/effect/pull/3939) [`3cc6514`](https://github.com/Effect-TS/effect/commit/3cc6514d2dd64e010cb760cc29bfce98c349bb10) Thanks @KhraksMamtsov! - Added the ability to annotate the `HttpApi` with additional schemas
  Which will be taken into account when generating `components.schemas` section of `OpenApi` schema

  ```ts
  import { Schema } from "effect"
  import { HttpApi } from "@effect/platform"

  HttpApi.empty.annotate(HttpApi.AdditionalSchemas, [
    Schema.Struct({
      contentType: Schema.String,
      length: Schema.Int
    }).annotations({
      identifier: "ComponentsSchema"
    })
  ])
  /**
   {
    "openapi": "3.0.3",
    ...
    "components": {
      "schemas": {
        "ComponentsSchema": {...},
        ...
    },
    ...
    }
   */
  ```

## 0.69.23

### Patch Changes

- [#3944](https://github.com/Effect-TS/effect/pull/3944) [`3aff4d3`](https://github.com/Effect-TS/effect/commit/3aff4d38837c213bb2987973dc4b98febb9f92d2) Thanks @KhraksMamtsov! - `OpenApi.Summary` & `OpenApi.Deprecated` annotations have been added

## 0.69.22

### Patch Changes

- Updated dependencies [[`8398b32`](https://github.com/Effect-TS/effect/commit/8398b3208242a88239d4449910b7baf923cfe3b6), [`72e55b7`](https://github.com/Effect-TS/effect/commit/72e55b7c610784fcebdbadc592c876e23e76a986)]:
  - effect@3.10.15

## 0.69.21

### Patch Changes

- Updated dependencies [[`f983946`](https://github.com/Effect-TS/effect/commit/f9839467b4cad6e788297764ef9f9f0b9fd203f9), [`2d8a750`](https://github.com/Effect-TS/effect/commit/2d8a75081eb83a0a81f817fdf6f428369c5064ab)]:
  - effect@3.10.14

## 0.69.20

### Patch Changes

- Updated dependencies [[`995bbdf`](https://github.com/Effect-TS/effect/commit/995bbdffea2e332f203cd5b474cd6a1c77dfa6ae)]:
  - effect@3.10.13

## 0.69.19

### Patch Changes

- [#3908](https://github.com/Effect-TS/effect/pull/3908) [`eb8c52d`](https://github.com/Effect-TS/effect/commit/eb8c52d8b4c5e067ebf0a81eb742f5822e6439b5) Thanks @tim-smart! - use plain js data structures for HttpApi properties

## 0.69.18

### Patch Changes

- [#3906](https://github.com/Effect-TS/effect/pull/3906) [`a0584ec`](https://github.com/Effect-TS/effect/commit/a0584ece92ed784bfb139e9c5a699f02d1e71c2d) Thanks @tim-smart! - ensure Socket send queue is not ended

- [#3904](https://github.com/Effect-TS/effect/pull/3904) [`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6) Thanks @tim-smart! - improve platform/Worker shutdown and logging

- Updated dependencies [[`dd14efe`](https://github.com/Effect-TS/effect/commit/dd14efe0ace255f571273aae876adea96267d7e6)]:
  - effect@3.10.12

## 0.69.17

### Patch Changes

- [#3898](https://github.com/Effect-TS/effect/pull/3898) [`8240b1c`](https://github.com/Effect-TS/effect/commit/8240b1c10d45312fc863cb679b1a1e8441af0c1a) Thanks @mattphillips! - Fixed handling of basic auth header values

- [#3903](https://github.com/Effect-TS/effect/pull/3903) [`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a) Thanks @tim-smart! - add HttpApi.addHttpApi method, for merging two HttpApi instances

- Updated dependencies [[`5eef499`](https://github.com/Effect-TS/effect/commit/5eef4998b6ccb7a5404d9e4fef85e57fa35fbb8a)]:
  - effect@3.10.11

## 0.69.16

### Patch Changes

- [#3893](https://github.com/Effect-TS/effect/pull/3893) [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28) Thanks @tim-smart! - refactor Socket internal code

- [#3892](https://github.com/Effect-TS/effect/pull/3892) [`7d89650`](https://github.com/Effect-TS/effect/commit/7d8965036cd2ea435c8441ffec3345488baebf85) Thanks @tim-smart! - simplify HttpApiClient implementation

- Updated dependencies [[`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`cd720ae`](https://github.com/Effect-TS/effect/commit/cd720aedf7f2571edec0843d6a633e84e4832b28), [`b631f40`](https://github.com/Effect-TS/effect/commit/b631f40abbe649b2a089764585b5c39f6a695ac6)]:
  - effect@3.10.10

## 0.69.15

### Patch Changes

- [#3885](https://github.com/Effect-TS/effect/pull/3885) [`8a30e1d`](https://github.com/Effect-TS/effect/commit/8a30e1dfa3a7103bf5414fc6a7fca3088d8c8c00) Thanks @tim-smart! - simplify HttpApiBuilder handler logic

## 0.69.14

### Patch Changes

- [#3884](https://github.com/Effect-TS/effect/pull/3884) [`07c493a`](https://github.com/Effect-TS/effect/commit/07c493a598e096c7810cd06def8cfa43493c46b1) Thanks @tim-smart! - add withResponse option to HttpApiClient methods

- [#3882](https://github.com/Effect-TS/effect/pull/3882) [`257ab1b`](https://github.com/Effect-TS/effect/commit/257ab1b539fa6e930b7ae2583a188376372200d7) Thanks @tim-smart! - simplify Socket internal code

- Updated dependencies [[`a123e80`](https://github.com/Effect-TS/effect/commit/a123e80f111a625428a5b5622b7f55ee1073566b), [`bd5fcd3`](https://github.com/Effect-TS/effect/commit/bd5fcd3e6b603b1e505af90d6a00627c8eca6d41), [`0289d3b`](https://github.com/Effect-TS/effect/commit/0289d3b6391031d00329365bab9791b355031fe3), [`7386b71`](https://github.com/Effect-TS/effect/commit/7386b710e5be570e17f468928a6ed19d549a3e12), [`4211a23`](https://github.com/Effect-TS/effect/commit/4211a2355bb3af3f0e756e2aae9d293379f25662)]:
  - effect@3.10.9

## 0.69.13

### Patch Changes

- Updated dependencies [[`68b5c9e`](https://github.com/Effect-TS/effect/commit/68b5c9e44f34192cef26e1cadda5e661a027df41), [`9c9928d`](https://github.com/Effect-TS/effect/commit/9c9928dfeacd9ac33dc37eb0ca3d7d8c39175ada), [`6306e66`](https://github.com/Effect-TS/effect/commit/6306e6656092b350d4ede5746da6f245ec9f7e07), [`361c7f3`](https://github.com/Effect-TS/effect/commit/361c7f39a2c10ede9324847c3d3ba192a6f9b20a)]:
  - effect@3.10.8

## 0.69.12

### Patch Changes

- Updated dependencies [[`33f5b9f`](https://github.com/Effect-TS/effect/commit/33f5b9ffaebea4f1bd0e391b44c41fb6230e743a), [`50f0281`](https://github.com/Effect-TS/effect/commit/50f0281b0d2116726b8927a6217622d5f394f3e4)]:
  - effect@3.10.7

## 0.69.11

### Patch Changes

- [#3856](https://github.com/Effect-TS/effect/pull/3856) [`81ddd45`](https://github.com/Effect-TS/effect/commit/81ddd45fc074b98206fafab416d9a5a28b31e07a) Thanks @KhraksMamtsov! - Integration with [Scalar](https://scalar.com/) has been implemented

- Updated dependencies [[`ce1c21f`](https://github.com/Effect-TS/effect/commit/ce1c21ffc11902ac9ab453a51904207859d38552)]:
  - effect@3.10.6

## 0.69.10

### Patch Changes

- Updated dependencies [[`3a6d757`](https://github.com/Effect-TS/effect/commit/3a6d757badeebe00d8ef4d67530d073c8264dcfa), [`59d813a`](https://github.com/Effect-TS/effect/commit/59d813aa4973d1115cfc70cc3667508335f49693)]:
  - effect@3.10.5

## 0.69.9

### Patch Changes

- [#3842](https://github.com/Effect-TS/effect/pull/3842) [`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e) Thanks @gcanti! - add support for `Schema.OptionFromUndefinedOr` in JSON Schema generation, closes #3839

  Before

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.Struct({
    a: Schema.OptionFromUndefinedOr(Schema.Number)
  })

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  throws:
  Error: Missing annotation
  at path: ["a"]
  details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
  schema (UndefinedKeyword): undefined
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "effect"

  const schema = Schema.Struct({
    a: Schema.OptionFromUndefinedOr(Schema.Number)
  })

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  Output:
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": [],
    "properties": {
      "a": {
        "type": "number"
      }
    },
    "additionalProperties": false
  }
  */
  ```

- Updated dependencies [[`2367708`](https://github.com/Effect-TS/effect/commit/2367708be449f9526a2047e321302d7bfb16f18e)]:
  - effect@3.10.4

## 0.69.8

### Patch Changes

- [#3837](https://github.com/Effect-TS/effect/pull/3837) [`522f7c5`](https://github.com/Effect-TS/effect/commit/522f7c518a5acfb55ef96d6796869f002cc3eaf8) Thanks @tim-smart! - eliminate HttpApiEndpoint context in .handle

## 0.69.7

### Patch Changes

- [#3836](https://github.com/Effect-TS/effect/pull/3836) [`690d6c5`](https://github.com/Effect-TS/effect/commit/690d6c54d2145adb0af545c447db7d4755bf3c6b) Thanks @tim-smart! - add HttpApiBuilder.handler, for defining a single handler

- [#3831](https://github.com/Effect-TS/effect/pull/3831) [`279fe3a`](https://github.com/Effect-TS/effect/commit/279fe3a7168fe84e520c2cc88ba189a15f03a2bc) Thanks @tim-smart! - ensure parent annotations take precedence over surrogate annotations

- Updated dependencies [[`b9423d8`](https://github.com/Effect-TS/effect/commit/b9423d8bf8181a2389fdbce1e3c14ac6fe8d54f5)]:
  - effect@3.10.3

## 0.69.6

### Patch Changes

- [#3826](https://github.com/Effect-TS/effect/pull/3826) [`42cd72a`](https://github.com/Effect-TS/effect/commit/42cd72a44ca9593e4d81fbb50e8111625fd0fb81) Thanks @juliusmarminge! - ensure requests & responses have headers redacted when inspecting

- Updated dependencies [[`714e119`](https://github.com/Effect-TS/effect/commit/714e11945e45e5a2554ee058e6c43f82a8e309cf), [`c1afd55`](https://github.com/Effect-TS/effect/commit/c1afd55c54e61f9c432823d21b3d016f79160a37)]:
  - effect@3.10.2

## 0.69.5

### Patch Changes

- Updated dependencies [[`9604d6b`](https://github.com/Effect-TS/effect/commit/9604d6b616435103dafea8b53637a9d1450b4750)]:
  - effect@3.10.1

## 0.69.4

### Patch Changes

- [#3816](https://github.com/Effect-TS/effect/pull/3816) [`c86b1d7`](https://github.com/Effect-TS/effect/commit/c86b1d7cd47b66df190ef9775a475467c1abdbd6) Thanks @tim-smart! - allow Request.signal to be missing in .toWebHandler apis

## 0.69.3

### Patch Changes

- [#3814](https://github.com/Effect-TS/effect/pull/3814) [`d5fba63`](https://github.com/Effect-TS/effect/commit/d5fba6391e1005e374aa0238f13edfbd65848313) Thanks @tim-smart! - cache OpenApi schema generation

- [#3813](https://github.com/Effect-TS/effect/pull/3813) [`1eb2c30`](https://github.com/Effect-TS/effect/commit/1eb2c30ba064398db5790e376dedcfad55b7b005) Thanks @KhraksMamtsov! - Add support for bearer format OpenApi annotation

- [#3811](https://github.com/Effect-TS/effect/pull/3811) [`02d413e`](https://github.com/Effect-TS/effect/commit/02d413e7b6bc1c64885969c37cc3e4e690c94d7d) Thanks @KhraksMamtsov! - A bug related to the format of the security schema keys has been fixed. According to the OpenAPI specification, it must match the regular expression` ^[a-zA-Z0-9.-_]+# @effect/platform

## 0.69.2

### Patch Changes

- [#3808](https://github.com/Effect-TS/effect/pull/3808) [`e7afc47`](https://github.com/Effect-TS/effect/commit/e7afc47ce83e381c3f4aed2b2974e3b3d86a2340) Thanks @tim-smart! - ensure HttpMiddleware is only initialized once

## 0.69.1

### Patch Changes

- [#3802](https://github.com/Effect-TS/effect/pull/3802) [`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8) Thanks @tim-smart! - simplify HttpApiMiddleware.TagClass type

- [#3802](https://github.com/Effect-TS/effect/pull/3802) [`7564f56`](https://github.com/Effect-TS/effect/commit/7564f56bb2844cf39d2b0d2d9e93cf9b2205e9a8) Thanks @tim-smart! - add HttpServer.layerContext to platform-node/bun

## 0.69.0

### Minor Changes

- [#3764](https://github.com/Effect-TS/effect/pull/3764) [`6d9de6b`](https://github.com/Effect-TS/effect/commit/6d9de6b871c5c08e6509a4e830c3d74758faa198) Thanks @tim-smart! - HttpApi second revision
  - `HttpApi`, `HttpApiGroup` & `HttpApiEndpoint` now use a chainable api instead
    of a pipeable api.
  - `HttpApiMiddleware` module has been added, with a updated way of defining
    security middleware.
  - You can now add multiple success schemas
  - A url search parameter schema has been added
  - Error schemas now support `HttpApiSchema` encoding apis
  - `toWebHandler` has been simplified

  For more information, see the [README](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md#http-api).

- [#3764](https://github.com/Effect-TS/effect/pull/3764) [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556) Thanks @patroza! - feat: implement Redactable. Used by Headers to not log sensitive information

### Patch Changes

- Updated dependencies [[`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`4a01828`](https://github.com/Effect-TS/effect/commit/4a01828b66d6213e9bbe18979c893b13f7bb29bf), [`c79c4c1`](https://github.com/Effect-TS/effect/commit/c79c4c178390fe61ff6dda88c9e058862349343a), [`38d30f0`](https://github.com/Effect-TS/effect/commit/38d30f08b8da62f9c3e308b9250738cb8d17bdb5), [`5821ce3`](https://github.com/Effect-TS/effect/commit/5821ce3455b47d25e0a40cae6ce22af9db5fa556)]:
  - effect@3.10.0

## 0.68.6

### Patch Changes

- Updated dependencies [[`382556f`](https://github.com/Effect-TS/effect/commit/382556f8930780c0634de681077706113a8c8239), [`97cb014`](https://github.com/Effect-TS/effect/commit/97cb0145114b2cd2f378e98f6c4ff5bf2c1865f5)]:
  - @effect/schema@0.75.5

## 0.68.5

### Patch Changes

- [#3784](https://github.com/Effect-TS/effect/pull/3784) [`2036402`](https://github.com/Effect-TS/effect/commit/20364020b8b75a684791aa93d90626758023e9e9) Thanks @patroza! - fix HttpMiddleware circular import

## 0.68.4

### Patch Changes

- [#3780](https://github.com/Effect-TS/effect/pull/3780) [`1b1ef29`](https://github.com/Effect-TS/effect/commit/1b1ef29ae302322f69dc938f9337aa97b4c63266) Thanks @tim-smart! - ensure cors middleware also affects error responses

## 0.68.3

### Patch Changes

- [#3769](https://github.com/Effect-TS/effect/pull/3769) [`8c33087`](https://github.com/Effect-TS/effect/commit/8c330879425e80bed2f65e407cd59e991f0d7bec) Thanks @tim-smart! - add support for WebSocket protocols option

- Updated dependencies [[`61a99b2`](https://github.com/Effect-TS/effect/commit/61a99b2bf9d757870ef0c2ec9d4c877cdd364a3d)]:
  - effect@3.9.2
  - @effect/schema@0.75.4

## 0.68.2

### Patch Changes

- Updated dependencies [[`360ec14`](https://github.com/Effect-TS/effect/commit/360ec14dd4102c526aef7433a8881ad4d9beab75)]:
  - @effect/schema@0.75.3

## 0.68.1

### Patch Changes

- [#3743](https://github.com/Effect-TS/effect/pull/3743) [`b75ac5d`](https://github.com/Effect-TS/effect/commit/b75ac5d0909115507bedc90f18f2d34deb217769) Thanks @sukovanej! - Add support for `ConfigProvider` based on .env files.

  ```ts
  import { PlatformConfigProvider } from "@effect/platform"
  import { NodeContext } from "@effect/platform-node"
  import { Config } from "effect"

  Effect.gen(function* () {
    const config = yield* Config.all({
      api_url: Config.string("API_URL"),
      api_key: Config.string("API_KEY")
    })

    console.log(`Api config: ${config}`)
  }).pipe(
    Effect.provide(
      PlatformConfigProvider.layerDotEnvAdd(".env").pipe(
        Layer.provide(NodeContext.layer)
      )
    )
  )
  ```

## 0.68.0

### Minor Changes

- [#3756](https://github.com/Effect-TS/effect/pull/3756) [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363) Thanks @tim-smart! - remove HttpClient.Service type

- [#3756](https://github.com/Effect-TS/effect/pull/3756) [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363) Thanks @tim-smart! - constrain HttpClient success type to HttpClientResponse

- [#3756](https://github.com/Effect-TS/effect/pull/3756) [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363) Thanks @tim-smart! - add HttpClient accessor apis

  These apis allow you to easily send requests without first accessing the `HttpClient` service.

  Below is an example of using the `get` accessor api to send a GET request:

  ```ts
  import { FetchHttpClient, HttpClient } from "@effect/platform"
  import { Effect } from "effect"

  const program = HttpClient.get(
    "https://jsonplaceholder.typicode.com/posts/1"
  ).pipe(
    Effect.andThen((response) => response.json),
    Effect.scoped,
    Effect.provide(FetchHttpClient.layer)
  )

  Effect.runPromise(program)
  /*
  Output:
  {
    userId: 1,
    id: 1,
    title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit',
    body: 'quia et suscipit\n' +
      'suscipit recusandae consequuntur expedita et cum\n' +
      'reprehenderit molestiae ut ut quas totam\n' +
      'nostrum rerum est autem sunt rem eveniet architecto'
  }
  */
  ```

### Patch Changes

- Updated dependencies [[`f02b354`](https://github.com/Effect-TS/effect/commit/f02b354ab5b0451143b82bb73dc866be29adec85)]:
  - @effect/schema@0.75.2

## 0.67.1

### Patch Changes

- [#3740](https://github.com/Effect-TS/effect/pull/3740) [`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9) Thanks @tim-smart! - revert deno Inspectable changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - effect@3.9.1
  - @effect/schema@0.75.1

## 0.67.0

### Minor Changes

- [#3620](https://github.com/Effect-TS/effect/pull/3620) [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0) Thanks @tim-smart! - add deno support to Inspectable

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/schema@0.75.0

## 0.66.3

### Patch Changes

- [#3736](https://github.com/Effect-TS/effect/pull/3736) [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3) Thanks @tim-smart! - add HttpClientResponse.filterStatus apis

- [#3732](https://github.com/Effect-TS/effect/pull/3732) [`8e94585`](https://github.com/Effect-TS/effect/commit/8e94585abe62753bf3af28bfae77926a7c570ac3) Thanks @sukovanej! - Fix: handle `Blob` message data from a websocket.

- [#3736](https://github.com/Effect-TS/effect/pull/3736) [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3) Thanks @tim-smart! - add HttpClient.retryTransient api

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/schema@0.74.2

## 0.66.2

### Patch Changes

- [#3667](https://github.com/Effect-TS/effect/pull/3667) [`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e) Thanks @gcanti! - Remove default json schema annotations from string, number and boolean.

  Before

  ```ts
  import { JSONSchema, Schema } from "@effect/schema"

  const schema = Schema.String.annotations({ examples: ["a", "b"] })

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "string",
    "description": "a string",
    "title": "string",
    "examples": [
      "a",
      "b"
    ]
  }
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "@effect/schema"

  const schema = Schema.String.annotations({ examples: ["a", "b"] })

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "string",
    "examples": [
      "a",
      "b"
    ]
  }
  */
  ```

- [#3672](https://github.com/Effect-TS/effect/pull/3672) [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382) Thanks @gcanti! - JSON Schema: handle refinements where the 'from' part includes a transformation, closes #3662

  Before

  ```ts
  import { JSONSchema, Schema } from "@effect/schema"

  const schema = Schema.Date

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  throws
  Error: Missing annotation
  details: Generating a JSON Schema for this schema requires a "jsonSchema" annotation
  schema (Refinement): Date
  */
  ```

  After

  ```ts
  import { JSONSchema, Schema } from "@effect/schema"

  const schema = Schema.Date

  console.log(JSON.stringify(JSONSchema.make(schema), null, 2))
  /*
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "string",
    "description": "a string that will be parsed into a Date"
  }
  */
  ```

- Updated dependencies [[`734eae6`](https://github.com/Effect-TS/effect/commit/734eae654f215e4adca457d04d2a1728b1a55c83), [`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`ad7e1de`](https://github.com/Effect-TS/effect/commit/ad7e1de948745c0751bfdac96671028ff4b7a727), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/schema@0.74.1
  - effect@3.8.4

## 0.66.1

### Patch Changes

- [#3664](https://github.com/Effect-TS/effect/pull/3664) [`3812788`](https://github.com/Effect-TS/effect/commit/3812788d79caaab8f559a62fd443018a04ac5647) Thanks @tim-smart! - add OpenApiJsonSchema module

## 0.66.0

### Patch Changes

- Updated dependencies [[`de48aa5`](https://github.com/Effect-TS/effect/commit/de48aa54e98d97722a8a4c2c8f9e1fe1d4560ea2)]:
  - @effect/schema@0.74.0

## 0.65.5

### Patch Changes

- [#3640](https://github.com/Effect-TS/effect/pull/3640) [`321b201`](https://github.com/Effect-TS/effect/commit/321b201adcb6bbbeb806b3467dd0b4cf063ccda8) Thanks @tim-smart! - use HttpClientRequest.originalUrl for search params parser

- Updated dependencies [[`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - effect@3.8.3
  - @effect/schema@0.73.4

## 0.65.4

### Patch Changes

- Updated dependencies [[`e6440a7`](https://github.com/Effect-TS/effect/commit/e6440a74fb3f12f6422ed794c07cb44af91cbacc)]:
  - @effect/schema@0.73.3

## 0.65.3

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2
  - @effect/schema@0.73.2

## 0.65.2

### Patch Changes

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`f56ab78`](https://github.com/Effect-TS/effect/commit/f56ab785cbee0c1c43bd2c182c35602f486f61f0), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1
  - @effect/schema@0.73.1

## 0.65.1

### Patch Changes

- [#3614](https://github.com/Effect-TS/effect/pull/3614) [`e44c5f2`](https://github.com/Effect-TS/effect/commit/e44c5f228215738fe4e75023c7461bf9521249cb) Thanks @tim-smart! - accept Redacted in HttpClientRequest.basicAuth/bearerToken

## 0.65.0

### Minor Changes

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`7041393`](https://github.com/Effect-TS/effect/commit/7041393cff132e96566d3f36da0483a6ff6195e4) Thanks @tim-smart! - refactor /platform HttpClient

  #### HttpClient.fetch removed

  The `HttpClient.fetch` client implementation has been removed. Instead, you can
  access a `HttpClient` using the corresponding `Context.Tag`.

  ```ts
  import { FetchHttpClient, HttpClient } from "@effect/platform"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // make a get request
    yield* client.get("https://jsonplaceholder.typicode.com/todos/1")
  }).pipe(
    Effect.scoped,
    // the fetch client has been moved to the `FetchHttpClient` module
    Effect.provide(FetchHttpClient.layer)
  )
  ```

  #### `HttpClient` interface now uses methods

  Instead of being a function that returns the response, the `HttpClient`
  interface now uses methods to make requests.

  Some shorthand methods have been added to the `HttpClient` interface to make
  less complex requests easier.

  ```ts
  import {
    FetchHttpClient,
    HttpClient,
    HttpClientRequest
  } from "@effect/platform"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    // make a get request
    yield* client.get("https://jsonplaceholder.typicode.com/todos/1")
    // make a post request
    yield* client.post("https://jsonplaceholder.typicode.com/todos")

    // execute a request instance
    yield* client.execute(
      HttpClientRequest.get("https://jsonplaceholder.typicode.com/todos/1")
    )
  })
  ```

  #### Scoped `HttpClientResponse` helpers removed

  The `HttpClientResponse` helpers that also supplied the `Scope` have been removed.

  Instead, you can use the `HttpClientResponse` methods directly, and explicitly
  add a `Effect.scoped` to the pipeline.

  ```ts
  import { FetchHttpClient, HttpClient } from "@effect/platform"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    yield* client.get("https://jsonplaceholder.typicode.com/todos/1").pipe(
      Effect.flatMap((response) => response.json),
      Effect.scoped // supply the `Scope`
    )
  })
  ```

  #### Some apis have been renamed

  Including the `HttpClientRequest` body apis, which is to make them more
  discoverable.

### Patch Changes

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936) Thanks @tim-smart! - add Logger.prettyLoggerDefault, to prevent duplicate pretty loggers

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`6a128f6`](https://github.com/Effect-TS/effect/commit/6a128f63f9b41fec2db70790b3bbb96cb9afa1ab) Thanks @tim-smart! - ensure FetchHttpClient always attempts to send a request body

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754) Thanks @tim-smart! - use Mailbox for Workers, Socket & Rpc

- [#3541](https://github.com/Effect-TS/effect/pull/3541) [`e0d21a5`](https://github.com/Effect-TS/effect/commit/e0d21a54c8323728fbb75a32f4820a9996257809) Thanks @fubhy! - Added refinement overloads to `HttpClient.filterOrFail` and `HttpClient.filterOrElse`

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`7fdf9d9`](https://github.com/Effect-TS/effect/commit/7fdf9d9aa1e2c1c125cbf87991e6efbf4abb7b07), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0
  - @effect/schema@0.73.0

## 0.64.1

### Patch Changes

- [#3582](https://github.com/Effect-TS/effect/pull/3582) [`8261c5a`](https://github.com/Effect-TS/effect/commit/8261c5ae6fe86872292ec1fc1a58ab9cea2f5f51) Thanks @gcanti! - add missing `encoding` argument to `Command.streamLines`

- Updated dependencies [[`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be)]:
  - effect@3.7.3
  - @effect/schema@0.72.4

## 0.64.0

### Minor Changes

- [#3565](https://github.com/Effect-TS/effect/pull/3565) [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a) Thanks @tim-smart! - move Etag implementation to /platform

### Patch Changes

- [#3565](https://github.com/Effect-TS/effect/pull/3565) [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a) Thanks @tim-smart! - add HttpApiBuilder.toWebHandler api

- [#3567](https://github.com/Effect-TS/effect/pull/3567) [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9) Thanks @tim-smart! - reduce boxing in Socket.toChannel implementation

- [#3567](https://github.com/Effect-TS/effect/pull/3567) [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9) Thanks @tim-smart! - add Socket.toChannelString api

- Updated dependencies [[`f6acb71`](https://github.com/Effect-TS/effect/commit/f6acb71b17a0e6b0d449e7f661c9e2c3d335fcac)]:
  - @effect/schema@0.72.3

## 0.63.3

### Patch Changes

- [#3550](https://github.com/Effect-TS/effect/pull/3550) [`4a701c4`](https://github.com/Effect-TS/effect/commit/4a701c406da032563fedae459536c00ae5cfe3c7) Thanks @tim-smart! - ensure Socket.toChannel fiber is attached to Scope

## 0.63.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2
  - @effect/schema@0.72.2

## 0.63.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1
  - @effect/schema@0.72.1

## 0.63.0

### Patch Changes

- [#3410](https://github.com/Effect-TS/effect/pull/3410) [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f) Thanks @tim-smart! - add HttpApi modules

  The `HttpApi` family of modules provide a declarative way to define HTTP APIs.

  For more infomation see the README.md for the /platform package:<br />
  https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0
  - @effect/schema@0.72.0

## 0.62.5

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8
  - @effect/schema@0.71.4

## 0.62.4

### Patch Changes

- [#3506](https://github.com/Effect-TS/effect/pull/3506) [`e7a65e3`](https://github.com/Effect-TS/effect/commit/e7a65e3c6a08636bbfce3d3af3098bf28474364d) Thanks @tim-smart! - use Logger.pretty for runMain, and support dual usage

- Updated dependencies [[`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - effect@3.6.7
  - @effect/schema@0.71.3

## 0.62.3

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6
  - @effect/schema@0.71.2

## 0.62.2

### Patch Changes

- [#3494](https://github.com/Effect-TS/effect/pull/3494) [`413994c`](https://github.com/Effect-TS/effect/commit/413994c9792f16d9d57cca3ae6eb254bf93bd261) Thanks @tim-smart! - add binary support to KeyValueStore

- Updated dependencies [[`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae)]:
  - effect@3.6.5
  - @effect/schema@0.71.1

## 0.62.1

### Patch Changes

- [#3469](https://github.com/Effect-TS/effect/pull/3469) [`9efe0e5`](https://github.com/Effect-TS/effect/commit/9efe0e5b57ac557399be620822c21cc6e9add285) Thanks @tim-smart! - respond with 404 for NoSuchElementException in HttpServerRespondable

## 0.62.0

### Patch Changes

- [#3454](https://github.com/Effect-TS/effect/pull/3454) [`5dcb401`](https://github.com/Effect-TS/effect/commit/5dcb401bfc52a5c8f8934b1f95adf0ad515277d6) Thanks @tim-smart! - add HttpRouter.currentRouterConfig fiber ref

- [#3450](https://github.com/Effect-TS/effect/pull/3450) [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`c1987e2`](https://github.com/Effect-TS/effect/commit/c1987e25c8f5c48bdc9ad223d7a6f2c32f93f5a1), [`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`1ceed14`](https://github.com/Effect-TS/effect/commit/1ceed149dc64f4874e64b5cf2f954eba0a5a1f12), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4), [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1)]:
  - @effect/schema@0.71.0
  - effect@3.6.4

## 0.61.8

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/schema@0.70.4

## 0.61.7

### Patch Changes

- [#3437](https://github.com/Effect-TS/effect/pull/3437) [`17245a4`](https://github.com/Effect-TS/effect/commit/17245a4e783c19dee51529600b3b40f164fa59bc) Thanks @tim-smart! - add Cookies.get/getValue apis

- [#3439](https://github.com/Effect-TS/effect/pull/3439) [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09) Thanks @sukovanej! - Add `HttpRouter.concatAll`.

- [#3439](https://github.com/Effect-TS/effect/pull/3439) [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09) Thanks @sukovanej! - Fix `HttpRouter.concat` - add mounts from both routers.

## 0.61.6

### Patch Changes

- [#3436](https://github.com/Effect-TS/effect/pull/3436) [`d829b57`](https://github.com/Effect-TS/effect/commit/d829b576357f2e3b203ab7e107a1492de903a106) Thanks @tim-smart! - remove host from HttpServerRequest url's

- Updated dependencies [[`99ad841`](https://github.com/Effect-TS/effect/commit/99ad8415293a82d08bd7043c563b29e2b468ca74), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/schema@0.70.3
  - effect@3.6.2

## 0.61.5

### Patch Changes

- [#3409](https://github.com/Effect-TS/effect/pull/3409) [`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38) Thanks @sukovanej! - Add `HttpClient.layerTest`.

## 0.61.4

### Patch Changes

- [#3414](https://github.com/Effect-TS/effect/pull/3414) [`e7cb109`](https://github.com/Effect-TS/effect/commit/e7cb109d0754207024a64d55b6bd2a674dd8ed7d) Thanks @tim-smart! - ensure broken HttpMiddleware that doesn't fail responds

## 0.61.3

### Patch Changes

- [#3408](https://github.com/Effect-TS/effect/pull/3408) [`fb9f786`](https://github.com/Effect-TS/effect/commit/fb9f7867f0c895e63f9ef23e8d0941248c42179d) Thanks @tim-smart! - ensure failure in HttpMiddleware results in a response

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/schema@0.70.2

## 0.61.2

### Patch Changes

- Updated dependencies [[`3dce357`](https://github.com/Effect-TS/effect/commit/3dce357efe4a4451d7d29859d08ac11713999b1a), [`657fc48`](https://github.com/Effect-TS/effect/commit/657fc48bb32daf2dc09c9335b3cbc3152bcbdd3b)]:
  - @effect/schema@0.70.1

## 0.61.1

### Patch Changes

- [#3384](https://github.com/Effect-TS/effect/pull/3384) [`11223bf`](https://github.com/Effect-TS/effect/commit/11223bf9cbf5b822e0bf9a9fb2b35b2ad88af692) Thanks @tim-smart! - use type alias for HttpApp

## 0.61.0

### Patch Changes

- [#3380](https://github.com/Effect-TS/effect/pull/3380) [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285) Thanks @fubhy! - Changed various function signatures to return `Array` instead of `ReadonlyArray`

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/schema@0.70.0

## 0.60.3

### Patch Changes

- Updated dependencies [[`7c0da50`](https://github.com/Effect-TS/effect/commit/7c0da5050d30cb804f4eacb15995d0fb7f3a28d2), [`2fc0ff4`](https://github.com/Effect-TS/effect/commit/2fc0ff4c59c25977018f6ac70ced99b04a8c7b2b), [`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`f262665`](https://github.com/Effect-TS/effect/commit/f262665c2773492c01e5dd0e8d6db235aafaaad8), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`9bbe7a6`](https://github.com/Effect-TS/effect/commit/9bbe7a681430ebf5c10167bb7140ba3742e46bb7), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - @effect/schema@0.69.3
  - effect@3.5.9

## 0.60.2

### Patch Changes

- [#3339](https://github.com/Effect-TS/effect/pull/3339) [`eb4d014`](https://github.com/Effect-TS/effect/commit/eb4d014c559e1b4c95b3fb9295fe77593c17ed7a) Thanks @fubhy! - Fixed various search params related function signatures (`Array => ReadonlyArray`)

- [#3353](https://github.com/Effect-TS/effect/pull/3353) [`fc20f73`](https://github.com/Effect-TS/effect/commit/fc20f73c69e577981cb64714de2adc97e1004dae) Thanks @tim-smart! - wait for worker ready latch before sending initial message

- Updated dependencies [[`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231)]:
  - effect@3.5.8
  - @effect/schema@0.69.2

## 0.60.1

### Patch Changes

- Updated dependencies [[`f241154`](https://github.com/Effect-TS/effect/commit/f241154added5d91e95866c39481f09cdb13bd4d)]:
  - @effect/schema@0.69.1

## 0.60.0

### Patch Changes

- Updated dependencies [[`20807a4`](https://github.com/Effect-TS/effect/commit/20807a45edeb4334e903dca5d708cd62a71702d8)]:
  - @effect/schema@0.69.0

## 0.59.3

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc), [`6921c4f`](https://github.com/Effect-TS/effect/commit/6921c4fb8c45badff09b493043b85ca71302b560)]:
  - effect@3.5.7
  - @effect/schema@0.68.27

## 0.59.2

### Patch Changes

- Updated dependencies [[`f0285d3`](https://github.com/Effect-TS/effect/commit/f0285d3af6a18829123bc1818331c67206becbc4), [`8ec4955`](https://github.com/Effect-TS/effect/commit/8ec49555ed3b3c98093fa4d135a4c57a3f16ebd1), [`3ac2d76`](https://github.com/Effect-TS/effect/commit/3ac2d76048da09e876cf6c3aee3397febd843fe9), [`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - @effect/schema@0.68.26
  - effect@3.5.6

## 0.59.1

### Patch Changes

- [#3278](https://github.com/Effect-TS/effect/pull/3278) [`fcecff7`](https://github.com/Effect-TS/effect/commit/fcecff7f7e12b295a252f124861b801c73072151) Thanks @tim-smart! - ensure /platform HttpApp.toWebHandler runs Stream's with the current runtime

  Also add runtime options to HttpServerResponse.toWeb

- [#3281](https://github.com/Effect-TS/effect/pull/3281) [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65) Thanks @tim-smart! - drop path-browserify dependency

- [#3281](https://github.com/Effect-TS/effect/pull/3281) [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65) Thanks @tim-smart! - drop fast-querystring dependency

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39)]:
  - effect@3.5.5
  - @effect/schema@0.68.25

## 0.59.0

### Minor Changes

- [#3260](https://github.com/Effect-TS/effect/pull/3260) [`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c) Thanks @tim-smart! - replace /platform RefailError with use of the "cause" property

- [#3255](https://github.com/Effect-TS/effect/pull/3255) [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c) Thanks @tim-smart! - refactor & simplify /platform backing workers

  Improves worker performance by 2x

### Patch Changes

- Updated dependencies [[`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - effect@3.5.4
  - @effect/schema@0.68.24

## 0.58.27

### Patch Changes

- [#3241](https://github.com/Effect-TS/effect/pull/3241) [`a1db40a`](https://github.com/Effect-TS/effect/commit/a1db40a650ab842e778654f0d88e80f2ef4fd6f3) Thanks @tim-smart! - ensure interrupts are handled in WorkerRunner

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/schema@0.68.23

## 0.58.26

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/schema@0.68.22

## 0.58.25

### Patch Changes

- [#3223](https://github.com/Effect-TS/effect/pull/3223) [`0623fca`](https://github.com/Effect-TS/effect/commit/0623fca41679b0e3c5a10dd0f8985f91670bd721) Thanks @tim-smart! - improve /platform/WorkerError messages

## 0.58.24

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/schema@0.68.21

## 0.58.23

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/schema@0.68.20

## 0.58.22

### Patch Changes

- [#3209](https://github.com/Effect-TS/effect/pull/3209) [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d) Thanks @tim-smart! - simplify /platform http response handling

- [#3209](https://github.com/Effect-TS/effect/pull/3209) [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d) Thanks @tim-smart! - support middleware in HttpApp web handler apis

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9
  - @effect/schema@0.68.19

## 0.58.21

### Patch Changes

- Updated dependencies [[`5d5cc6c`](https://github.com/Effect-TS/effect/commit/5d5cc6cfd7d63b07081290fb189b364999201fc5), [`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`359ff8a`](https://github.com/Effect-TS/effect/commit/359ff8aa2e4e6389bf56d759baa804e2a7674a16), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c), [`f7534b9`](https://github.com/Effect-TS/effect/commit/f7534b94cba06b143a3d4f29275d92874a939559)]:
  - @effect/schema@0.68.18
  - effect@3.4.8

## 0.58.20

### Patch Changes

- Updated dependencies [[`15967cf`](https://github.com/Effect-TS/effect/commit/15967cf18931fb6ede3083eb687a8dfff371cc56), [`2328e17`](https://github.com/Effect-TS/effect/commit/2328e17577112db17c29b7756942a0ff64a70ee0), [`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - @effect/schema@0.68.17
  - effect@3.4.7

## 0.58.19

### Patch Changes

- Updated dependencies [[`d006cec`](https://github.com/Effect-TS/effect/commit/d006cec022e8524dbfd6dc6df751fe4c86b10042), [`cb22726`](https://github.com/Effect-TS/effect/commit/cb2272656881aa5878a1c3fc0b12d8fbc66eb63c), [`e911cfd`](https://github.com/Effect-TS/effect/commit/e911cfdc79418462d7e9000976fded15ea6b738d)]:
  - @effect/schema@0.68.16

## 0.58.18

### Patch Changes

- [#3136](https://github.com/Effect-TS/effect/pull/3136) [`7f8900a`](https://github.com/Effect-TS/effect/commit/7f8900a1de9addeb0d371103a2c5c2aa3e4ff95e) Thanks @tim-smart! - support undefined in http request schema apis

## 0.58.17

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`34faeb6`](https://github.com/Effect-TS/effect/commit/34faeb6305ba52af4d6f8bdd2e633bb6a5a7a35b), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6
  - @effect/schema@0.68.15

## 0.58.16

### Patch Changes

- Updated dependencies [[`61e5964`](https://github.com/Effect-TS/effect/commit/61e59640fd993216cca8ace0ac8abd9104e213ce)]:
  - @effect/schema@0.68.14

## 0.58.15

### Patch Changes

- [#3123](https://github.com/Effect-TS/effect/pull/3123) [`baa90df`](https://github.com/Effect-TS/effect/commit/baa90df9663f5f37d7b6814dad25142d53dbc720) Thanks @tim-smart! - add HttpClient.followRedirects api

- Updated dependencies [[`cb76bcb`](https://github.com/Effect-TS/effect/commit/cb76bcb2f8858a90db4f785efee262cea1b9844e)]:
  - @effect/schema@0.68.13

## 0.58.14

### Patch Changes

- [#3104](https://github.com/Effect-TS/effect/pull/3104) [`52a87c7`](https://github.com/Effect-TS/effect/commit/52a87c7a0b9536398deaf8ec507e53a82c607219) Thanks @tim-smart! - remove the stack from HttpServerError.RouteNotFound

- [#3109](https://github.com/Effect-TS/effect/pull/3109) [`6d2280e`](https://github.com/Effect-TS/effect/commit/6d2280e9497c95cb0e965ca462c825345074eedf) Thanks @tim-smart! - fix assignability of HttpMiddleware in HttpRouter.use

## 0.58.13

### Patch Changes

- [#3102](https://github.com/Effect-TS/effect/pull/3102) [`dbd53ea`](https://github.com/Effect-TS/effect/commit/dbd53ea363c71a24449cb068251054c3a1acf864) Thanks @tim-smart! - filter undefined from UrlParams Input

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91), [`d990544`](https://github.com/Effect-TS/effect/commit/d9905444b9e800850cb65899114ca0e502e68fe8)]:
  - effect@3.4.5
  - @effect/schema@0.68.12

## 0.58.12

### Patch Changes

- [#3094](https://github.com/Effect-TS/effect/pull/3094) [`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044) Thanks @tim-smart! - add mount apis to HttpRouter.Service

- [#3094](https://github.com/Effect-TS/effect/pull/3094) [`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044) Thanks @tim-smart! - add HttpRouter.DefaultServices to all HttpRouter.Tag's

- Updated dependencies [[`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c), [`d71c192`](https://github.com/Effect-TS/effect/commit/d71c192b89fd1162423acddc5fd3d6270fbf2ef6)]:
  - effect@3.4.4
  - @effect/schema@0.68.11

## 0.58.11

### Patch Changes

- [#3091](https://github.com/Effect-TS/effect/pull/3091) [`a5b95b5`](https://github.com/Effect-TS/effect/commit/a5b95b548284e4798654ae7ce6883fa49108f0ea) Thanks @tim-smart! - add some common services to HttpRouter.Default

- [#3090](https://github.com/Effect-TS/effect/pull/3090) [`5e29579`](https://github.com/Effect-TS/effect/commit/5e29579187cb8420ea4930b3999fec984f8999f4) Thanks @tim-smart! - add HttpServerRequest.toURL api

  To try retreive the full URL for the request.

## 0.58.10

### Patch Changes

- [#3088](https://github.com/Effect-TS/effect/pull/3088) [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9) Thanks @tim-smart! - add HttpServerRespondable trait

  This trait allows you to define how a value should be responded to in an HTTP
  server.

  You can it for both errors and success values.

  ```ts
  import { Schema } from "@effect/schema"
  import {
    HttpRouter,
    HttpServerRespondable,
    HttpServerResponse
  } from "@effect/platform"

  class User extends Schema.Class<User>("User")({
    name: Schema.String
  }) {
    [HttpServerRespondable.symbol]() {
      return HttpServerResponse.schemaJson(User)(this)
    }
  }

  class MyError extends Schema.TaggedError<MyError>()("MyError", {
    message: Schema.String
  }) {
    [HttpServerRespondable.symbol]() {
      return HttpServerResponse.schemaJson(MyError)(this, { status: 403 })
    }
  }

  HttpRouter.empty.pipe(
    // responds with `{ "name": "test" }`
    HttpRouter.get("/user", Effect.succeed(new User({ name: "test" }))),
    // responds with a 403 status, and `{ "_tag": "MyError", "message": "boom" }`
    HttpRouter.get("/fail", new MyError({ message: "boom" }))
  )
  ```

- [#3088](https://github.com/Effect-TS/effect/pull/3088) [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9) Thanks @tim-smart! - swap type parameters for HttpRouter.Tag, so request context comes first

- [#3088](https://github.com/Effect-TS/effect/pull/3088) [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9) Thanks @tim-smart! - add HttpRouter.Default, a default instance of HttpRouter.Tag

- [#3089](https://github.com/Effect-TS/effect/pull/3089) [`ab3180f`](https://github.com/Effect-TS/effect/commit/ab3180f827041d0ea3b2d72254a1a8683e99e056) Thanks @tim-smart! - add HttpClientResponse.matchStatus\* apis

  Which allows you to pattern match on the status code of a response.

  ```ts
  HttpClientRequest.get("/todos/1").pipe(
    HttpClient.fetch,
    HttpClientResponse.matchStatusScoped({
      "2xx": (_response) => Effect.succeed("ok"),
      404: (_response) => Effect.fail("not found"),
      orElse: (_response) => Effect.fail("boom")
    })
  )
  ```

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - effect@3.4.3
  - @effect/schema@0.68.10

## 0.58.9

### Patch Changes

- Updated dependencies [[`0b47fdf`](https://github.com/Effect-TS/effect/commit/0b47fdfe449f42de89e0e88b61ae5140f629e5c4)]:
  - @effect/schema@0.68.9

## 0.58.8

### Patch Changes

- Updated dependencies [[`192261b`](https://github.com/Effect-TS/effect/commit/192261b2aec94e9913ceed83683fdcfbc9fca66f), [`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - @effect/schema@0.68.8
  - effect@3.4.2

## 0.58.7

### Patch Changes

- [#3064](https://github.com/Effect-TS/effect/pull/3064) [`027004a`](https://github.com/Effect-TS/effect/commit/027004a897f654791e75faa28eefb50dd0244b6e) Thanks @tim-smart! - add HttpRouter.Tag.unwrap api

## 0.58.6

### Patch Changes

- [#3059](https://github.com/Effect-TS/effect/pull/3059) [`2e8e252`](https://github.com/Effect-TS/effect/commit/2e8e2520cac712f0eb644553bd476429ebd674e4) Thanks @tim-smart! - add Layer based api for creating HttpRouter's

  ```ts
  import {
    HttpMiddleware,
    HttpRouter,
    HttpServer,
    HttpServerResponse
  } from "@effect/platform"
  import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
  import { Effect, Layer } from "effect"

  // create your router Context.Tag
  class UserRouter extends HttpRouter.Tag("UserRouter")<UserRouter>() {}

  // create routes with the `.use` api.
  // There is also `.useScoped`
  const GetUsers = UserRouter.use((router) =>
    Effect.gen(function* () {
      yield* router.get("/", HttpServerResponse.text("got users"))
    })
  )

  const CreateUser = UserRouter.use((router) =>
    Effect.gen(function* () {
      yield* router.post("/", HttpServerResponse.text("created user"))
    })
  )

  const AllRoutes = Layer.mergeAll(GetUsers, CreateUser)

  const ServerLive = BunHttpServer.layer({ port: 3000 })

  // access the router with the `.router` api, to create your server
  const HttpLive = Layer.unwrapEffect(
    Effect.gen(function* () {
      return HttpServer.serve(yield* UserRouter.router, HttpMiddleware.logger)
    })
  ).pipe(
    Layer.provide(UserRouter.Live),
    Layer.provide(AllRoutes),
    Layer.provide(ServerLive)
  )

  BunRuntime.runMain(Layer.launch(HttpLive))
  ```

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a)]:
  - effect@3.4.1
  - @effect/schema@0.68.7

## 0.58.5

### Patch Changes

- [#3053](https://github.com/Effect-TS/effect/pull/3053) [`37a07a2`](https://github.com/Effect-TS/effect/commit/37a07a2d8d1ce09ab965c0ada84a3fae9a6aba05) Thanks @tim-smart! - coerce primitive types in UrlParams input

## 0.58.4

### Patch Changes

- [#3051](https://github.com/Effect-TS/effect/pull/3051) [`b77fb0a`](https://github.com/Effect-TS/effect/commit/b77fb0a811ec1ad0e794917077c9a90824515db8) Thanks @tim-smart! - add HttpMiddleware.cors

## 0.58.3

### Patch Changes

- Updated dependencies [[`530fa9e`](https://github.com/Effect-TS/effect/commit/530fa9e36b8532589b948fc4faa37593f36b7f42)]:
  - @effect/schema@0.68.6

## 0.58.2

### Patch Changes

- Updated dependencies [[`1d62815`](https://github.com/Effect-TS/effect/commit/1d62815a50f34115606940ffa397442d75a20c81)]:
  - @effect/schema@0.68.5

## 0.58.1

### Patch Changes

- [#3036](https://github.com/Effect-TS/effect/pull/3036) [`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973) Thanks @tim-smart! - add Socket.fromTransformStream

## 0.58.0

### Minor Changes

- [#2938](https://github.com/Effect-TS/effect/pull/2938) [`63dd0c3`](https://github.com/Effect-TS/effect/commit/63dd0c3af45876c1caad7d03356c74daf551c628) Thanks @tim-smart! - restructure platform http to use flattened modules

  Instead of using the previous re-exports, you now use the modules directly.

  Before:

  ```ts
  import { HttpClient } from "@effect/platform"

  HttpClient.request.get("/").pipe(HttpClient.client.fetchOk)
  ```

  After:

  ```ts
  import { HttpClient, HttpClientRequest } from "@effect/platform"

  HttpClientRequest.get("/").pipe(HttpClient.fetchOk)
  ```

### Patch Changes

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0
  - @effect/schema@0.68.4

## 0.57.8

### Patch Changes

- [#3030](https://github.com/Effect-TS/effect/pull/3030) [`3ba7ea1`](https://github.com/Effect-TS/effect/commit/3ba7ea1c3c2923e85bf2f17e41176f8f8796d203) Thanks @tim-smart! - update find-my-way-ts & multipasta

## 0.57.7

### Patch Changes

- Updated dependencies [[`d473800`](https://github.com/Effect-TS/effect/commit/d47380012c3241d7287b66968d33a2414275ce7b)]:
  - @effect/schema@0.68.3

## 0.57.6

### Patch Changes

- Updated dependencies [[`eb341b3`](https://github.com/Effect-TS/effect/commit/eb341b3eb34ad64499371bc08b7f59e429979d8a)]:
  - @effect/schema@0.68.2

## 0.57.5

### Patch Changes

- [#3021](https://github.com/Effect-TS/effect/pull/3021) [`b8ea6aa`](https://github.com/Effect-TS/effect/commit/b8ea6aa479006358042b4256ee0a1c5cfbe57acb) Thanks @tim-smart! - update find-my-way-ts to fix vercel edge support

## 0.57.4

### Patch Changes

- Updated dependencies [[`b51e266`](https://github.com/Effect-TS/effect/commit/b51e26662b879b55d2c5164b7c97742739aa9446), [`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7)]:
  - @effect/schema@0.68.1
  - effect@3.3.5

## 0.57.3

### Patch Changes

- Updated dependencies [[`f6c7977`](https://github.com/Effect-TS/effect/commit/f6c79772e632c440b7e5221bb75f0ef9d3c3b005), [`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352)]:
  - @effect/schema@0.68.0
  - effect@3.3.4

## 0.57.2

### Patch Changes

- Updated dependencies [[`3b15e1b`](https://github.com/Effect-TS/effect/commit/3b15e1b505c0b0e62a03b4a3605d42a9932cc99c), [`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad), [`3a750b2`](https://github.com/Effect-TS/effect/commit/3a750b25b1ed92094a7f7ebc332a6bcfb212871b), [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d)]:
  - @effect/schema@0.67.24
  - effect@3.3.3

## 0.57.1

### Patch Changes

- [#2988](https://github.com/Effect-TS/effect/pull/2988) [`07e12ec`](https://github.com/Effect-TS/effect/commit/07e12ecdb0e20b9763bd9e9058e567a7c8862efc) Thanks @tim-smart! - refactor Socket to use do notation

- Updated dependencies [[`2ee4f2b`](https://github.com/Effect-TS/effect/commit/2ee4f2be7fd63074a9cbac6dcdfb533b6683533a), [`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd), [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85), [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2), [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d), [`9b3b4ac`](https://github.com/Effect-TS/effect/commit/9b3b4ac639d98aae33883926bece1e31fa280d22)]:
  - @effect/schema@0.67.23
  - effect@3.3.2

## 0.57.0

### Minor Changes

- [#2966](https://github.com/Effect-TS/effect/pull/2966) [`4d3fbe8`](https://github.com/Effect-TS/effect/commit/4d3fbe82e8cec13ccd0cd0b2096deac6818fb59a) Thanks @tim-smart! - fix KeyValueStore for react native by making constructors lazy

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36), [`d79ca17`](https://github.com/Effect-TS/effect/commit/d79ca17d9fa432571c69714776cab5cf8fef9c34)]:
  - effect@3.3.1
  - @effect/schema@0.67.22

## 0.56.0

### Minor Changes

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`2b9ddfc`](https://github.com/Effect-TS/effect/commit/2b9ddfcbac505d98551e764a43923854907ca5c1) Thanks @tim-smart! - support new Pool options in /platform WorkerPool

- [#2837](https://github.com/Effect-TS/effect/pull/2837) [`188f0a5`](https://github.com/Effect-TS/effect/commit/188f0a5c57ed0d7c9e5852e0c1c998f1b95810a1) Thanks @tim-smart! - parse URL instances when creating client requests

### Patch Changes

- Updated dependencies [[`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - effect@3.3.0
  - @effect/schema@0.67.21

## 0.55.7

### Patch Changes

- [#2931](https://github.com/Effect-TS/effect/pull/2931) [`a67d602`](https://github.com/Effect-TS/effect/commit/a67d60276f96cd20b76145b4cee13efca6c6158a) Thanks @tim-smart! - ensure pre-response handler is checked after running the user-provided http app

- Updated dependencies [[`4c6bc7f`](https://github.com/Effect-TS/effect/commit/4c6bc7f190c142dc9db70b365a2bf30715a98e62)]:
  - @effect/schema@0.67.20

## 0.55.6

### Patch Changes

- [#2903](https://github.com/Effect-TS/effect/pull/2903) [`799aa20`](https://github.com/Effect-TS/effect/commit/799aa20b4f618736ba33a5297fda90a75d4c26c6) Thanks @rocwang! - # Make baseUrl() more defensive in @effect/platform

  Sometimes, third party code may patch a missing global `location` to accommodate for non-browser JavaScript
  runtimes, e.g. Cloudflare Workers,
  Deno. [Such patch](https://github.com/jamsinclair/jSquash/pull/21/files#diff-322ca97cdcdd0d3b85c20a7d5cac703a2f9f3766fc762f98b9f6a9d4c5063ca3R21-R23)
  might not yield a fully valid `location`. This could
  break `baseUrl()`, which is called by `makeUrl()`.

  For example, the following code would log `Invalid URL: '/api/v1/users' with base 'NaN'`.

  ```js
  import { makeUrl } from "@effect/platform/Http/UrlParams"

  globalThis.location = { href: "" }

  const url = makeUrl("/api/v1/users", [])

  // This would log "Invalid URL: '/api/v1/users' with base 'NaN'",
  // because location.origin + location.pathname return NaN in baseUrl()
  console.log(url.left.message)
  ```

  Arguably, this is not an issue of Effect per se, but it's better to be defensive and handle such cases gracefully.
  So this change does that by checking if `location.orign` and `location.pathname` are available before accessing them.

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`cd7496b`](https://github.com/Effect-TS/effect/commit/cd7496ba214eabac2e3c297f513fcbd5b11f0e91), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa), [`349a036`](https://github.com/Effect-TS/effect/commit/349a036ffb08351481c060655660a6ccf26473de)]:
  - effect@3.2.9
  - @effect/schema@0.67.19

## 0.55.5

### Patch Changes

- Updated dependencies [[`a0dd1c1`](https://github.com/Effect-TS/effect/commit/a0dd1c1ede2a1e856ecb0e67826ec992016fef97)]:
  - @effect/schema@0.67.18

## 0.55.4

### Patch Changes

- Updated dependencies [[`d9d22e7`](https://github.com/Effect-TS/effect/commit/d9d22e7c4d5e31d5b46644c729b027796e467c16), [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a), [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a), [`7d6d875`](https://github.com/Effect-TS/effect/commit/7d6d8750077d9c8379f37240745240d7f3b7a4f8), [`70cda70`](https://github.com/Effect-TS/effect/commit/70cda704e8e31c80737b95121c8199e726ea132f), [`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - @effect/schema@0.67.17
  - effect@3.2.8

## 0.55.3

### Patch Changes

- Updated dependencies [[`5745886`](https://github.com/Effect-TS/effect/commit/57458869859943410221ccc87f8cecfba7c79d92), [`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - @effect/schema@0.67.16
  - effect@3.2.7

## 0.55.2

### Patch Changes

- [#2737](https://github.com/Effect-TS/effect/pull/2737) [`2c2280b`](https://github.com/Effect-TS/effect/commit/2c2280b98a11fc002663c55792a4fa5781cd5fb6) Thanks @jessekelly881! - added KeyValueStore.layerStorage to wrap instances of the `Storage` type.

- Updated dependencies [[`e2740fc`](https://github.com/Effect-TS/effect/commit/e2740fc4e212ba85a90541e8c8d85b0bcd5c2e7c), [`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba), [`60fe3d5`](https://github.com/Effect-TS/effect/commit/60fe3d5fb2be168dd35c6d0cb8ac8f55deb30fc0)]:
  - @effect/schema@0.67.15
  - effect@3.2.6

## 0.55.1

### Patch Changes

- Updated dependencies [[`c5846e9`](https://github.com/Effect-TS/effect/commit/c5846e99137e9eb02efd31865e26f49f0d2c7c03)]:
  - @effect/schema@0.67.14

## 0.55.0

### Minor Changes

- [#2835](https://github.com/Effect-TS/effect/pull/2835) [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9) Thanks @tim-smart! - remove pool resizing in platform workers to enable concurrent access

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0)]:
  - effect@3.2.5
  - @effect/schema@0.67.13

## 0.54.0

### Minor Changes

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3) Thanks @tim-smart! - remove `permits` from workers, to prevent issues with pool resizing

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`c07e0ce`](https://github.com/Effect-TS/effect/commit/c07e0cea8ce165887e2c9dfa5d669eba9b2fb798) Thanks @gcanti! - Revise the ordering of type parameters within the `SchemaStore` interface to enhance consistency

### Patch Changes

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3) Thanks @tim-smart! - ensure worker pool construction errors are reported during creation

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`f8038ca`](https://github.com/Effect-TS/effect/commit/f8038cadd5f50d397469e5fdbc70dd8f69671f50), [`e376641`](https://github.com/Effect-TS/effect/commit/e3766411b60ebb45d31e9c9d94efa099121d4d58), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d)]:
  - effect@3.2.4
  - @effect/schema@0.67.12

## 0.53.14

### Patch Changes

- Updated dependencies [[`5af633e`](https://github.com/Effect-TS/effect/commit/5af633eb5ff6560a64d87263d1692bb9c75f7b3c), [`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - @effect/schema@0.67.11
  - effect@3.2.3

## 0.53.13

### Patch Changes

- [#2784](https://github.com/Effect-TS/effect/pull/2784) [`c1eaef9`](https://github.com/Effect-TS/effect/commit/c1eaef910420dae416923d172ee58d219e921d0f) Thanks @gcanti! - Update the definition of `Handler` to utilize `App.Default`

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2), [`78ffc27`](https://github.com/Effect-TS/effect/commit/78ffc27ee3fa708433c25fa118c53d38d90d08bc)]:
  - effect@3.2.2
  - @effect/schema@0.67.10

## 0.53.12

### Patch Changes

- Updated dependencies [[`5432fff`](https://github.com/Effect-TS/effect/commit/5432fff7c9a69d43910426c1053ebfc3b73ebed6)]:
  - @effect/schema@0.67.9

## 0.53.11

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1
  - @effect/schema@0.67.8

## 0.53.10

### Patch Changes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2) Thanks [@tim-smart](https://github.com/tim-smart)! - Run client request stream with a current runtime.

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - capture stack trace for tracing spans

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0
  - @effect/schema@0.67.7

## 0.53.9

### Patch Changes

- [#2761](https://github.com/Effect-TS/effect/pull/2761) [`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - Add `{ once: true }` to all `"abort"` event listeners for `AbortController` to automatically remove handlers after execution

- Updated dependencies [[`17da864`](https://github.com/Effect-TS/effect/commit/17da864e4a6f80becdb82db7dece2ba583bfdda3), [`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e), [`ff0efa0`](https://github.com/Effect-TS/effect/commit/ff0efa0a1415a41d4a4312a16cf7a63def86db3f)]:
  - @effect/schema@0.67.6
  - effect@3.1.6

## 0.53.8

### Patch Changes

- Updated dependencies [[`9c514de`](https://github.com/Effect-TS/effect/commit/9c514de28152696edff008324d2d7e67d55afd56)]:
  - @effect/schema@0.67.5

## 0.53.7

### Patch Changes

- Updated dependencies [[`ee08593`](https://github.com/Effect-TS/effect/commit/ee0859398ecc2589cab0d017bef6a17e00c34dfd), [`da6d7d8`](https://github.com/Effect-TS/effect/commit/da6d7d845246e9d04631d64fa7694944b6010d09)]:
  - @effect/schema@0.67.4

## 0.53.6

### Patch Changes

- [#2750](https://github.com/Effect-TS/effect/pull/2750) [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610) Thanks [@tim-smart](https://github.com/tim-smart)! - fix memory leak in Socket's

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - effect@3.1.5
  - @effect/schema@0.67.3

## 0.53.5

### Patch Changes

- Updated dependencies [[`89a3afb`](https://github.com/Effect-TS/effect/commit/89a3afbe191c83b84b17bfaa95519aff0749afbe), [`992c8e2`](https://github.com/Effect-TS/effect/commit/992c8e21535db9f0c66e81d32fee8af56a96274f)]:
  - @effect/schema@0.67.2

## 0.53.4

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4
  - @effect/schema@0.67.1

## 0.53.3

### Patch Changes

- Updated dependencies [[`d7e4997`](https://github.com/Effect-TS/effect/commit/d7e49971fe97b7ee5fb7991f3f5ac4d627a26338)]:
  - @effect/schema@0.67.0

## 0.53.2

### Patch Changes

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3
  - @effect/schema@0.66.16

## 0.53.1

### Patch Changes

- Updated dependencies [[`121d6d9`](https://github.com/Effect-TS/effect/commit/121d6d93755138c7510ba3ab4f0019ec0cb91890)]:
  - @effect/schema@0.66.15

## 0.53.0

### Minor Changes

- [#2703](https://github.com/Effect-TS/effect/pull/2703) [`d57fbbb`](https://github.com/Effect-TS/effect/commit/d57fbbbd6c466936213a671fc3cd2390064f864e) Thanks [@tim-smart](https://github.com/tim-smart)! - replace isows with WebSocketConstructor service in @effect/platform/Socket

  You now have to provide a WebSocketConstructor implementation to the `Socket.makeWebSocket` api.

  ```ts
  import * as Socket from "@effect/platform/Socket"
  import * as NodeSocket from "@effect/platform-node/NodeSocket"
  import { Effect } from "effect"

  Socket.makeWebSocket("ws://localhost:8080").pipe(
    Effect.provide(NodeSocket.layerWebSocketConstructor) // use "ws" npm package
  )
  ```

## 0.52.3

### Patch Changes

- [#2698](https://github.com/Effect-TS/effect/pull/2698) [`5866c62`](https://github.com/Effect-TS/effect/commit/5866c621d7eb4cc84e4ba972bfdfd219734cd45d) Thanks [@tim-smart](https://github.com/tim-smart)! - fix http ServerResponse cookie apis

## 0.52.2

### Patch Changes

- [#2679](https://github.com/Effect-TS/effect/pull/2679) [`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all type ids are annotated with `unique symbol`

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - effect@3.1.2
  - @effect/schema@0.66.14

## 0.52.1

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1
  - @effect/schema@0.66.13

## 0.52.0

### Minor Changes

- [#2669](https://github.com/Effect-TS/effect/pull/2669) [`9deab0a`](https://github.com/Effect-TS/effect/commit/9deab0aec9e99501f9441843e34df9afa10c5be9) Thanks [@tim-smart](https://github.com/tim-smart)! - move http search params apis to ServerRequest module

  If you want to access the search params for a request, you can now use the `Http.request.ParsedSearchParams` tag.

  ```ts
  import * as Http from "@effect/platform/HttpServer"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const searchParams = yield* Http.request.ParsedSearchParams
    console.log(searchParams)
  })
  ```

  The schema method has also been moved to the `ServerRequest` module. It is now available as `Http.request.schemaSearchParams`.

### Patch Changes

- [#2672](https://github.com/Effect-TS/effect/pull/2672) [`7719b8a`](https://github.com/Effect-TS/effect/commit/7719b8a7350c14e952ffe685bfd5308773b3e271) Thanks [@tim-smart](https://github.com/tim-smart)! - allow http client trace propagation to be controlled

  To disable trace propagation:

  ```ts
  import { HttpClient as Http } from "@effect/platform"

  Http.request
    .get("https://example.com")
    .pipe(Http.client.fetchOk, Http.client.withTracerPropagation(false))
  ```

## 0.51.0

### Minor Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`0ec93cb`](https://github.com/Effect-TS/effect/commit/0ec93cb4f166e7401c171c2f8e8276ce958d9a57) Thanks [@github-actions](https://github.com/apps/github-actions)! - \* capitalised Http.multipart.FileSchema and Http.multipart.FilesSchema
  - exported Http.multipart.FileSchema
  - added Http.multipart.SingleFileSchema

### Patch Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85) Thanks [@github-actions](https://github.com/apps/github-actions)! - set span `kind` where applicable

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0
  - @effect/schema@0.66.12

## 0.50.8

### Patch Changes

- [#2650](https://github.com/Effect-TS/effect/pull/2650) [`16039a0`](https://github.com/Effect-TS/effect/commit/16039a08f04f11545e2fdf40952788a8f9cef04f) Thanks [@tim-smart](https://github.com/tim-smart)! - improve error messages for Http.client.filterStatus\*

- [#2648](https://github.com/Effect-TS/effect/pull/2648) [`d1d33e1`](https://github.com/Effect-TS/effect/commit/d1d33e10b25109f44b5ab1c6e4d778a59c0d3eeb) Thanks [@floydspace](https://github.com/floydspace)! - Fixed import path for type import.

- Updated dependencies [[`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - effect@3.0.8
  - @effect/schema@0.66.11

## 0.50.7

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7
  - @effect/schema@0.66.10

## 0.50.6

### Patch Changes

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`8206529`](https://github.com/Effect-TS/effect/commit/8206529d6a7bbf3e3c6f670afb0381e83176736e)]:
  - effect@3.0.6
  - @effect/schema@0.66.9

## 0.50.5

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5
  - @effect/schema@0.66.8

## 0.50.4

### Patch Changes

- Updated dependencies [[`dd41c6c`](https://github.com/Effect-TS/effect/commit/dd41c6c725b1c1c980683275d8fa69779902187e), [`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - @effect/schema@0.66.7
  - effect@3.0.4

## 0.50.3

### Patch Changes

- [#2589](https://github.com/Effect-TS/effect/pull/2589) [`b3b51a2`](https://github.com/Effect-TS/effect/commit/b3b51a2ea0c6ab92a363db46ebaa7e1176d089f5) Thanks [@tim-smart](https://github.com/tim-smart)! - redact some common sensitive http headers names in traces

- Updated dependencies [[`9dfc156`](https://github.com/Effect-TS/effect/commit/9dfc156dc13fb4da9c777aae3acece4b5ecf0064), [`80271bd`](https://github.com/Effect-TS/effect/commit/80271bdc648e9efa659ce66b2c255754a6a1a8b0), [`e4ba97d`](https://github.com/Effect-TS/effect/commit/e4ba97d060c16bdf4e3b5bd5db6777f121a6768c)]:
  - @effect/schema@0.66.6

## 0.50.2

### Patch Changes

- Updated dependencies [[`b3fe829`](https://github.com/Effect-TS/effect/commit/b3fe829e8b12726afe94086b5375968f41a26411), [`a58b7de`](https://github.com/Effect-TS/effect/commit/a58b7deb8bb1d3b0dd636decf5d16f115f37eb72), [`d90e8c3`](https://github.com/Effect-TS/effect/commit/d90e8c3090cbc78e2bc7b51c974df66ffefacdfa)]:
  - @effect/schema@0.66.5

## 0.50.1

### Patch Changes

- Updated dependencies [[`773b8e0`](https://github.com/Effect-TS/effect/commit/773b8e01521e8fa7c38ff15d92d21d6fd6dad56f)]:
  - @effect/schema@0.66.4

## 0.50.0

### Minor Changes

- [#2567](https://github.com/Effect-TS/effect/pull/2567) [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6) Thanks [@tim-smart](https://github.com/tim-smart)! - add URL & AbortSignal to Http.client.makeDefault

### Patch Changes

- [#2567](https://github.com/Effect-TS/effect/pull/2567) [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6) Thanks [@tim-smart](https://github.com/tim-smart)! - add more span attributes to http traces

- [#2565](https://github.com/Effect-TS/effect/pull/2565) [`a3b0e6c`](https://github.com/Effect-TS/effect/commit/a3b0e6c490772e6d44b5d98dcf2729c4d5310ecc) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.response.void helper, for creating a http request that returns void

- Updated dependencies [[`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e)]:
  - effect@3.0.3
  - @effect/schema@0.66.3

## 0.49.4

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - effect@3.0.2
  - @effect/schema@0.66.2

## 0.49.3

### Patch Changes

- [#2558](https://github.com/Effect-TS/effect/pull/2558) [`8d39d65`](https://github.com/Effect-TS/effect/commit/8d39d6554af548228ad767112ce2e0b1f68fa8e1) Thanks [@tim-smart](https://github.com/tim-smart)! - add no-op FileSystem constructor for testing

## 0.49.2

### Patch Changes

- [#2556](https://github.com/Effect-TS/effect/pull/2556) [`5ef0a1a`](https://github.com/Effect-TS/effect/commit/5ef0a1ae9b773fa2481550cb0d43ff7a0e03cd44) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Command stdin being closed too early

## 0.49.1

### Patch Changes

- [#2542](https://github.com/Effect-TS/effect/pull/2542) [`87c5687`](https://github.com/Effect-TS/effect/commit/87c5687de0782dab177b7861217fa3b040046282) Thanks [@tim-smart](https://github.com/tim-smart)! - allow fs.watch backend to be customized

  If you want to use the @parcel/watcher backend, you now need to provide it to
  your effects.

  ```ts
  import { Layer } from "effect"
  import { FileSystem } from "@effect/platform"
  import { NodeFileSystem } from "@effect/platform-node"
  import * as ParcelWatcher from "@effect/platform-node/NodeFileSystem/ParcelWatcher"

  // create a Layer that uses the ParcelWatcher backend
  NodeFileSystem.layer.pipe(Layer.provide(ParcelWatcher.layer))
  ```

- [#2555](https://github.com/Effect-TS/effect/pull/2555) [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent use of `Array` as import name to solve bundler issues

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`b2b5d66`](https://github.com/Effect-TS/effect/commit/b2b5d6626b18eb5289f364ffab5240e84b04d085), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1
  - @effect/schema@0.66.1

## 0.49.0

### Minor Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4) Thanks [@github-actions](https://github.com/apps/github-actions)! - make Http.middleware.withTracerDisabledWhen a Layer api

  And add Http.middleware.withTracerDisabledWhenEffect to operate on Effect's.

  Usage is now:

  ```ts
  import * as Http from "@effect/platform/HttpServer"

  Http.router.empty.pipe(
    Http.router.get("/health"),
    Http.server.serve(),
    Http.middleware.withTracerDisabledWhen(
      (request) => request.url === "/no-tracing"
    )
  )
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type parameters in /platform data types

  A codemod has been released to make migration easier:

  ```
  npx @effect/codemod platform-0.49 src/**/*
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769) Thanks [@github-actions](https://github.com/apps/github-actions)! - rename auto-scoped ClientResponse apis from *Effect to *Scoped

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1) Thanks [@github-actions](https://github.com/apps/github-actions)! - replace use of `unit` terminology with `void`

  For all the data types.

  ```ts
  Effect.unit // => Effect.void
  Stream.unit // => Stream.void

  // etc
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769) Thanks [@github-actions](https://github.com/apps/github-actions)! - move fetch options to a FiberRef

  This change makes adjusting options to fetch more composable. You can now do:

  ```ts
  import { pipe } from "effect"
  import * as Http from "@effect/platform/HttpClient"

  pipe(
    Http.request.get("https://example.com"),
    Http.client.fetchOk,
    Http.client.withFetchOptions({ credentials: "include" }),
    Http.response.text
  )
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Patch Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`6460414`](https://github.com/Effect-TS/effect/commit/6460414351a45fb8e0a457c63f3653422efee766) Thanks [@github-actions](https://github.com/apps/github-actions)! - properly handle multiple ports in SharedWorker

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4) Thanks [@github-actions](https://github.com/apps/github-actions)! - add Http.middleware.withTracerDisabledForUrls

  Allows you to disable the http server tracer for the given urls:

  ```ts
  import * as Http from "@effect/platform/HttpServer"

  Http.router.empty.pipe(
    Http.router.get("/health"),
    Http.server.serve(),
    Http.middleware.withTracerDisabledForUrls(["/health"])
  )
  ```

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- [#2514](https://github.com/Effect-TS/effect/pull/2514) [`25d74f8`](https://github.com/Effect-TS/effect/commit/25d74f8c4d2dd4a9e5ec57ce2f20d36dedd25343) Thanks [@rocwang](https://github.com/rocwang)! - Fix UrlParams.makeUrl when globalThis.location is set to `undefined`

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9aeae46`](https://github.com/Effect-TS/effect/commit/9aeae461fdf9265389cf3dfe4e428b037215ba5f), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`e542371`](https://github.com/Effect-TS/effect/commit/e542371981f8b4b484979feaad8a25b1f45e2df0), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0
  - @effect/schema@0.66.0

## 0.48.29

### Patch Changes

- [#2517](https://github.com/Effect-TS/effect/pull/2517) [`b79cc59`](https://github.com/Effect-TS/effect/commit/b79cc59dbe64b9a0a7742dc9100a9d36c8e46b72) Thanks [@tim-smart](https://github.com/tim-smart)! - add uninterruptible option to http routes, for marking a route as uninterruptible

## 0.48.28

### Patch Changes

- [#2515](https://github.com/Effect-TS/effect/pull/2515) [`d590094`](https://github.com/Effect-TS/effect/commit/d5900943489ec1e0891836aeafb5ce99fb9c75c7) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.router.uninterruptible, for marking a route as uninterruptible

- Updated dependencies [[`0aee906`](https://github.com/Effect-TS/effect/commit/0aee906f034539344db6fbac08919de3e28eccde), [`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871), [`4c37001`](https://github.com/Effect-TS/effect/commit/4c370013417e18c4f564818de1341a8fccb43b4c), [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b), [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c), [`8a69b4e`](https://github.com/Effect-TS/effect/commit/8a69b4ef6a3a06d2e21fe2e11a626038beefb4e1), [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9), [`b3acf47`](https://github.com/Effect-TS/effect/commit/b3acf47f9c9dfae1c99377aa906097aaa2d47d44), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9), [`0d3231a`](https://github.com/Effect-TS/effect/commit/0d3231a195202635ecc0bf6bbf6a08fc017d0d69), [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`c22b019`](https://github.com/Effect-TS/effect/commit/c22b019e5eaf9d3a937a3d99cadbb8f8e9116a70), [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1), [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212)]:
  - @effect/schema@0.65.0
  - effect@2.4.19

## 0.48.27

### Patch Changes

- [#2479](https://github.com/Effect-TS/effect/pull/2479) [`c6dd3c6`](https://github.com/Effect-TS/effect/commit/c6dd3c6909cafe05adc8450c5a499260e17e60d3) Thanks [@tim-smart](https://github.com/tim-smart)! - Make the file tree provider the fallback in PlatformConfigProvider.layerFileTreeAdd

- [#2486](https://github.com/Effect-TS/effect/pull/2486) [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d) Thanks [@tim-smart](https://github.com/tim-smart)! - accept string as a valid Socket input

- [#2486](https://github.com/Effect-TS/effect/pull/2486) [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Socket.runRaw to handle strings directly

- Updated dependencies [[`42b3651`](https://github.com/Effect-TS/effect/commit/42b36519f356bae9258a1ea1d416e2902b973e85)]:
  - @effect/schema@0.64.20

## 0.48.26

### Patch Changes

- [#2477](https://github.com/Effect-TS/effect/pull/2477) [`365a486`](https://github.com/Effect-TS/effect/commit/365a4865de5e47ce09f4cfd51fc0f67438f82a57) Thanks [@tim-smart](https://github.com/tim-smart)! - add PlatformConfigProvider module

  It contains a file tree provider, that can be used to read config values from a file tree.

  For example, if you have a file tree like this:

  ```
  config/
    secret
    nested/
      value
  ```

  You could do the following:

  ```ts
  import { PlatformConfigProvider } from "@effect/platform"
  import { NodeContext } from "@effect/platform-node"
  import { Config, Effect, Layer } from "effect"

  const ConfigProviderLive = PlatformConfigProvider.layerFileTree({
    rootDirectory: `/config`
  }).pipe(Layer.provide(NodeContext.layer))

  Effect.gen(function* (_) {
    const secret = yield* _(Config.secret("secret"))
    const value = yield* _(Config.string("value"), Config.nested("nested"))
  }).pipe(Effect.provide(ConfigProviderLive))
  ```

## 0.48.25

### Patch Changes

- [#2469](https://github.com/Effect-TS/effect/pull/2469) [`d209171`](https://github.com/Effect-TS/effect/commit/d2091714a786820ebae4bef04a9d67d25dd08e88) Thanks [@tim-smart](https://github.com/tim-smart)! - replace isomorphic-ws with isows

- Updated dependencies [[`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594), [`58f66fe`](https://github.com/Effect-TS/effect/commit/58f66fecd4e646c6c8f10995df9faab17022eb8f), [`3cad21d`](https://github.com/Effect-TS/effect/commit/3cad21daa5d2332d33692498c87b7ffff979e304)]:
  - effect@2.4.18
  - @effect/schema@0.64.19

## 0.48.24

### Patch Changes

- [#2427](https://github.com/Effect-TS/effect/pull/2427) [`9c6a500`](https://github.com/Effect-TS/effect/commit/9c6a5001b467b6255c68a922f4b6e8d692b63d01) Thanks [@devmatteini](https://github.com/devmatteini)! - add force option to FileSystem.remove

- [#2463](https://github.com/Effect-TS/effect/pull/2463) [`35ad0ba`](https://github.com/Effect-TS/effect/commit/35ad0ba9f3ba27c60453620e514b980f819f92af) Thanks [@tim-smart](https://github.com/tim-smart)! - fix exact optional properties type errors

- Updated dependencies [[`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f)]:
  - effect@2.4.17
  - @effect/schema@0.64.18

## 0.48.23

### Patch Changes

- [#2445](https://github.com/Effect-TS/effect/pull/2445) [`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2) Thanks [@vecerek](https://github.com/vecerek)! - Add support for W3C Trace Context propagation

- [#2454](https://github.com/Effect-TS/effect/pull/2454) [`63a1df2`](https://github.com/Effect-TS/effect/commit/63a1df2e4de3766f48f15676fbd0360ab9c27816) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for binary data with XHR client

- [#2450](https://github.com/Effect-TS/effect/pull/2450) [`74a5dae`](https://github.com/Effect-TS/effect/commit/74a5daed0e65b32a36e026bfcf66d02269cb967a) Thanks [@vecerek](https://github.com/vecerek)! - Platform: auto-instrument HTTP client

- Updated dependencies [[`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2), [`62a7f23`](https://github.com/Effect-TS/effect/commit/62a7f23937c0dfaca67a7b2f055b85cfde25ed11), [`7cc2b41`](https://github.com/Effect-TS/effect/commit/7cc2b41d6c551fdca2590b06681c5ad9832aba46), [`8b46fde`](https://github.com/Effect-TS/effect/commit/8b46fdebf2c075a74cd2cd29dfb69531d20fc154)]:
  - effect@2.4.16
  - @effect/schema@0.64.17

## 0.48.22

### Patch Changes

- Updated dependencies [[`a31917a`](https://github.com/Effect-TS/effect/commit/a31917aa4b05b1189b7a8e0bedb60bb3d49262ad), [`4cd2bed`](https://github.com/Effect-TS/effect/commit/4cd2bedf978f864bddd289d1c524c8e868bf587b), [`6cc6267`](https://github.com/Effect-TS/effect/commit/6cc6267026d9bfb1a9882cddf534787327e86ec1)]:
  - @effect/schema@0.64.16

## 0.48.21

### Patch Changes

- Updated dependencies [[`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546), [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a), [`5ded019`](https://github.com/Effect-TS/effect/commit/5ded019970169e3c1f2a375d0876b95fb1ff67f5)]:
  - effect@2.4.15
  - @effect/schema@0.64.15

## 0.48.20

### Patch Changes

- [#2413](https://github.com/Effect-TS/effect/pull/2413) [`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7) Thanks [@tim-smart](https://github.com/tim-smart)! - make /platform ClientRequest implement Effect

  ClientRequest now implements `Effect<ClientResponse, HttpClientError, Client.Default | Scope>`

  This makes it easier to quickly create a request and execute it in a single line.

  ```ts
  import * as Http from "@effect/platform/HttpClient"

  Http.request
    .get("https://jsonplaceholder.typicode.com/todos/1")
    .pipe(Http.response.json)
  ```

- [#2413](https://github.com/Effect-TS/effect/pull/2413) [`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent unhandled errors in undici http client

## 0.48.19

### Patch Changes

- [#2411](https://github.com/Effect-TS/effect/pull/2411) [`fb7285e`](https://github.com/Effect-TS/effect/commit/fb7285e8d6a70527df7137a6a3efdd03ae61cb8b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix broken imports in /platform

## 0.48.18

### Patch Changes

- [#2410](https://github.com/Effect-TS/effect/pull/2410) [`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334) Thanks [@tim-smart](https://github.com/tim-smart)! - add undici http client to @effect/platform-node

- Updated dependencies [[`a76e5e1`](https://github.com/Effect-TS/effect/commit/a76e5e131a35c88a72771fb745df08f60fbc0e18), [`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa)]:
  - @effect/schema@0.64.14
  - effect@2.4.14

## 0.48.17

### Patch Changes

- [#2400](https://github.com/Effect-TS/effect/pull/2400) [`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Schema ParseOptions in /platform schema apis

- [#2403](https://github.com/Effect-TS/effect/pull/2403) [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3) Thanks [@tim-smart](https://github.com/tim-smart)! - use ReadonlyRecord for storing cookies

- [#2403](https://github.com/Effect-TS/effect/pull/2403) [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3) Thanks [@tim-smart](https://github.com/tim-smart)! - add set-cookie headers in Http.response.toWeb

- [#2400](https://github.com/Effect-TS/effect/pull/2400) [`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe) Thanks [@tim-smart](https://github.com/tim-smart)! - add .schemaJson / .schemaNoBody to http router apis

- Updated dependencies [[`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499)]:
  - effect@2.4.13
  - @effect/schema@0.64.13

## 0.48.16

### Patch Changes

- [#2387](https://github.com/Effect-TS/effect/pull/2387) [`75a8d16`](https://github.com/Effect-TS/effect/commit/75a8d16247cc14860cdd7fd948ef542c50c2d55e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cookies module to /platform http

  To add cookies to a http response:

  ```ts
  import * as Http from "@effect/platform/HttpServer"

  Http.response.empty().pipe(
    Http.response.setCookies([
      ["name", "value"],
      ["foo", "bar", { httpOnly: true }]
    ])
  )
  ```

  You can also use cookies with the http client:

  ```ts
  import * as Http from "@effect/platform/HttpClient"
  import { Effect, Ref } from "effect"

  Effect.gen(function* (_) {
    const ref = yield* _(Ref.make(Http.cookies.empty))
    const defaultClient = yield* _(Http.client.Client)
    const clientWithCookies = defaultClient.pipe(
      Http.client.withCookiesRef(ref),
      Http.client.filterStatusOk
    )

    // cookies will be stored in the ref and sent in any subsequent requests
    yield* _(
      Http.request.get("https://www.google.com/"),
      clientWithCookies,
      Effect.scoped
    )
  })
  ```

- [#2385](https://github.com/Effect-TS/effect/pull/2385) [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87) Thanks [@tim-smart](https://github.com/tim-smart)! - update typescript to 5.4

- Updated dependencies [[`9392de6`](https://github.com/Effect-TS/effect/commit/9392de6baa6861662abc2bd3171897145f5ea073), [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87), [`9392de6`](https://github.com/Effect-TS/effect/commit/9392de6baa6861662abc2bd3171897145f5ea073), [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87), [`d17a427`](https://github.com/Effect-TS/effect/commit/d17a427c4427972fb55c45a058780716dc408631)]:
  - @effect/schema@0.64.12
  - effect@2.4.12

## 0.48.15

### Patch Changes

- Updated dependencies [[`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8), [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5), [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60)]:
  - effect@2.4.11
  - @effect/schema@0.64.11

## 0.48.14

### Patch Changes

- Updated dependencies [[`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a), [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968)]:
  - effect@2.4.10
  - @effect/schema@0.64.10

## 0.48.13

### Patch Changes

- Updated dependencies [[`dc7e497`](https://github.com/Effect-TS/effect/commit/dc7e49720df416870a7483f48adc40aeb23fe32d), [`ffaf7c3`](https://github.com/Effect-TS/effect/commit/ffaf7c36514f88496cdd2fdfdf0bc7ba5a2e5cd4)]:
  - @effect/schema@0.64.9

## 0.48.12

### Patch Changes

- Updated dependencies [[`e0af20e`](https://github.com/Effect-TS/effect/commit/e0af20ec5f6d0b19d66c5ebf610969d55bfc6c22)]:
  - @effect/schema@0.64.8

## 0.48.11

### Patch Changes

- [#2360](https://github.com/Effect-TS/effect/pull/2360) [`0f6c7b4`](https://github.com/Effect-TS/effect/commit/0f6c7b426eb3432f60e3a17f8cd92ceac91597bf) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for watching single files

## 0.48.10

### Patch Changes

- [#2357](https://github.com/Effect-TS/effect/pull/2357) [`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99) Thanks [@tim-smart](https://github.com/tim-smart)! - make more data types in /platform implement Inspectable

- Updated dependencies [[`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99)]:
  - effect@2.4.9
  - @effect/schema@0.64.7

## 0.48.9

### Patch Changes

- Updated dependencies [[`595140a`](https://github.com/Effect-TS/effect/commit/595140a13bda09bf22c669196440868e8a274599), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566), [`7a45ad0`](https://github.com/Effect-TS/effect/commit/7a45ad0a5f715d64a69b28a8ee3573e5f86909c3), [`5c3b1cc`](https://github.com/Effect-TS/effect/commit/5c3b1ccba182d0f636a973729f9c6bfb12539dc8), [`6f7dfc9`](https://github.com/Effect-TS/effect/commit/6f7dfc9637bd641beb93b14e027dcfcb5d2c8feb), [`88b8583`](https://github.com/Effect-TS/effect/commit/88b85838e03d4f33036f9d16c9c00a487fa99bd8), [`cb20824`](https://github.com/Effect-TS/effect/commit/cb20824416cbf251188395d0aad3622e3a5d7ff2), [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb), [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0), [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9), [`a45a525`](https://github.com/Effect-TS/effect/commit/a45a525e7ccf07704dff1666f1e390282b5bac91)]:
  - @effect/schema@0.64.6
  - effect@2.4.8

## 0.48.8

### Patch Changes

- [#2334](https://github.com/Effect-TS/effect/pull/2334) [`69d27bb`](https://github.com/Effect-TS/effect/commit/69d27bb633884b6b50f9c3d9e95c29f09b4860b5) Thanks [@tim-smart](https://github.com/tim-smart)! - add .watch method to /platform FileSystem

  It can be used to listen for file system events. Example:

  ```ts
  import { FileSystem } from "@effect/platform"
  import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
  import { Console, Effect, Stream } from "effect"

  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem)
    yield* _(fs.watch("./"), Stream.runForEach(Console.log))
  }).pipe(Effect.provide(NodeFileSystem.layer), NodeRuntime.runMain)
  ```

- Updated dependencies [[`d0f56c6`](https://github.com/Effect-TS/effect/commit/d0f56c68e604b1cf8dd4e761a3f3cf3631b3cec1)]:
  - @effect/schema@0.64.5

## 0.48.7

### Patch Changes

- [#2330](https://github.com/Effect-TS/effect/pull/2330) [`f908948`](https://github.com/Effect-TS/effect/commit/f908948fd05771a670c0b746e2dd9caa9408ef83) Thanks [@tim-smart](https://github.com/tim-smart)! - use Deferred.unsafeDone for websocket onclose + onerror

## 0.48.6

### Patch Changes

- Updated dependencies [[`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6)]:
  - effect@2.4.7
  - @effect/schema@0.64.4

## 0.48.5

### Patch Changes

- [#2325](https://github.com/Effect-TS/effect/pull/2325) [`e006e4a`](https://github.com/Effect-TS/effect/commit/e006e4a538c97bae6ca1efa74802159e8a688fcb) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure Socket fibers are interruptible

## 0.48.4

### Patch Changes

- Updated dependencies [[`cfef6ec`](https://github.com/Effect-TS/effect/commit/cfef6ecd1fe801cec1a3cbfb7f064fc394b0ad73)]:
  - @effect/schema@0.64.3

## 0.48.3

### Patch Changes

- [#2314](https://github.com/Effect-TS/effect/pull/2314) [`c362e06`](https://github.com/Effect-TS/effect/commit/c362e066550252d5a9fcbc31a4b34d0e17c50699) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent unhandled fiber errors in Sockets

- [#2262](https://github.com/Effect-TS/effect/pull/2262) [`83ddd6f`](https://github.com/Effect-TS/effect/commit/83ddd6f41029724b2cbd144cf309463967ed1164) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Don't log an empty message when responding to a request

## 0.48.2

### Patch Changes

- [#2290](https://github.com/Effect-TS/effect/pull/2290) [`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove function renaming from internals, introduce new cutpoint strategy

- Updated dependencies [[`89748c9`](https://github.com/Effect-TS/effect/commit/89748c90b36cb5eb880a9ab9323b252338dee848), [`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be), [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f)]:
  - @effect/schema@0.64.2
  - effect@2.4.6

## 0.48.1

### Patch Changes

- Updated dependencies [[`d10f876`](https://github.com/Effect-TS/effect/commit/d10f876cd98da275bc5dc5750a91a7fc95e97541), [`743ae6d`](https://github.com/Effect-TS/effect/commit/743ae6d12b249f0b35b31b65b2f7ec91d83ee387), [`a75bc48`](https://github.com/Effect-TS/effect/commit/a75bc48e0e3278d0f70665fedecc5ae7ec447e24), [`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3), [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f)]:
  - @effect/schema@0.64.1
  - effect@2.4.5

## 0.48.0

### Minor Changes

- [#2287](https://github.com/Effect-TS/effect/pull/2287) [`a1f44cb`](https://github.com/Effect-TS/effect/commit/a1f44cb5112713ff9a3ac3d91a63a2c99d6b7fc1) Thanks [@tim-smart](https://github.com/tim-smart)! - add option to /platform runMain to disable error reporting

- [#2279](https://github.com/Effect-TS/effect/pull/2279) [`bdff193`](https://github.com/Effect-TS/effect/commit/bdff193365dd9ec2863573b08eb960aa8dee5c93) Thanks [@gcanti](https://github.com/gcanti)! - - `src/Worker.ts`
  - use `CauseEncoded` in `Worker` namespace
  - `src/WorkerError.ts`
    - use `CauseEncoded` in `Cause`

### Patch Changes

- [#2284](https://github.com/Effect-TS/effect/pull/2284) [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5) Thanks [@tim-smart](https://github.com/tim-smart)! - use Schema.declare for http multipart PersistedFile schema

- [#2283](https://github.com/Effect-TS/effect/pull/2283) [`509be1a`](https://github.com/Effect-TS/effect/commit/509be1a0817118489750cf028523134677e44a8a) Thanks [@tim-smart](https://github.com/tim-smart)! - add SocketCloseError with additional metadata

- [#2284](https://github.com/Effect-TS/effect/pull/2284) [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5) Thanks [@tim-smart](https://github.com/tim-smart)! - add more http multipart data type refinements

- [#2281](https://github.com/Effect-TS/effect/pull/2281) [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd) Thanks [@tim-smart](https://github.com/tim-smart)! - add OpenTimeout error to websocket client

- [#2286](https://github.com/Effect-TS/effect/pull/2286) [`d910dd2`](https://github.com/Effect-TS/effect/commit/d910dd2ca1e8e5aa2f09d9bf3694ede745758f99) Thanks [@tim-smart](https://github.com/tim-smart)! - allow optional fields in http form schemas

- [#2281](https://github.com/Effect-TS/effect/pull/2281) [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd) Thanks [@tim-smart](https://github.com/tim-smart)! - support closing a Socket by writing a CloseEvent

- Updated dependencies [[`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38), [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b)]:
  - @effect/schema@0.64.0
  - effect@2.4.4

## 0.47.1

### Patch Changes

- [#2276](https://github.com/Effect-TS/effect/pull/2276) [`0680545`](https://github.com/Effect-TS/effect/commit/068054540f19bb23a79c7c021ed8b2fe34f3e19f) Thanks [@tim-smart](https://github.com/tim-smart)! - improve /platform error messages

- Updated dependencies [[`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e)]:
  - effect@2.4.3
  - @effect/schema@0.63.4

## 0.47.0

### Minor Changes

- [#2261](https://github.com/Effect-TS/effect/pull/2261) [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e) Thanks [@tim-smart](https://github.com/tim-smart)! - move Socket module to platform

### Patch Changes

- [#2267](https://github.com/Effect-TS/effect/pull/2267) [`0f3d99c`](https://github.com/Effect-TS/effect/commit/0f3d99c27521ec6b221b644a0fffc79199c3acca) Thanks [@tim-smart](https://github.com/tim-smart)! - propogate Socket handler errors to .run Effect

- [#2269](https://github.com/Effect-TS/effect/pull/2269) [`4064ea0`](https://github.com/Effect-TS/effect/commit/4064ea04e0b3fa23108ee471cd89ab2482b2f6e5) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added PlatformLogger module, for writing logs to a file

  If you wanted to write logfmt logs to a file, you can do the following:

  ```ts
  import { PlatformLogger } from "@effect/platform"
  import { NodeFileSystem, NodeRuntime } from "@effect/platform-node"
  import { Effect, Layer, Logger } from "effect"

  const fileLogger = Logger.logfmtLogger.pipe(PlatformLogger.toFile("log.txt"))
  const LoggerLive = Logger.replaceScoped(
    Logger.defaultLogger,
    fileLogger
  ).pipe(Layer.provide(NodeFileSystem.layer))

  Effect.log("a").pipe(
    Effect.zipRight(Effect.log("b")),
    Effect.zipRight(Effect.log("c")),
    Effect.provide(LoggerLive),
    NodeRuntime.runMain
  )
  ```

- [#2261](https://github.com/Effect-TS/effect/pull/2261) [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e) Thanks [@tim-smart](https://github.com/tim-smart)! - add websocket support to platform http server

  You can use the `Http.request.upgrade*` apis to access the `Socket` for the request.

  Here is an example server that handles websockets on the `/ws` path:

  ```ts
  import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
  import * as Http from "@effect/platform/HttpServer"
  import { Console, Effect, Layer, Schedule, Stream } from "effect"
  import { createServer } from "node:http"

  const ServerLive = NodeHttpServer.server.layer(() => createServer(), {
    port: 3000
  })

  const HttpLive = Http.router.empty.pipe(
    Http.router.get(
      "/ws",
      Effect.gen(function* (_) {
        yield* _(
          Stream.fromSchedule(Schedule.spaced(1000)),
          Stream.map(JSON.stringify),
          Stream.encodeText,
          Stream.pipeThroughChannel(Http.request.upgradeChannel()),
          Stream.decodeText(),
          Stream.runForEach(Console.log)
        )
        return Http.response.empty()
      })
    ),
    Http.server.serve(Http.middleware.logger),
    Http.server.withLogAddress,
    Layer.provide(ServerLive)
  )

  NodeRuntime.runMain(Layer.launch(HttpLive))
  ```

- Updated dependencies [[`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0), [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8), [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00), [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671), [`465be79`](https://github.com/Effect-TS/effect/commit/465be7926afe98169837d8a4ed5ebc059a732d21), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27), [`d8e6940`](https://github.com/Effect-TS/effect/commit/d8e694040f67da6fefc0f5c98fc8e15c0b48822e)]:
  - effect@2.4.2
  - @effect/schema@0.63.3

## 0.46.3

### Patch Changes

- [#2231](https://github.com/Effect-TS/effect/pull/2231) [`7535080`](https://github.com/Effect-TS/effect/commit/7535080f2e2f9859711031161600c01807cc43ea) Thanks [@tim-smart](https://github.com/tim-smart)! - add option to include prefix when mounting an http app to a router

  By default the prefix is removed. For example:

  ```ts
  // Here a request to `/child/hello` will be mapped to `/hello`
  Http.router.mountApp("/child", httpApp)

  // Here a request to `/child/hello` will be mapped to `/child/hello`
  Http.router.mountApp("/child", httpApp, { includePrefix: true })
  ```

- [#2232](https://github.com/Effect-TS/effect/pull/2232) [`bd1d7ac`](https://github.com/Effect-TS/effect/commit/bd1d7ac75eea57a94d5e2d8e1edccb3136e84899) Thanks [@tim-smart](https://github.com/tim-smart)! - use less aggressive type exclusion in http router apis

- Updated dependencies [[`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac), [`39f583e`](https://github.com/Effect-TS/effect/commit/39f583eaeb29eecd6eaec3b113b24d9d413153df), [`f428198`](https://github.com/Effect-TS/effect/commit/f428198725d4b9e304ecd5ff8bad8f92d871dbe3), [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831), [`c035972`](https://github.com/Effect-TS/effect/commit/c035972dfabdd3cb3372b5ab468aa2fd0d808f4d), [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31)]:
  - effect@2.4.1
  - @effect/schema@0.63.2

## 0.46.2

### Patch Changes

- Updated dependencies [[`5d30853`](https://github.com/Effect-TS/effect/commit/5d308534cac6f187227185393c0bac9eb27f90ab), [`6e350ed`](https://github.com/Effect-TS/effect/commit/6e350ed611feb0341e00aafd3c3905cd5ba53f07)]:
  - @effect/schema@0.63.1

## 0.46.1

### Patch Changes

- [#2196](https://github.com/Effect-TS/effect/pull/2196) [`aa6556f`](https://github.com/Effect-TS/effect/commit/aa6556f007117caea84d6965aa30846a11879e9d) Thanks [@tim-smart](https://github.com/tim-smart)! - handle defects in worker runner

## 0.46.0

### Minor Changes

- [#2101](https://github.com/Effect-TS/effect/pull/2101) [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2) Thanks [@github-actions](https://github.com/apps/github-actions)! - add key type to ReadonlyRecord

### Patch Changes

- Updated dependencies [[`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101), [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f), [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f), [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484), [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`54ddbb7`](https://github.com/Effect-TS/effect/commit/54ddbb720aeeb657537b01ae221cdcd5e919c1a6), [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff), [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe), [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a), [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e), [`136ef40`](https://github.com/Effect-TS/effect/commit/136ef40fe4a394abfa5c6a7ec103eea57251423e), [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561), [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108), [`f24ac9f`](https://github.com/Effect-TS/effect/commit/f24ac9f0c2c520add58f09fbdcec5defda03bd52)]:
  - effect@2.4.0
  - @effect/schema@0.63.0

## 0.45.6

### Patch Changes

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

- Updated dependencies [[`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9), [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf)]:
  - effect@2.3.8
  - @effect/schema@0.62.9

## 0.45.5

### Patch Changes

- [#2177](https://github.com/Effect-TS/effect/pull/2177) [`6daf084`](https://github.com/Effect-TS/effect/commit/6daf0845de008772011db8d7c75b7c37a6b4d334) Thanks [@tim-smart](https://github.com/tim-smart)! - support Arrays in platform Template module

## 0.45.4

### Patch Changes

- [#2174](https://github.com/Effect-TS/effect/pull/2174) [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea) Thanks [@tim-smart](https://github.com/tim-smart)! - add ServerResponse.html/htmlStream api

  It uses the Template module to create html responses

  Example:

  ```ts
  import { Effect } from "effect"
  import * as Http from "@effect/platform/HttpServer"

  Http.response.html`<html>${Effect.succeed(123)}</html>`
  ```

- [#2174](https://github.com/Effect-TS/effect/pull/2174) [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea) Thanks [@tim-smart](https://github.com/tim-smart)! - add Template module to platform

  The Template module can be used to create effectful text templates.

  Example:

  ```ts
  import { Effect } from "effect"
  import { Template } from "@effect/platform"

  const t = Template.make`<html>${Effect.succeed(123)}</html>`

  Effect.runSync(t) // returns "<html>123</html>"
  ```

- Updated dependencies [[`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f), [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de), [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241)]:
  - effect@2.3.7
  - @effect/schema@0.62.8

## 0.45.3

### Patch Changes

- [#2152](https://github.com/Effect-TS/effect/pull/2152) [`09532a8`](https://github.com/Effect-TS/effect/commit/09532a86b7d0cc23557c89158f0342753dfce4b0) Thanks [@tim-smart](https://github.com/tim-smart)! - fix incorrect removal of scope in Client.schemaFunction

## 0.45.2

### Patch Changes

- [#2122](https://github.com/Effect-TS/effect/pull/2122) [`44c3b43`](https://github.com/Effect-TS/effect/commit/44c3b43653e64d7e425d39815d8ff405acec9b99) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Add a way to redact HTTP headers

- Updated dependencies [[`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444), [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8), [`dbff62c`](https://github.com/Effect-TS/effect/commit/dbff62c3026054350a671f6210058ec5844c285e), [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333), [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e), [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a), [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0), [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62), [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12), [`e572b07`](https://github.com/Effect-TS/effect/commit/e572b076e9b4369d9cc8e55414006eef376c93d9), [`e787a57`](https://github.com/Effect-TS/effect/commit/e787a5772e30d8b840cb98b49d36996e7d659a6c), [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880), [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce)]:
  - effect@2.3.6
  - @effect/schema@0.62.7

## 0.45.1

### Patch Changes

- [#2133](https://github.com/Effect-TS/effect/pull/2133) [`65895ab`](https://github.com/Effect-TS/effect/commit/65895ab982e0917ac92f0827e387e7cf61be1e69) Thanks [@tim-smart](https://github.com/tim-smart)! - use Schema.TaggedError for worker errors

## 0.45.0

### Minor Changes

- [#2119](https://github.com/Effect-TS/effect/pull/2119) [`2b62548`](https://github.com/Effect-TS/effect/commit/2b6254845882f399636d24223c483e5489e3cff4) Thanks [@tim-smart](https://github.com/tim-smart)! - add Scope to Http client

  This change adds a scope to the default http client, ensuring connections are
  cleaned up if you abort the request at any point.

  Some response helpers have been added to reduce the noise.

  ```ts
  import * as Http from "@effect/platform/HttpClient"
  import { Effect } from "effect"

  // instead of
  Http.request.get("/").pipe(
    Http.client.fetchOk(),
    Effect.flatMap((_) => _.json),
    Effect.scoped
  )

  // you can do
  Http.request.get("/").pipe(Http.client.fetchOk(), Http.response.json)

  // other helpers include
  Http.response.text
  Http.response.stream
  Http.response.arrayBuffer
  Http.response.urlParamsBody
  Http.response.formData
  Http.response.schema * Effect
  ```

## 0.44.7

### Patch Changes

- Updated dependencies [[`aef2b8b`](https://github.com/Effect-TS/effect/commit/aef2b8bb636ada07224dc9cf491bebe622c1aeda), [`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3), [`7eecb1c`](https://github.com/Effect-TS/effect/commit/7eecb1c6cebe36550df3cca85a46867adbcaa2ca)]:
  - @effect/schema@0.62.6
  - effect@2.3.5

## 0.44.6

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4
  - @effect/schema@0.62.5

## 0.44.5

### Patch Changes

- Updated dependencies [[`1c6d18b`](https://github.com/Effect-TS/effect/commit/1c6d18b422b0bd800f2ed036dba9cb78db296c03), [`13d3266`](https://github.com/Effect-TS/effect/commit/13d3266f331f7aa49b55dd244d4e749a82255274), [`a344b42`](https://github.com/Effect-TS/effect/commit/a344b420862f71532a28c72f00b7ba54776d744d)]:
  - @effect/schema@0.62.4

## 0.44.4

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3
  - @effect/schema@0.62.3

## 0.44.3

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2
  - @effect/schema@0.62.2

## 0.44.2

### Patch Changes

- [#2091](https://github.com/Effect-TS/effect/pull/2091) [`29739dd`](https://github.com/Effect-TS/effect/commit/29739dde8e6232824d49c4c7f8856de245249c5c) Thanks [@tim-smart](https://github.com/tim-smart)! - improve type extraction for Router.fromIterable

## 0.44.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/schema@0.62.1

## 0.44.0

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

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18) Thanks [@github-actions](https://github.com/apps/github-actions)! - With this change we remove the `Data.Data` type and we make `Equal.Equal` & `Hash.Hash` implicit traits.

  The main reason is that `Data.Data<A>` was structurally equivalent to `A & Equal.Equal` but extending `Equal.Equal` doesn't mean that the equality is implemented by-value, so the type was simply adding noise without gaining any level of safety.

  The module `Data` remains unchanged at the value level, all the functions previously available are supposed to work in exactly the same manner.

  At the type level instead the functions return `Readonly` variants, so for example we have:

  ```ts
  import { Data } from "effect"

  const obj = Data.struct({
    a: 0,
    b: 1
  })
  ```

  will have the `obj` typed as:

  ```ts
  declare const obj: {
    readonly a: number
    readonly b: number
  }
  ```

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113) Thanks [@github-actions](https://github.com/apps/github-actions)! - fix for encoding of Transferable schemas

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c) Thanks [@github-actions](https://github.com/apps/github-actions)! - use Context for collecting tranferables

  This changes the platform Transferable module to use Effect context to collect
  tranferables when using schemas with workers etc.

  You can now use a tranferable data type anywhere in your schema without having
  to wrap the outermost schema:

  ```ts
  import { Transferable } from "@effect/platform"
  import { Schema } from "@effect/schema"

  const structWithTransferable = Schema.struct({
    data: Transferable.Uint8Array
  })
  ```

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

- [#2006](https://github.com/Effect-TS/effect/pull/2006) [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f) Thanks [@github-actions](https://github.com/apps/github-actions)! - add server address apis

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`4cd6e14`](https://github.com/Effect-TS/effect/commit/4cd6e144945b6c398f5f5abe3471ff7fb3372bfd), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9dc04c8`](https://github.com/Effect-TS/effect/commit/9dc04c88a2ea9c68122cb2632a76f0f4be40329a), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`d3f9f4d`](https://github.com/Effect-TS/effect/commit/d3f9f4d4032b1131c62f4ddb21a4583e4e8d7c18), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`56b8691`](https://github.com/Effect-TS/effect/commit/56b86916bf3da18002f3655d859dbc487eb5a6de), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/schema@0.62.0

## 0.43.11

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5
  - @effect/schema@0.61.7

## 0.43.10

### Patch Changes

- [#2057](https://github.com/Effect-TS/effect/pull/2057) [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70) Thanks [@joepjoosten](https://github.com/joepjoosten)! - Fix for possible stack overflow errors when using Array.push with spread operator arguments

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4
  - @effect/schema@0.61.6

## 0.43.9

### Patch Changes

- [#2039](https://github.com/Effect-TS/effect/pull/2039) [`1b841a9`](https://github.com/Effect-TS/effect/commit/1b841a91fed86825cd2867cf1e68e41d8ff26b4e) Thanks [@tim-smart](https://github.com/tim-smart)! - fix ClientRequest.make signature (generic was unused)

## 0.43.8

### Patch Changes

- [#2037](https://github.com/Effect-TS/effect/pull/2037) [`32bf796`](https://github.com/Effect-TS/effect/commit/32bf796c3e5db1b2b68e8b1b20db664295991643) Thanks [@tim-smart](https://github.com/tim-smart)! - remove overloads from ClientRequest.make

  This makes it easier to programatically create client request instances:

  ```
  import * as Http from "@effect/platform/HttpClient"

  declare const method: "GET" | "POST"
  declare const url: string

  Http.request.make(method)(url)
  ```

## 0.43.7

### Patch Changes

- [#2020](https://github.com/Effect-TS/effect/pull/2020) [`cde08f3`](https://github.com/Effect-TS/effect/commit/cde08f354ed2ff2921d1d98bd539c7d65a2ddd73) Thanks [@tim-smart](https://github.com/tim-smart)! - use Proxy for platform schema Transferable

## 0.43.6

### Patch Changes

- [#2016](https://github.com/Effect-TS/effect/pull/2016) [`c96bb17`](https://github.com/Effect-TS/effect/commit/c96bb17043e2cec1eaeb319614a4c2904d876beb) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - Support URL objects in client requests

## 0.43.5

### Patch Changes

- Updated dependencies [[`f1ff44b`](https://github.com/Effect-TS/effect/commit/f1ff44b58cdb1886b38681e8fedc309eb9ac6853), [`13785cf`](https://github.com/Effect-TS/effect/commit/13785cf4a5082d8d9cf8d7c991141dee0d2b4d31)]:
  - @effect/schema@0.61.5

## 0.43.4

### Patch Changes

- [#1999](https://github.com/Effect-TS/effect/pull/1999) [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure forked fibers are interruptible

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247), [`6bf02c7`](https://github.com/Effect-TS/effect/commit/6bf02c70fe10a04d1b34d6666f95416e42a6225a)]:
  - effect@2.2.3
  - @effect/schema@0.61.4

## 0.43.3

### Patch Changes

- Updated dependencies [[`9863e2f`](https://github.com/Effect-TS/effect/commit/9863e2fb3561dc019965aeccd6584a418fc8b401)]:
  - @effect/schema@0.61.3

## 0.43.2

### Patch Changes

- Updated dependencies [[`64f710a`](https://github.com/Effect-TS/effect/commit/64f710aa49dec6ffcd33ee23438d0774f5489733)]:
  - @effect/schema@0.61.2

## 0.43.1

### Patch Changes

- Updated dependencies [[`c7550f9`](https://github.com/Effect-TS/effect/commit/c7550f96e1006eee832ce5025bf0c197a65935ea), [`8d1f6e4`](https://github.com/Effect-TS/effect/commit/8d1f6e4bb13e221804fb1762ef19e02bcefc8f61), [`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b), [`1a84dee`](https://github.com/Effect-TS/effect/commit/1a84dee0e9ddbfaf2610e4d7c00c7020c427171a), [`ac30bf4`](https://github.com/Effect-TS/effect/commit/ac30bf4cd53de0663784f65ae6bee8279333df97)]:
  - @effect/schema@0.61.1
  - effect@2.2.2

## 0.43.0

### Minor Changes

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764)]:
  - effect@2.2.1
  - @effect/schema@0.61.0

## 0.42.7

### Patch Changes

- [#1959](https://github.com/Effect-TS/effect/pull/1959) [`fe05ad7`](https://github.com/Effect-TS/effect/commit/fe05ad7bcb3b88d47800ab69ebf53641023676f1) Thanks [@tim-smart](https://github.com/tim-smart)! - fix ClientRequest stream bodies

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0
  - @effect/schema@0.60.7

## 0.42.6

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2
  - @effect/schema@0.60.6

## 0.42.5

### Patch Changes

- Updated dependencies [[`3bf67cf`](https://github.com/Effect-TS/effect/commit/3bf67cf64ff27ffaa811b07751875cb161ac3385)]:
  - @effect/schema@0.60.5

## 0.42.4

### Patch Changes

- Updated dependencies [[`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`0d1af1e`](https://github.com/Effect-TS/effect/commit/0d1af1e38c11b94e152beaccd0ff7569a1b3f5b7), [`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - @effect/schema@0.60.4
  - effect@2.1.1

## 0.42.3

### Patch Changes

- Updated dependencies [[`d543221`](https://github.com/Effect-TS/effect/commit/d5432213e91ab620aa66e0fd92a6593134d18940), [`2530d47`](https://github.com/Effect-TS/effect/commit/2530d470b0ad5df7e636921eedfb1cbe42821f94), [`f493929`](https://github.com/Effect-TS/effect/commit/f493929ab88d2ea137ca5fbff70bdc6c9d804d80), [`5911fa9`](https://github.com/Effect-TS/effect/commit/5911fa9c9440dd3bc1ee38542bcd15f8c75a4637)]:
  - @effect/schema@0.60.3

## 0.42.2

### Patch Changes

- [#1919](https://github.com/Effect-TS/effect/pull/1919) [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02) Thanks [@github-actions](https://github.com/apps/github-actions)! - Improve Effect.retry options

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0
  - @effect/schema@0.60.2

## 0.42.1

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5
  - @effect/schema@0.60.1

## 0.42.0

### Minor Changes

- [#1895](https://github.com/Effect-TS/effect/pull/1895) [`48a3d40`](https://github.com/Effect-TS/effect/commit/48a3d40aed0f923f567b8911dade732ff472d981) Thanks [@tim-smart](https://github.com/tim-smart)! - make worker initial message type safe

### Patch Changes

- Updated dependencies [[`ec2bdfa`](https://github.com/Effect-TS/effect/commit/ec2bdfae2da717f28147b9d6820d3494cb240945), [`687e02e`](https://github.com/Effect-TS/effect/commit/687e02e7d84dc06957844160761fda90929470ab), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`0c397e7`](https://github.com/Effect-TS/effect/commit/0c397e762008a0de40c7526c9d99ff2cfe4f7a6a), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`b557a10`](https://github.com/Effect-TS/effect/commit/b557a10b773e321bea77fc4951f0ef171dd193c9), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`74b9094`](https://github.com/Effect-TS/effect/commit/74b90940e571c73a6b76cafa88ffb8a1c949cb4c), [`337e80f`](https://github.com/Effect-TS/effect/commit/337e80f69bc36966f889c439b819db2f84cae496), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51)]:
  - @effect/schema@0.60.0
  - effect@2.0.4

## 0.41.0

### Minor Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - lift worker shutdown to /platform implementation

### Patch Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid killing all fibers on interrupt

- Updated dependencies [[`5b46e99`](https://github.com/Effect-TS/effect/commit/5b46e996d30e2497eb23095e2c21eee04438edf5), [`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`210d27e`](https://github.com/Effect-TS/effect/commit/210d27e999e066ea9b907301150c65f9ff080b39), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - @effect/schema@0.59.1
  - effect@2.0.3

## 0.40.4

### Patch Changes

- Updated dependencies [[`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f), [`c4b84f7`](https://github.com/Effect-TS/effect/commit/c4b84f724ae809f3450d71c3ea5d629205fc479f)]:
  - @effect/schema@0.59.0

## 0.40.3

### Patch Changes

- [#1879](https://github.com/Effect-TS/effect/pull/1879) [`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af) Thanks [@tim-smart](https://github.com/tim-smart)! - add http Multiplex module

- Updated dependencies [[`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`a904a73`](https://github.com/Effect-TS/effect/commit/a904a739459bfd0fa7844b00b902d2fa984fb014), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c), [`7b2f874`](https://github.com/Effect-TS/effect/commit/7b2f8743d96753c3e24ac4cc6715a4a7f4a2ca0c)]:
  - @effect/schema@0.58.0

## 0.40.2

### Patch Changes

- [#1870](https://github.com/Effect-TS/effect/pull/1870) [`4c90c54`](https://github.com/Effect-TS/effect/commit/4c90c54d87c91f75f3ad114926cdf3b0c25df091) Thanks [@tim-smart](https://github.com/tim-smart)! - support context propogation in platform workers

- [#1869](https://github.com/Effect-TS/effect/pull/1869) [`d3d3bda`](https://github.com/Effect-TS/effect/commit/d3d3bda74c794153def9027e0c40896e72cd5d14) Thanks [@tim-smart](https://github.com/tim-smart)! - don't add Transferable to schema types

- Updated dependencies [[`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c)]:
  - effect@2.0.2
  - @effect/schema@0.57.2

## 0.40.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1
  - @effect/schema@0.57.1

## 0.40.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

- [#1846](https://github.com/Effect-TS/effect/pull/1846) [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f) Thanks [@fubhy](https://github.com/fubhy)! - Enabled `exactOptionalPropertyTypes` throughout

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1848](https://github.com/Effect-TS/effect/pull/1848) [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7) Thanks [@fubhy](https://github.com/fubhy)! - Avoid default parameter initilization

- [#1847](https://github.com/Effect-TS/effect/pull/1847) [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa) Thanks [@fubhy](https://github.com/fubhy)! - Avoid inline creation & spreading of objects and arrays

- [#1799](https://github.com/Effect-TS/effect/pull/1799) [`c0aeb5e`](https://github.com/Effect-TS/effect/commit/c0aeb5e302869bcd7d7627f8cc5b630d07c12d10) Thanks [@tim-smart](https://github.com/tim-smart)! - add Route to RouteContext

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747)]:
  - @effect/schema@0.57.0
  - effect@2.0.0

## 0.39.0

### Minor Changes

- [#369](https://github.com/Effect-TS/platform/pull/369) [`5d5f62b`](https://github.com/Effect-TS/platform/commit/5d5f62b03ffdbca0a986d968e1dbb45886dfa827) Thanks [@tim-smart](https://github.com/tim-smart)! - rename server FormData module to Multipart

- [#372](https://github.com/Effect-TS/platform/pull/372) [`15784c9`](https://github.com/Effect-TS/platform/commit/15784c920dcae40f328bb45ac850987135207365) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#373](https://github.com/Effect-TS/platform/pull/373) [`b042ba5`](https://github.com/Effect-TS/platform/commit/b042ba5ae78a1eed592e543c233fe3040d6a60da) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- [#371](https://github.com/Effect-TS/platform/pull/371) [`49fb154`](https://github.com/Effect-TS/platform/commit/49fb15439f18701321db8ded839243b9dd8de71a) Thanks [@tim-smart](https://github.com/tim-smart)! - rename schemaBodyMultipartJson to schemaBodyFormJson & support url forms

## 0.38.0

### Minor Changes

- [#367](https://github.com/Effect-TS/platform/pull/367) [`7d1584b`](https://github.com/Effect-TS/platform/commit/7d1584b23d464651c206201ff304c6eb4bebfc3a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.37.8

### Patch Changes

- [#363](https://github.com/Effect-TS/platform/pull/363) [`e2c545a`](https://github.com/Effect-TS/platform/commit/e2c545a328c2bccbba661540a8835b10bce4b438) Thanks [@tim-smart](https://github.com/tim-smart)! - fix schemaNoBody type

- [#366](https://github.com/Effect-TS/platform/pull/366) [`1d6bf73`](https://github.com/Effect-TS/platform/commit/1d6bf730dad0a6bbb282f436ec7d5870de76ca3a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Scope to every http request

- [#365](https://github.com/Effect-TS/platform/pull/365) [`3351136`](https://github.com/Effect-TS/platform/commit/335113601c238104eb2e331d26b5e463bde80dff) Thanks [@tim-smart](https://github.com/tim-smart)! - respond with 503 on server induced interrupt

## 0.37.7

### Patch Changes

- [#361](https://github.com/Effect-TS/platform/pull/361) [`df3af6b`](https://github.com/Effect-TS/platform/commit/df3af6be61572bab15004bbca2c5739d8206f3c3) Thanks [@tim-smart](https://github.com/tim-smart)! - fix headers type for schemaJson

## 0.37.6

### Patch Changes

- [#359](https://github.com/Effect-TS/platform/pull/359) [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364) Thanks [@tim-smart](https://github.com/tim-smart)! - use branded type for Headers

- [#359](https://github.com/Effect-TS/platform/pull/359) [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364) Thanks [@tim-smart](https://github.com/tim-smart)! - change UrlParams to ReadonlyArray

## 0.37.5

### Patch Changes

- [#354](https://github.com/Effect-TS/platform/pull/354) [`190bc84`](https://github.com/Effect-TS/platform/commit/190bc84b137a729a38b6812e220085b3d12cb124) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer support to SerializedWorker

## 0.37.4

### Patch Changes

- [#352](https://github.com/Effect-TS/platform/pull/352) [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d) Thanks [@tim-smart](https://github.com/tim-smart)! - interrupt all fibers on worker interrupt

- [#352](https://github.com/Effect-TS/platform/pull/352) [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d) Thanks [@tim-smart](https://github.com/tim-smart)! - interrupt workers on all failures

## 0.37.3

### Patch Changes

- [#350](https://github.com/Effect-TS/platform/pull/350) [`b30e5e3`](https://github.com/Effect-TS/platform/commit/b30e5e3874f22037f92253037fff6952f537ee40) Thanks [@tim-smart](https://github.com/tim-smart)! - add decode option to worker runner

## 0.37.2

### Patch Changes

- [#348](https://github.com/Effect-TS/platform/pull/348) [`28edc60`](https://github.com/Effect-TS/platform/commit/28edc60d2fcd30160529c677a9ffd786775e534b) Thanks [@tim-smart](https://github.com/tim-smart)! - add layer worker runner apis

## 0.37.1

### Patch Changes

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support error and output transfers in worker runners

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support initialMessage in workers

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema transforms to Transferable

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - make worker encoding return Effects

## 0.37.0

### Minor Changes

- [#341](https://github.com/Effect-TS/platform/pull/341) [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /platform-\*

- [#341](https://github.com/Effect-TS/platform/pull/341) [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1) Thanks [@tim-smart](https://github.com/tim-smart)! - replace http router with find-my-way-ts

## 0.36.0

### Minor Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - change http serve api to return immediately

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - Http.server.serve now returns a Layer

### Patch Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.server.serveEffect

## 0.35.0

### Minor Changes

- [#335](https://github.com/Effect-TS/platform/pull/335) [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e) Thanks [@tim-smart](https://github.com/tim-smart)! - remove index module from /platform

### Patch Changes

- [#335](https://github.com/Effect-TS/platform/pull/335) [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e) Thanks [@tim-smart](https://github.com/tim-smart)! - add SerializedWorker

## 0.34.0

### Minor Changes

- [#331](https://github.com/Effect-TS/platform/pull/331) [`db1ca18`](https://github.com/Effect-TS/platform/commit/db1ca18725f9dd4be1c36ddc80faa3aa53c10eb7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.33.1

### Patch Changes

- [#326](https://github.com/Effect-TS/platform/pull/326) [`162aa91`](https://github.com/Effect-TS/platform/commit/162aa915934112983c543a6be2a9d7091b86fac9) Thanks [@tim-smart](https://github.com/tim-smart)! - add Router.schemaSearchParams/schemaPathParams

## 0.33.0

### Minor Changes

- [#321](https://github.com/Effect-TS/platform/pull/321) [`16a5bca`](https://github.com/Effect-TS/platform/commit/16a5bca2bd4aed570ce95233a0e47350010d031f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#319](https://github.com/Effect-TS/platform/pull/319) [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed) Thanks [@IMax153](https://github.com/IMax153)! - add Terminal.readLine to read input line-by-line from the terminal

- [#319](https://github.com/Effect-TS/platform/pull/319) [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed) Thanks [@IMax153](https://github.com/IMax153)! - make Terminal.columns an Effect to account for resizing the terminal

## 0.32.2

### Patch Changes

- [#312](https://github.com/Effect-TS/platform/pull/312) [`cc1f588`](https://github.com/Effect-TS/platform/commit/cc1f5886bf4188e0128b64b9e2a67f789680cab0) Thanks [@tim-smart](https://github.com/tim-smart)! - scope commands to prevent process leaks

## 0.32.1

### Patch Changes

- [#310](https://github.com/Effect-TS/platform/pull/310) [`14239fb`](https://github.com/Effect-TS/platform/commit/14239fb11ae45db1a02d9ba883d0412a9c9e6343) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.32.0

### Minor Changes

- [#307](https://github.com/Effect-TS/platform/pull/307) [`746f969`](https://github.com/Effect-TS/platform/commit/746f9692e2f7133dcb413e0eea08ac7b6b97a9bd) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#304](https://github.com/Effect-TS/platform/pull/304) [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d) Thanks [@tim-smart](https://github.com/tim-smart)! - allow fetch function to be replaced

- [#304](https://github.com/Effect-TS/platform/pull/304) [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d) Thanks [@tim-smart](https://github.com/tim-smart)! - add HttpClient.mapInputRequest apis

## 0.31.2

### Patch Changes

- [#298](https://github.com/Effect-TS/platform/pull/298) [`7a46ec6`](https://github.com/Effect-TS/platform/commit/7a46ec679e2d4718919c407d0c6c5f0fdc35e62d) Thanks [@tim-smart](https://github.com/tim-smart)! - add .toWebHandler\* to Http/App

## 0.31.1

### Patch Changes

- [#292](https://github.com/Effect-TS/platform/pull/292) [`b712491`](https://github.com/Effect-TS/platform/commit/b71249168eb4623de8dbd28cd0102be688f5caa3) Thanks [@tim-smart](https://github.com/tim-smart)! - add ability to disable http tracer with predicate

## 0.31.0

### Minor Changes

- [#291](https://github.com/Effect-TS/platform/pull/291) [`5a677f1`](https://github.com/Effect-TS/platform/commit/5a677f1062d7373e21839dfa51db26beef15dca4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#289](https://github.com/Effect-TS/platform/pull/289) [`624855f`](https://github.com/Effect-TS/platform/commit/624855f635162b2c1232429253477d0805e02657) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

## 0.30.6

### Patch Changes

- [#287](https://github.com/Effect-TS/platform/pull/287) [`d5d0932`](https://github.com/Effect-TS/platform/commit/d5d093219cde4f51afb9251d9ba4270fc70be0c1) Thanks [@tim-smart](https://github.com/tim-smart)! - expose ServerResponse.setStatus

## 0.30.5

### Patch Changes

- [#277](https://github.com/Effect-TS/platform/pull/277) [`36e449c`](https://github.com/Effect-TS/platform/commit/36e449c95fab80dc54505cef2071dcbecce35b4f) Thanks [@tim-smart](https://github.com/tim-smart)! - wait for ready latch in worker

## 0.30.4

### Patch Changes

- [#275](https://github.com/Effect-TS/platform/pull/275) [`e28989e`](https://github.com/Effect-TS/platform/commit/e28989ebd1813cec7ce68f7dd8718f2254e05cad) Thanks [@tim-smart](https://github.com/tim-smart)! - add stack to WorkerError

## 0.30.3

### Patch Changes

- [#272](https://github.com/Effect-TS/platform/pull/272) [`1a055ac`](https://github.com/Effect-TS/platform/commit/1a055ac959faf12e9c57768b20babea12b1f7d2d) Thanks [@tim-smart](https://github.com/tim-smart)! - add WorkerError to send api

## 0.30.2

### Patch Changes

- [#270](https://github.com/Effect-TS/platform/pull/270) [`3257fd5`](https://github.com/Effect-TS/platform/commit/3257fd52016af5a38c135de5f0aa33aac7de2538) Thanks [@tim-smart](https://github.com/tim-smart)! - update multipasta

## 0.30.1

### Patch Changes

- [#268](https://github.com/Effect-TS/platform/pull/268) [`58f5ccc`](https://github.com/Effect-TS/platform/commit/58f5ccc07d74abe6820debc0179665e5ef76b5c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

## 0.30.0

### Minor Changes

- [#267](https://github.com/Effect-TS/platform/pull/267) [`3d38b40`](https://github.com/Effect-TS/platform/commit/3d38b40a939e32c6c0e8b62dd53a844a6f389182) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.29.1

### Patch Changes

- [#263](https://github.com/Effect-TS/platform/pull/263) [`2bbe692`](https://github.com/Effect-TS/platform/commit/2bbe6928aa5e6929e58877ba236547310bca7e2b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix fieldMimeTypes fiber ref

## 0.29.0

### Minor Changes

- [#250](https://github.com/Effect-TS/platform/pull/250) [`6e18090`](https://github.com/Effect-TS/platform/commit/6e18090db4686cd5564ab9dc3d8771d7b3ad97fa) Thanks [@tim-smart](https://github.com/tim-smart)! - updated FormData model and apis

## 0.28.4

### Patch Changes

- [#260](https://github.com/Effect-TS/platform/pull/260) [`8f5e6a2`](https://github.com/Effect-TS/platform/commit/8f5e6a2f2ced4408b0b311b0456828855e1cb958) Thanks [@IMax153](https://github.com/IMax153)! - expose available terminal columns from the Terminal service

## 0.28.3

### Patch Changes

- [#258](https://github.com/Effect-TS/platform/pull/258) [`9f79c1f`](https://github.com/Effect-TS/platform/commit/9f79c1f5278e60b3bcbd59f08e20189bcb25a84e) Thanks [@IMax153](https://github.com/IMax153)! - fix context identifier for Terminal service

## 0.28.2

### Patch Changes

- [#255](https://github.com/Effect-TS/platform/pull/255) [`fea76da`](https://github.com/Effect-TS/platform/commit/fea76da05190a65912911bd5b6f9cc0bef3b2edc) Thanks [@IMax153](https://github.com/IMax153)! - add basic Terminal interface for prompting user input

## 0.28.1

### Patch Changes

- [#253](https://github.com/Effect-TS/platform/pull/253) [`43d2e29`](https://github.com/Effect-TS/platform/commit/43d2e2984fe88b39e907f45f089206ed88ad52d1) Thanks [@fubhy](https://github.com/fubhy)! - Update dependencies

## 0.28.0

### Minor Changes

- [#251](https://github.com/Effect-TS/platform/pull/251) [`05fef78`](https://github.com/Effect-TS/platform/commit/05fef784ac975059fb6335576feadc7f34644314) Thanks [@fubhy](https://github.com/fubhy)! - Re-added exports for http module

## 0.27.4

### Patch Changes

- [#248](https://github.com/Effect-TS/platform/pull/248) [`8a4b1c1`](https://github.com/Effect-TS/platform/commit/8a4b1c14808d9815eb93a5b10d8a5b26c4dd027b) Thanks [@IMax153](https://github.com/IMax153)! - allow for specifying that a Command should be run in a shell

## 0.27.3

### Patch Changes

- [#243](https://github.com/Effect-TS/platform/pull/243) [`1ac0a42`](https://github.com/Effect-TS/platform/commit/1ac0a4208184ef1d23d5ad41a7f0e32bc4d80d85) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker interruption

## 0.27.2

### Patch Changes

- [#241](https://github.com/Effect-TS/platform/pull/241) [`e2aa7cd`](https://github.com/Effect-TS/platform/commit/e2aa7cd606a735809fbf79327cfebc009e89d84d) Thanks [@tim-smart](https://github.com/tim-smart)! - decrease bun worker close timeout

## 0.27.1

### Patch Changes

- [#239](https://github.com/Effect-TS/platform/pull/239) [`4d94b9d`](https://github.com/Effect-TS/platform/commit/4d94b9d30adba2bf4f6f6e1d4cd735e6362667c5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.27.0

### Minor Changes

- [#237](https://github.com/Effect-TS/platform/pull/237) [`1f79ed6`](https://github.com/Effect-TS/platform/commit/1f79ed6b4d2ee9ae2b59c4536854566c579e77c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.26.7

### Patch Changes

- [#235](https://github.com/Effect-TS/platform/pull/235) [`6e14c02`](https://github.com/Effect-TS/platform/commit/6e14c02db668f380bb92f19037685fe40592a8fe) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for hanging worker shutdown

## 0.26.6

### Patch Changes

- [#233](https://github.com/Effect-TS/platform/pull/233) [`71947e0`](https://github.com/Effect-TS/platform/commit/71947e0e0aa9dccf9aad6f63dd98a6b6c89f23b4) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker scope hanging on close

## 0.26.5

### Patch Changes

- [#231](https://github.com/Effect-TS/platform/pull/231) [`a3cbba4`](https://github.com/Effect-TS/platform/commit/a3cbba4a0fa0f1ef99a6d7e54f5ab46c6813ef00) Thanks [@tim-smart](https://github.com/tim-smart)! - add onCreate and broadcast to pool options

## 0.26.4

### Patch Changes

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - type worker runner success as never

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - disable worker pool scaling

## 0.26.3

### Patch Changes

- [#227](https://github.com/Effect-TS/platform/pull/227) [`abb6baa`](https://github.com/Effect-TS/platform/commit/abb6baa61346580f97d2ab91b84a7342b5becc60) Thanks [@patroza](https://github.com/patroza)! - feat: cache the reading of text/urlParamsBody/formData bodies so they can be reused

## 0.26.2

### Patch Changes

- [#219](https://github.com/Effect-TS/platform/pull/219) [`f37f58c`](https://github.com/Effect-TS/platform/commit/f37f58ca21c1d5dfedc40c01cde0ffbc954d7e32) Thanks [@tim-smart](https://github.com/tim-smart)! - fix encode / transfers for effect workers

## 0.26.1

### Patch Changes

- [#217](https://github.com/Effect-TS/platform/pull/217) [`7471ac1`](https://github.com/Effect-TS/platform/commit/7471ac139f3c6867cd0d228ec54e88abd1384f5c) Thanks [@tim-smart](https://github.com/tim-smart)! - add encode option to Worker & WorkerRunner

## 0.26.0

### Minor Changes

- [#215](https://github.com/Effect-TS/platform/pull/215) [`59da2a6`](https://github.com/Effect-TS/platform/commit/59da2a6877e219b2ca0433aeeecab4ad7487816b) Thanks [@tim-smart](https://github.com/tim-smart)! - seperate request processing in http client

## 0.25.1

### Patch Changes

- [#213](https://github.com/Effect-TS/platform/pull/213) [`38a49eb`](https://github.com/Effect-TS/platform/commit/38a49eb6ea99ef773007a98ec262898207c8f3c7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.25.0

### Minor Changes

- [#211](https://github.com/Effect-TS/platform/pull/211) [`9ec45cb`](https://github.com/Effect-TS/platform/commit/9ec45cba6b7d5016079ccad9357934f12afe8750) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.24.0

### Minor Changes

- [#209](https://github.com/Effect-TS/platform/pull/209) [`9c51aa1`](https://github.com/Effect-TS/platform/commit/9c51aa18beb7fd34023863ca069d3dde372765d8) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.23.1

### Patch Changes

- [#206](https://github.com/Effect-TS/platform/pull/206) [`b47639b`](https://github.com/Effect-TS/platform/commit/b47639b1df021beb075469921e9ef7a08c174555) Thanks [@tim-smart](https://github.com/tim-smart)! - small stream improvements

- [#208](https://github.com/Effect-TS/platform/pull/208) [`41f8a65`](https://github.com/Effect-TS/platform/commit/41f8a650238bfbac5b8e18d58a431c3605b71aa5) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.middleware.withLoggerDisabled

## 0.23.0

### Minor Changes

- [#204](https://github.com/Effect-TS/platform/pull/204) [`ee0c08f`](https://github.com/Effect-TS/platform/commit/ee0c08fd9828eae32696da1bde33d50a3ad9edf3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.22.1

### Patch Changes

- [#194](https://github.com/Effect-TS/platform/pull/194) [`79b71d8`](https://github.com/Effect-TS/platform/commit/79b71d8cb3aa6520b2dcb7930850b423174e04b2) Thanks [@tim-smart](https://github.com/tim-smart)! - add Worker & WorkerRunner modules

## 0.22.0

### Minor Changes

- [#199](https://github.com/Effect-TS/platform/pull/199) [`1e94b15`](https://github.com/Effect-TS/platform/commit/1e94b1588e51df20f9c4fc4871b246048751506c) Thanks [@tim-smart](https://github.com/tim-smart)! - enable tracing by default

## 0.21.0

### Minor Changes

- [#193](https://github.com/Effect-TS/platform/pull/193) [`9ec4b1d`](https://github.com/Effect-TS/platform/commit/9ec4b1d284caa1c4f19a58c46ed7c25fb10d39a5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#191](https://github.com/Effect-TS/platform/pull/191) [`2711aea`](https://github.com/Effect-TS/platform/commit/2711aea855936c82c282e61fbc6d2f1a1ab6778a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.20.0

### Minor Changes

- [#189](https://github.com/Effect-TS/platform/pull/189) [`b07f8cd`](https://github.com/Effect-TS/platform/commit/b07f8cd50ef44d577aa981a532025aedb364df13) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.19.0

### Minor Changes

- [#184](https://github.com/Effect-TS/platform/pull/184) [`903b599`](https://github.com/Effect-TS/platform/commit/903b5995bb407c399846e6b75e47e53098b2c80d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#186](https://github.com/Effect-TS/platform/pull/186) [`a3bcda4`](https://github.com/Effect-TS/platform/commit/a3bcda4c2c6655ab86769cca60bece5eb64f866e) Thanks [@tim-smart](https://github.com/tim-smart)! - add pre response handlers to http

## 0.18.7

### Patch Changes

- [#179](https://github.com/Effect-TS/platform/pull/179) [`843488f`](https://github.com/Effect-TS/platform/commit/843488f79b253518f131693faf2955f5c795a1bc) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.18.6

### Patch Changes

- [#177](https://github.com/Effect-TS/platform/pull/177) [`7e4e2a5`](https://github.com/Effect-TS/platform/commit/7e4e2a5d815c677e4eb6adb2c6e9369414a79384) Thanks [@tim-smart](https://github.com/tim-smart)! - add ClientResponse.schemaNoBody

- [#175](https://github.com/Effect-TS/platform/pull/175) [`d1c2b38`](https://github.com/Effect-TS/platform/commit/d1c2b38cbb1189249c0bfd47582e00ff771428e3) Thanks [@tim-smart](https://github.com/tim-smart)! - make ServerResponse an Effect

## 0.18.5

### Patch Changes

- [#171](https://github.com/Effect-TS/platform/pull/171) [`fbbcaa9`](https://github.com/Effect-TS/platform/commit/fbbcaa9b1d4f48f204072a802fb11bcb29813664) Thanks [@tim-smart](https://github.com/tim-smart)! - remove preserveModules patch for preconstruct

## 0.18.4

### Patch Changes

- [#169](https://github.com/Effect-TS/platform/pull/169) [`bd8778d`](https://github.com/Effect-TS/platform/commit/bd8778d1a534f28cab4b326bb25c086fafed8101) Thanks [@tim-smart](https://github.com/tim-smart)! - fix nested modules

## 0.18.3

### Patch Changes

- [#167](https://github.com/Effect-TS/platform/pull/167) [`7027589`](https://github.com/Effect-TS/platform/commit/7027589d6dde621065eb8834a2b1ba4d3adc943b) Thanks [@tim-smart](https://github.com/tim-smart)! - build with preconstruct

## 0.18.2

### Patch Changes

- [#165](https://github.com/Effect-TS/platform/pull/165) [`7e3a741`](https://github.com/Effect-TS/platform/commit/7e3a74197325566df47f9b4459e518eea0762d13) Thanks [@fubhy](https://github.com/fubhy)! - Fix peer deps version range

## 0.18.1

### Patch Changes

- [#163](https://github.com/Effect-TS/platform/pull/163) [`c957232`](https://github.com/Effect-TS/platform/commit/c9572328ee37f44e93e933da622b21df414bf5c6) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

## 0.18.0

### Minor Changes

- [#160](https://github.com/Effect-TS/platform/pull/160) [`c2dc0ab`](https://github.com/Effect-TS/platform/commit/c2dc0abb20b073fd19e38b4e61a08b1edee0f37f) Thanks [@fubhy](https://github.com/fubhy)! - update to effect package

## 0.17.1

### Patch Changes

- [#158](https://github.com/Effect-TS/platform/pull/158) [`9b10bf3`](https://github.com/Effect-TS/platform/commit/9b10bf394106ba0bafd8440dc0b3fba30a5cc1ea) Thanks [@tim-smart](https://github.com/tim-smart)! - add client transform apis

## 0.17.0

### Minor Changes

- [#156](https://github.com/Effect-TS/platform/pull/156) [`e6c4101`](https://github.com/Effect-TS/platform/commit/e6c41011e5420d90c543dd25d87036d4150f3e85) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.16.1

### Patch Changes

- [#148](https://github.com/Effect-TS/platform/pull/148) [`492f0e7`](https://github.com/Effect-TS/platform/commit/492f0e700e939ded6ff17eeca4d50a9e1ce59219) Thanks [@tim-smart](https://github.com/tim-smart)! - add IncomingMessage.remoteAddress

## 0.16.0

### Minor Changes

- [#145](https://github.com/Effect-TS/platform/pull/145) [`d0522be`](https://github.com/Effect-TS/platform/commit/d0522be6f824571d83be8c6aa16a3d7caa1b3447) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#144](https://github.com/Effect-TS/platform/pull/144) [`6583ad4`](https://github.com/Effect-TS/platform/commit/6583ad4ef5b718620c873208bb11196d35733034) Thanks [@tim-smart](https://github.com/tim-smart)! - b3 header propagation in http client and server

## 0.15.2

### Patch Changes

- [#131](https://github.com/Effect-TS/platform/pull/131) [`06e27ce`](https://github.com/Effect-TS/platform/commit/06e27ce29553ea8d0a234b941fa1de1a51996fbf) Thanks [@jessekelly881](https://github.com/jessekelly881)! - add Clipboard module to /platform-browser

## 0.15.1

### Patch Changes

- [#138](https://github.com/Effect-TS/platform/pull/138) [`2b2f658`](https://github.com/Effect-TS/platform/commit/2b2f6583a7e589a4c7ab8c22bec390ef755f54c3) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Router.WithoutProvided

## 0.15.0

### Minor Changes

- [#135](https://github.com/Effect-TS/platform/pull/135) [`99f2a49`](https://github.com/Effect-TS/platform/commit/99f2a49c614a5b80646f6600a170609fe7e38025) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.14.1

### Patch Changes

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - add http platform abstraction

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - handle HEAD requests

## 0.14.0

### Minor Changes

- [#130](https://github.com/Effect-TS/platform/pull/130) [`2713c4f`](https://github.com/Effect-TS/platform/commit/2713c4f766f5493303221772368710a09033658d) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.13.16

### Patch Changes

- [#125](https://github.com/Effect-TS/platform/pull/125) [`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217) Thanks [@tim-smart](https://github.com/tim-smart)! - restruture platform-node for platform-bun reuse

## 0.13.15

### Patch Changes

- [#123](https://github.com/Effect-TS/platform/pull/123) [`07089a8`](https://github.com/Effect-TS/platform/commit/07089a877fd72b2c1b30016f92af162bbb6ff2c8) Thanks [@tim-smart](https://github.com/tim-smart)! - add ClientResponse.schemaJson

## 0.13.14

### Patch Changes

- [#120](https://github.com/Effect-TS/platform/pull/120) [`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747) Thanks [@tim-smart](https://github.com/tim-smart)! - add KeyValueStore.SchemaStore

- [#111](https://github.com/Effect-TS/platform/pull/111) [`6e96703`](https://github.com/Effect-TS/platform/commit/6e96703186f38bd481bffa906e0f99dee89b8e7e) Thanks [@jessekelly881](https://github.com/jessekelly881)! - add KeyValueStore module

- [#120](https://github.com/Effect-TS/platform/pull/120) [`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747) Thanks [@tim-smart](https://github.com/tim-smart)! - add KeyValueStore.prefix

## 0.13.13

### Patch Changes

- [#117](https://github.com/Effect-TS/platform/pull/117) [`ee7e365`](https://github.com/Effect-TS/platform/commit/ee7e365eafd8b62bab5bc32dd94e3f1190f6e7d6) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for File web api to http

## 0.13.12

### Patch Changes

- [#115](https://github.com/Effect-TS/platform/pull/115) [`4cba795`](https://github.com/Effect-TS/platform/commit/4cba79529426483775782f2384b2194ff57f1279) Thanks [@tim-smart](https://github.com/tim-smart)! - add Router.WithoutProvided

## 0.13.11

### Patch Changes

- [#113](https://github.com/Effect-TS/platform/pull/113) [`5945805`](https://github.com/Effect-TS/platform/commit/59458051ad3885d23c4657369a9a46015f4e569c) Thanks [@tim-smart](https://github.com/tim-smart)! - try to remove route context and requests from Router context

## 0.13.10

### Patch Changes

- [#109](https://github.com/Effect-TS/platform/pull/109) [`7031ec0`](https://github.com/Effect-TS/platform/commit/7031ec030a45a306f4fda4d3ed80796f98a7758e) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Body.EffectBody

## 0.13.9

### Patch Changes

- [#106](https://github.com/Effect-TS/platform/pull/106) [`df3dbcf`](https://github.com/Effect-TS/platform/commit/df3dbcf468d10dca8cdb219478bb0a23bc66da0c) Thanks [@tim-smart](https://github.com/tim-smart)! - add count to http log span

## 0.13.8

### Patch Changes

- [#99](https://github.com/Effect-TS/platform/pull/99) [`e42c3f5`](https://github.com/Effect-TS/platform/commit/e42c3f5103b7361b5162a3e9280759ecd690295f) Thanks [@tim-smart](https://github.com/tim-smart)! - add ClientRequest.bearerToken

- [#105](https://github.com/Effect-TS/platform/pull/105) [`127c8f5`](https://github.com/Effect-TS/platform/commit/127c8f50f69d5cf7e4a50241fca70923f71f61a2) Thanks [@tim-smart](https://github.com/tim-smart)! - add more form data limit config

## 0.13.7

### Patch Changes

- [#97](https://github.com/Effect-TS/platform/pull/97) [`e5c91eb`](https://github.com/Effect-TS/platform/commit/e5c91eb541a6f97cb759ba39732cf08b0ae4c248) Thanks [@tim-smart](https://github.com/tim-smart)! - rename IncomingMessage.urlParams to urlParamsBody

## 0.13.6

### Patch Changes

- [#94](https://github.com/Effect-TS/platform/pull/94) [`cd3b15e`](https://github.com/Effect-TS/platform/commit/cd3b15e0cb223d2788d383caaa7c0dbc06073dc1) Thanks [@tim-smart](https://github.com/tim-smart)! - only use mime module in ServerResponse

## 0.13.5

### Patch Changes

- [#92](https://github.com/Effect-TS/platform/pull/92) [`a034383`](https://github.com/Effect-TS/platform/commit/a0343838bad8f37ab7fb6031084a6514103eba2b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix mime import

## 0.13.4

### Patch Changes

- [#90](https://github.com/Effect-TS/platform/pull/90) [`05d1765`](https://github.com/Effect-TS/platform/commit/05d1765a0606abce8a3c3d026bdcd5d8b3c64936) Thanks [@tim-smart](https://github.com/tim-smart)! - rename Router.transform to Router.use

- [#89](https://github.com/Effect-TS/platform/pull/89) [`30025cb`](https://github.com/Effect-TS/platform/commit/30025cbd773b4ded89ffdb20a523a4350eb0452e) Thanks [@tim-smart](https://github.com/tim-smart)! - add etag generation for http file responses

## 0.13.3

### Patch Changes

- [#86](https://github.com/Effect-TS/platform/pull/86) [`6dfc5b0`](https://github.com/Effect-TS/platform/commit/6dfc5b0fbec0e8a057a26c009f19c9951e4b3ba4) Thanks [@tim-smart](https://github.com/tim-smart)! - add router combinators

- [#88](https://github.com/Effect-TS/platform/pull/88) [`d7fffeb`](https://github.com/Effect-TS/platform/commit/d7fffeb38a1c40ad3847e4e5b966f58939d1ba83) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Middleware.compose

## 0.13.2

### Patch Changes

- [#83](https://github.com/Effect-TS/platform/pull/83) [`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

- [#81](https://github.com/Effect-TS/platform/pull/81) [`c1ec2ba`](https://github.com/Effect-TS/platform/commit/c1ec2bab2b1c134c49a82fd5dbb741b0df3d1cd9) Thanks [@tim-smart](https://github.com/tim-smart)! - use ReadonlyRecord for headers

- [#83](https://github.com/Effect-TS/platform/pull/83) [`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602) Thanks [@tim-smart](https://github.com/tim-smart)! - performance tweaks

## 0.13.1

### Patch Changes

- [#79](https://github.com/Effect-TS/platform/pull/79) [`3544c17`](https://github.com/Effect-TS/platform/commit/3544c17f5778ab47cb4019b6458b2543d572629a) Thanks [@TylorS](https://github.com/TylorS)! - Attempt to derive content-type from headers

## 0.13.0

### Minor Changes

- [#77](https://github.com/Effect-TS/platform/pull/77) [`e97d80b`](https://github.com/Effect-TS/platform/commit/e97d80bd69646195a65ea6dfe13c6af19589d2cf) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Console module

## 0.12.1

### Patch Changes

- [#75](https://github.com/Effect-TS/platform/pull/75) [`d23ff14`](https://github.com/Effect-TS/platform/commit/d23ff14756796e945307ccfdf65252d47f99b7aa) Thanks [@tim-smart](https://github.com/tim-smart)! - add size helpers

## 0.12.0

### Minor Changes

- [#71](https://github.com/Effect-TS/platform/pull/71) [`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9) Thanks [@tim-smart](https://github.com/tim-smart)! - add HttpServer module

### Patch Changes

- [#71](https://github.com/Effect-TS/platform/pull/71) [`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9) Thanks [@tim-smart](https://github.com/tim-smart)! - add SizeInput type

## 0.11.5

### Patch Changes

- [#69](https://github.com/Effect-TS/platform/pull/69) [`0eb7df0`](https://github.com/Effect-TS/platform/commit/0eb7df0e2cbfb96986c3bbee4650c4036a97b1d2) Thanks [@tim-smart](https://github.com/tim-smart)! - have Command & Client implement Pipeable

## 0.11.4

### Patch Changes

- [#67](https://github.com/Effect-TS/platform/pull/67) [`c41a166`](https://github.com/Effect-TS/platform/commit/c41a16614bc4daff05956b84a6bcd01cbb5836dd) Thanks [@tim-smart](https://github.com/tim-smart)! - add node implementation of http client

## 0.11.3

### Patch Changes

- [#64](https://github.com/Effect-TS/platform/pull/64) [`6f2d011`](https://github.com/Effect-TS/platform/commit/6f2d011ce917d74d14b0375525f5c9805f8e44fe) Thanks [@tim-smart](https://github.com/tim-smart)! - fix ClientRequest jsonBody types

## 0.11.2

### Patch Changes

- [#62](https://github.com/Effect-TS/platform/pull/62) [`3d44256`](https://github.com/Effect-TS/platform/commit/3d442560fee94a0c8f01f936a3f7c5b5e1ac8fc2) Thanks [@tim-smart](https://github.com/tim-smart)! - improve http client options type

## 0.11.1

### Patch Changes

- [#38](https://github.com/Effect-TS/platform/pull/38) [`f70a121`](https://github.com/Effect-TS/platform/commit/f70a121b2fc9d1052434863c41657d353d21fb26) Thanks [@tim-smart](https://github.com/tim-smart)! - add HttpClient module

## 0.11.0

### Minor Changes

- [#59](https://github.com/Effect-TS/platform/pull/59) [`b2f7bc0`](https://github.com/Effect-TS/platform/commit/b2f7bc0fe7310d861d52da03fefd9bc91852e5f9) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#58](https://github.com/Effect-TS/platform/pull/58) [`f61aa57`](https://github.com/Effect-TS/platform/commit/f61aa57a915ee221fdf5259cbaf1e4fe208e01b8) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

- [#56](https://github.com/Effect-TS/platform/pull/56) [`efcf469`](https://github.com/Effect-TS/platform/commit/efcf469da368770b2f321043a8e0e33f079c169b) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to peerDependencies

## 0.10.4

### Patch Changes

- [#55](https://github.com/Effect-TS/platform/pull/55) [`67caeff`](https://github.com/Effect-TS/platform/commit/67caeffb5343b4ce428aa3c6b393feb383667fef) Thanks [@tim-smart](https://github.com/tim-smart)! - add labels to Tags

- [#46](https://github.com/Effect-TS/platform/pull/46) [`4a4d0af`](https://github.com/Effect-TS/platform/commit/4a4d0af4832f543fc53b2ba5c9fc9739bbc78f2e) Thanks [@fubhy](https://github.com/fubhy)! - add seek method to file handles

- [#54](https://github.com/Effect-TS/platform/pull/54) [`b3950e1`](https://github.com/Effect-TS/platform/commit/b3950e1373673ae492106fe0cb76bcd32fbe5a2b) Thanks [@tim-smart](https://github.com/tim-smart)! - add writeFileString

## 0.10.3

### Patch Changes

- [#51](https://github.com/Effect-TS/platform/pull/51) [`9163d96`](https://github.com/Effect-TS/platform/commit/9163d96717a832e9dbf2bdd262d73034fcbe92e9) Thanks [@tim-smart](https://github.com/tim-smart)! - revert exists change

## 0.10.2

### Patch Changes

- [#49](https://github.com/Effect-TS/platform/pull/49) [`44eaaf5`](https://github.com/Effect-TS/platform/commit/44eaaf5c182dc70c73b7da9687e9c0a81daea86c) Thanks [@tim-smart](https://github.com/tim-smart)! - fix exists catching wrong error

## 0.10.1

### Patch Changes

- [#47](https://github.com/Effect-TS/platform/pull/47) [`24b56d5`](https://github.com/Effect-TS/platform/commit/24b56d5d6afa40df072e2db37ebd71df538e66ac) Thanks [@tim-smart](https://github.com/tim-smart)! - add exists and readFileString to FileSystem

## 0.10.0

### Minor Changes

- [#41](https://github.com/Effect-TS/platform/pull/41) [`68cbdca`](https://github.com/Effect-TS/platform/commit/68cbdca7e9da509c212d44101ab61c3bcf1354ad) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data, /io and /stream

## 0.9.0

### Minor Changes

- [#39](https://github.com/Effect-TS/platform/pull/39) [`3012e28`](https://github.com/Effect-TS/platform/commit/3012e289272d383fdae16af6b3ba396dec290b77) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.8.0

### Minor Changes

- [#36](https://github.com/Effect-TS/platform/pull/36) [`b82cbcc`](https://github.com/Effect-TS/platform/commit/b82cbcc56789c014f0a50c505497239ec220f4fd) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 0.7.0

### Minor Changes

- [#34](https://github.com/Effect-TS/platform/pull/34) [`601d045`](https://github.com/Effect-TS/platform/commit/601d04526ad0a2e3285de509fdf86c7b6809a547) Thanks [@tim-smart](https://github.com/tim-smart)! - update /stream

## 0.6.0

### Minor Changes

- [#32](https://github.com/Effect-TS/platform/pull/32) [`ee94eae`](https://github.com/Effect-TS/platform/commit/ee94eae46aee327baf0c6960befa6c35154fa35b) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.5.0

### Minor Changes

- [#28](https://github.com/Effect-TS/platform/pull/28) [`f3d73f5`](https://github.com/Effect-TS/platform/commit/f3d73f587ad9b528bb1e37cf44e4928d913f56dd) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 0.4.0

### Minor Changes

- [#26](https://github.com/Effect-TS/platform/pull/26) [`834e1a7`](https://github.com/Effect-TS/platform/commit/834e1a793365f4deb742814d9cd6df9faae9d0c2) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.3.0

### Minor Changes

- [#22](https://github.com/Effect-TS/platform/pull/22) [`645f10f`](https://github.com/Effect-TS/platform/commit/645f10f6d6a8600e369f068b22f3c2ef5169e867) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 0.2.0

### Minor Changes

- [#20](https://github.com/Effect-TS/platform/pull/20) [`756ccbe`](https://github.com/Effect-TS/platform/commit/756ccbe002f2e00c02b88aac126c2bc5b17a5769) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to `@effect/data@0.13.5`, `@effect/io@0.31.3`, and `@effect/stream@0.25.1`

## 0.1.0

### Minor Changes

- [#13](https://github.com/Effect-TS/platform/pull/13) [`b95c25f`](https://github.com/Effect-TS/platform/commit/b95c25f619b8e5ebf915f675f63de01accb1a8b8) Thanks [@tim-smart](https://github.com/tim-smart)! - initial release
