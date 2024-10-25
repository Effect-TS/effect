# @effect/platform-node

## 0.63.1

### Patch Changes

- Updated dependencies [[`b75ac5d`](https://github.com/Effect-TS/effect/commit/b75ac5d0909115507bedc90f18f2d34deb217769)]:
  - @effect/platform@0.68.1
  - @effect/platform-node-shared@0.18.1

## 0.63.0

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

- Updated dependencies [[`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363)]:
  - @effect/platform@0.68.0
  - @effect/platform-node-shared@0.18.0

## 0.62.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - @effect/platform@0.67.1
  - effect@3.9.1
  - @effect/platform-node-shared@0.17.1

## 0.62.0

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/platform@0.67.0
  - @effect/platform-node-shared@0.17.0

## 0.61.4

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`8e94585`](https://github.com/Effect-TS/effect/commit/8e94585abe62753bf3af28bfae77926a7c570ac3), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/platform@0.66.3
  - @effect/platform-node-shared@0.16.4

## 0.61.3

### Patch Changes

- Updated dependencies [[`660cd0f`](https://github.com/Effect-TS/effect/commit/660cd0f93610e5e5588f25b852ae7cf4f1dd05bc)]:
  - @effect/platform-node-shared@0.16.3

## 0.61.2

### Patch Changes

- Updated dependencies [[`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/platform@0.66.2
  - effect@3.8.4
  - @effect/platform-node-shared@0.16.2

## 0.61.1

### Patch Changes

- Updated dependencies [[`3812788`](https://github.com/Effect-TS/effect/commit/3812788d79caaab8f559a62fd443018a04ac5647), [`0e0af6d`](https://github.com/Effect-TS/effect/commit/0e0af6d6593d041bd2cdbced9fdaf8265ce166f2)]:
  - @effect/platform@0.66.1
  - @effect/platform-node-shared@0.16.1

## 0.61.0

### Patch Changes

- Updated dependencies []:
  - @effect/platform-node-shared@0.16.0
  - @effect/platform@0.66.0

## 0.60.5

### Patch Changes

- Updated dependencies [[`321b201`](https://github.com/Effect-TS/effect/commit/321b201adcb6bbbeb806b3467dd0b4cf063ccda8), [`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - @effect/platform@0.65.5
  - effect@3.8.3
  - @effect/platform-node-shared@0.15.5

## 0.60.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.65.4
  - @effect/platform-node-shared@0.15.4

## 0.60.3

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2
  - @effect/platform@0.65.3
  - @effect/platform-node-shared@0.15.3

## 0.60.2

### Patch Changes

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`cd75658`](https://github.com/Effect-TS/effect/commit/cd756584c352064cb1654be7118a925d57475d49), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1
  - @effect/platform-node-shared@0.15.2
  - @effect/platform@0.65.2

## 0.60.1

### Patch Changes

- Updated dependencies [[`e44c5f2`](https://github.com/Effect-TS/effect/commit/e44c5f228215738fe4e75023c7461bf9521249cb)]:
  - @effect/platform@0.65.1
  - @effect/platform-node-shared@0.15.1

## 0.60.0

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

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`6a128f6`](https://github.com/Effect-TS/effect/commit/6a128f63f9b41fec2db70790b3bbb96cb9afa1ab), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`7041393`](https://github.com/Effect-TS/effect/commit/7041393cff132e96566d3f36da0483a6ff6195e4), [`e0d21a5`](https://github.com/Effect-TS/effect/commit/e0d21a54c8323728fbb75a32f4820a9996257809), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0
  - @effect/platform@0.65.0
  - @effect/platform-node-shared@0.15.0

## 0.59.1

### Patch Changes

- Updated dependencies [[`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be), [`8261c5a`](https://github.com/Effect-TS/effect/commit/8261c5ae6fe86872292ec1fc1a58ab9cea2f5f51)]:
  - effect@3.7.3
  - @effect/platform@0.64.1
  - @effect/platform-node-shared@0.14.1

## 0.59.0

### Minor Changes

- [#3565](https://github.com/Effect-TS/effect/pull/3565) [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a) Thanks @tim-smart! - move Etag implementation to /platform

### Patch Changes

- Updated dependencies [[`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9)]:
  - @effect/platform-node-shared@0.14.0
  - @effect/platform@0.64.0

## 0.58.3

### Patch Changes

- Updated dependencies [[`4a701c4`](https://github.com/Effect-TS/effect/commit/4a701c406da032563fedae459536c00ae5cfe3c7), [`64c2292`](https://github.com/Effect-TS/effect/commit/64c22927aa01e0159b0fa98ff55e742069af399c)]:
  - @effect/platform@0.63.3
  - @effect/platform-node-shared@0.13.3

## 0.58.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2
  - @effect/platform@0.63.2
  - @effect/platform-node-shared@0.13.2

## 0.58.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1
  - @effect/platform@0.63.1
  - @effect/platform-node-shared@0.13.1

## 0.58.0

### Patch Changes

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0
  - @effect/platform@0.63.0
  - @effect/platform-node-shared@0.13.0

## 0.57.5

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8
  - @effect/platform@0.62.5
  - @effect/platform-node-shared@0.12.5

## 0.57.4

### Patch Changes

- Updated dependencies [[`e7a65e3`](https://github.com/Effect-TS/effect/commit/e7a65e3c6a08636bbfce3d3af3098bf28474364d), [`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - @effect/platform-node-shared@0.12.4
  - @effect/platform@0.62.4
  - effect@3.6.7

## 0.57.3

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6
  - @effect/platform@0.62.3
  - @effect/platform-node-shared@0.12.3

## 0.57.2

### Patch Changes

- Updated dependencies [[`413994c`](https://github.com/Effect-TS/effect/commit/413994c9792f16d9d57cca3ae6eb254bf93bd261), [`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae)]:
  - @effect/platform@0.62.2
  - effect@3.6.5
  - @effect/platform-node-shared@0.12.2

## 0.57.1

### Patch Changes

- Updated dependencies [[`9efe0e5`](https://github.com/Effect-TS/effect/commit/9efe0e5b57ac557399be620822c21cc6e9add285)]:
  - @effect/platform@0.62.1
  - @effect/platform-node-shared@0.12.1

## 0.57.0

### Patch Changes

- [#3450](https://github.com/Effect-TS/effect/pull/3450) [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4)]:
  - effect@3.6.4
  - @effect/platform@0.62.0
  - @effect/platform-node-shared@0.12.0

## 0.56.9

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/platform@0.61.8
  - @effect/platform-node-shared@0.11.8

## 0.56.8

### Patch Changes

- Updated dependencies [[`17245a4`](https://github.com/Effect-TS/effect/commit/17245a4e783c19dee51529600b3b40f164fa59bc), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09)]:
  - @effect/platform@0.61.7
  - @effect/platform-node-shared@0.11.7

## 0.56.7

### Patch Changes

- Updated dependencies [[`d829b57`](https://github.com/Effect-TS/effect/commit/d829b576357f2e3b203ab7e107a1492de903a106), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/platform@0.61.6
  - effect@3.6.2
  - @effect/platform-node-shared@0.11.6

## 0.56.6

### Patch Changes

- [#3428](https://github.com/Effect-TS/effect/pull/3428) [`76b0496`](https://github.com/Effect-TS/effect/commit/76b0496ff9d7670e3f4c07ae924d30ed7f613cee) Thanks @tim-smart! - fix for missing global undici dispatcher

## 0.56.5

### Patch Changes

- [#3409](https://github.com/Effect-TS/effect/pull/3409) [`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38) Thanks @sukovanej! - Add `NodeHttpServer.layerTest`.

  ```ts
  import { HttpClientRequest, HttpRouter, HttpServer } from "@effect/platform"
  import { NodeHttpServer } from "@effect/platform-node"
  import { expect, it } from "@effect/vitest"
  import { Effect } from "effect"

  it.scoped("test", () =>
    Effect.gen(function* () {
      yield* HttpServer.serveEffect(HttpRouter.empty)
      const response = yield* HttpClientRequest.get("/")
      expect(response.status, 404)
    }).pipe(Effect.provide(NodeHttpServer.layerTest))
  )
  ```

- Updated dependencies [[`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38)]:
  - @effect/platform@0.61.5
  - @effect/platform-node-shared@0.11.5

## 0.56.4

### Patch Changes

- Updated dependencies [[`e7cb109`](https://github.com/Effect-TS/effect/commit/e7cb109d0754207024a64d55b6bd2a674dd8ed7d)]:
  - @effect/platform@0.61.4
  - @effect/platform-node-shared@0.11.4

## 0.56.3

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`fb9f786`](https://github.com/Effect-TS/effect/commit/fb9f7867f0c895e63f9ef23e8d0941248c42179d), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/platform@0.61.3
  - @effect/platform-node-shared@0.11.3

## 0.56.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.61.2
  - @effect/platform-node-shared@0.11.2

## 0.56.1

### Patch Changes

- Updated dependencies [[`11223bf`](https://github.com/Effect-TS/effect/commit/11223bf9cbf5b822e0bf9a9fb2b35b2ad88af692)]:
  - @effect/platform@0.61.1
  - @effect/platform-node-shared@0.11.1

## 0.56.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/platform@0.61.0
  - @effect/platform-node-shared@0.11.0

## 0.55.3

### Patch Changes

- Updated dependencies [[`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - effect@3.5.9
  - @effect/platform@0.60.3
  - @effect/platform-node-shared@0.10.3

## 0.55.2

### Patch Changes

- Updated dependencies [[`eb4d014`](https://github.com/Effect-TS/effect/commit/eb4d014c559e1b4c95b3fb9295fe77593c17ed7a), [`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231), [`fc20f73`](https://github.com/Effect-TS/effect/commit/fc20f73c69e577981cb64714de2adc97e1004dae)]:
  - @effect/platform@0.60.2
  - effect@3.5.8
  - @effect/platform-node-shared@0.10.2

## 0.55.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.1
  - @effect/platform-node-shared@0.10.1

## 0.55.0

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.60.0
  - @effect/platform-node-shared@0.10.0

## 0.54.4

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc)]:
  - effect@3.5.7
  - @effect/platform@0.59.3
  - @effect/platform-node-shared@0.9.3

## 0.54.3

### Patch Changes

- Updated dependencies [[`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - effect@3.5.6
  - @effect/platform@0.59.2
  - @effect/platform-node-shared@0.9.2

## 0.54.2

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39), [`fcecff7`](https://github.com/Effect-TS/effect/commit/fcecff7f7e12b295a252f124861b801c73072151), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65)]:
  - effect@3.5.5
  - @effect/platform@0.59.1
  - @effect/platform-node-shared@0.9.1

## 0.54.1

### Patch Changes

- [#3265](https://github.com/Effect-TS/effect/pull/3265) [`07db4ac`](https://github.com/Effect-TS/effect/commit/07db4ac8da9d07ce31bd62470a73e362a4291a0c) Thanks @tim-smart! - add NodeHttpServerRequest.toServerResponse for accessing the raw node response

## 0.54.0

### Minor Changes

- [#3260](https://github.com/Effect-TS/effect/pull/3260) [`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c) Thanks @tim-smart! - replace /platform RefailError with use of the "cause" property

- [#3255](https://github.com/Effect-TS/effect/pull/3255) [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c) Thanks @tim-smart! - refactor & simplify /platform backing workers

  Improves worker performance by 2x

### Patch Changes

- [#3253](https://github.com/Effect-TS/effect/pull/3253) [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c), [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - @effect/platform-node-shared@0.9.0
  - @effect/platform@0.59.0
  - effect@3.5.4

## 0.53.26

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`a1db40a`](https://github.com/Effect-TS/effect/commit/a1db40a650ab842e778654f0d88e80f2ef4fd6f3), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/platform@0.58.27
  - @effect/platform-node-shared@0.8.26

## 0.53.25

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/platform@0.58.26
  - @effect/platform-node-shared@0.8.25

## 0.53.24

### Patch Changes

- Updated dependencies [[`0623fca`](https://github.com/Effect-TS/effect/commit/0623fca41679b0e3c5a10dd0f8985f91670bd721)]:
  - @effect/platform@0.58.25
  - @effect/platform-node-shared@0.8.24

## 0.53.23

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/platform@0.58.24
  - @effect/platform-node-shared@0.8.23

## 0.53.22

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/platform@0.58.23
  - @effect/platform-node-shared@0.8.22

## 0.53.21

### Patch Changes

- [#3209](https://github.com/Effect-TS/effect/pull/3209) [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d) Thanks @tim-smart! - simplify /platform http response handling

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9
  - @effect/platform@0.58.22
  - @effect/platform-node-shared@0.8.21

## 0.53.20

### Patch Changes

- Updated dependencies [[`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c)]:
  - effect@3.4.8
  - @effect/platform@0.58.21
  - @effect/platform-node-shared@0.8.20

## 0.53.19

### Patch Changes

- Updated dependencies [[`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - effect@3.4.7
  - @effect/platform@0.58.20
  - @effect/platform-node-shared@0.8.19

## 0.53.18

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.19
  - @effect/platform-node-shared@0.8.18

## 0.53.17

### Patch Changes

- Updated dependencies [[`7f8900a`](https://github.com/Effect-TS/effect/commit/7f8900a1de9addeb0d371103a2c5c2aa3e4ff95e)]:
  - @effect/platform@0.58.18
  - @effect/platform-node-shared@0.8.17

## 0.53.16

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6
  - @effect/platform@0.58.17
  - @effect/platform-node-shared@0.8.16

## 0.53.15

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.16
  - @effect/platform-node-shared@0.8.15

## 0.53.14

### Patch Changes

- Updated dependencies [[`baa90df`](https://github.com/Effect-TS/effect/commit/baa90df9663f5f37d7b6814dad25142d53dbc720)]:
  - @effect/platform@0.58.15
  - @effect/platform-node-shared@0.8.14

## 0.53.13

### Patch Changes

- Updated dependencies [[`52a87c7`](https://github.com/Effect-TS/effect/commit/52a87c7a0b9536398deaf8ec507e53a82c607219), [`6d2280e`](https://github.com/Effect-TS/effect/commit/6d2280e9497c95cb0e965ca462c825345074eedf)]:
  - @effect/platform@0.58.14
  - @effect/platform-node-shared@0.8.13

## 0.53.12

### Patch Changes

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91), [`dbd53ea`](https://github.com/Effect-TS/effect/commit/dbd53ea363c71a24449cb068251054c3a1acf864)]:
  - effect@3.4.5
  - @effect/platform@0.58.13
  - @effect/platform-node-shared@0.8.12

## 0.53.11

### Patch Changes

- Updated dependencies [[`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c)]:
  - @effect/platform@0.58.12
  - effect@3.4.4
  - @effect/platform-node-shared@0.8.11

## 0.53.10

### Patch Changes

- Updated dependencies [[`a5b95b5`](https://github.com/Effect-TS/effect/commit/a5b95b548284e4798654ae7ce6883fa49108f0ea), [`5e29579`](https://github.com/Effect-TS/effect/commit/5e29579187cb8420ea4930b3999fec984f8999f4)]:
  - @effect/platform@0.58.11
  - @effect/platform-node-shared@0.8.10

## 0.53.9

### Patch Changes

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update dependencies

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd), [`ab3180f`](https://github.com/Effect-TS/effect/commit/ab3180f827041d0ea3b2d72254a1a8683e99e056), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - @effect/platform@0.58.10
  - effect@3.4.3
  - @effect/platform-node-shared@0.8.9

## 0.53.8

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.9
  - @effect/platform-node-shared@0.8.8

## 0.53.7

### Patch Changes

- Updated dependencies [[`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - effect@3.4.2
  - @effect/platform@0.58.8
  - @effect/platform-node-shared@0.8.7

## 0.53.6

### Patch Changes

- Updated dependencies [[`027004a`](https://github.com/Effect-TS/effect/commit/027004a897f654791e75faa28eefb50dd0244b6e)]:
  - @effect/platform@0.58.7
  - @effect/platform-node-shared@0.8.6

## 0.53.5

### Patch Changes

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a), [`2e8e252`](https://github.com/Effect-TS/effect/commit/2e8e2520cac712f0eb644553bd476429ebd674e4)]:
  - effect@3.4.1
  - @effect/platform@0.58.6
  - @effect/platform-node-shared@0.8.5

## 0.53.4

### Patch Changes

- Updated dependencies [[`37a07a2`](https://github.com/Effect-TS/effect/commit/37a07a2d8d1ce09ab965c0ada84a3fae9a6aba05)]:
  - @effect/platform@0.58.5
  - @effect/platform-node-shared@0.8.4

## 0.53.3

### Patch Changes

- Updated dependencies [[`b77fb0a`](https://github.com/Effect-TS/effect/commit/b77fb0a811ec1ad0e794917077c9a90824515db8)]:
  - @effect/platform@0.58.4
  - @effect/platform-node-shared@0.8.3

## 0.53.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.3
  - @effect/platform-node-shared@0.8.2

## 0.53.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.58.2
  - @effect/platform-node-shared@0.8.1

## 0.53.0

### Minor Changes

- [#3036](https://github.com/Effect-TS/effect/pull/3036) [`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973) Thanks @tim-smart! - rename NodeSocket.fromNetSocket to .fromDuplex

### Patch Changes

- Updated dependencies [[`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973), [`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973)]:
  - @effect/platform@0.58.1
  - @effect/platform-node-shared@0.8.0

## 0.52.0

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

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`63dd0c3`](https://github.com/Effect-TS/effect/commit/63dd0c3af45876c1caad7d03356c74daf551c628), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0
  - @effect/platform-node-shared@0.7.0
  - @effect/platform@0.58.0

## 0.51.17

### Patch Changes

- Updated dependencies [[`3ba7ea1`](https://github.com/Effect-TS/effect/commit/3ba7ea1c3c2923e85bf2f17e41176f8f8796d203)]:
  - @effect/platform-node-shared@0.6.17
  - @effect/platform@0.57.8

## 0.51.16

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.57.7
  - @effect/platform-node-shared@0.6.16

## 0.51.15

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.57.6
  - @effect/platform-node-shared@0.6.15

## 0.51.14

### Patch Changes

- Updated dependencies [[`b8ea6aa`](https://github.com/Effect-TS/effect/commit/b8ea6aa479006358042b4256ee0a1c5cfbe57acb)]:
  - @effect/platform@0.57.5
  - @effect/platform-node-shared@0.6.14

## 0.51.13

### Patch Changes

- Updated dependencies [[`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7)]:
  - effect@3.3.5
  - @effect/platform@0.57.4
  - @effect/platform-node-shared@0.6.13

## 0.51.12

### Patch Changes

- Updated dependencies [[`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352)]:
  - effect@3.3.4
  - @effect/platform@0.57.3
  - @effect/platform-node-shared@0.6.12

## 0.51.11

### Patch Changes

- Updated dependencies [[`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad), [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d)]:
  - effect@3.3.3
  - @effect/platform@0.57.2
  - @effect/platform-node-shared@0.6.11

## 0.51.10

### Patch Changes

- Updated dependencies [[`07e12ec`](https://github.com/Effect-TS/effect/commit/07e12ecdb0e20b9763bd9e9058e567a7c8862efc), [`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd), [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85), [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2), [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d)]:
  - @effect/platform-node-shared@0.6.10
  - @effect/platform@0.57.1
  - effect@3.3.2

## 0.51.9

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`4d3fbe8`](https://github.com/Effect-TS/effect/commit/4d3fbe82e8cec13ccd0cd0b2096deac6818fb59a), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36)]:
  - effect@3.3.1
  - @effect/platform@0.57.0
  - @effect/platform-node-shared@0.6.9

## 0.51.8

### Patch Changes

- Updated dependencies [[`2b9ddfc`](https://github.com/Effect-TS/effect/commit/2b9ddfcbac505d98551e764a43923854907ca5c1), [`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`188f0a5`](https://github.com/Effect-TS/effect/commit/188f0a5c57ed0d7c9e5852e0c1c998f1b95810a1), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - @effect/platform@0.56.0
  - effect@3.3.0
  - @effect/platform-node-shared@0.6.8

## 0.51.7

### Patch Changes

- Updated dependencies [[`a67d602`](https://github.com/Effect-TS/effect/commit/a67d60276f96cd20b76145b4cee13efca6c6158a)]:
  - @effect/platform@0.55.7
  - @effect/platform-node-shared@0.6.7

## 0.51.6

### Patch Changes

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa), [`799aa20`](https://github.com/Effect-TS/effect/commit/799aa20b4f618736ba33a5297fda90a75d4c26c6)]:
  - effect@3.2.9
  - @effect/platform@0.55.6
  - @effect/platform-node-shared@0.6.6

## 0.51.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.55.5
  - @effect/platform-node-shared@0.6.5

## 0.51.4

### Patch Changes

- Updated dependencies [[`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - effect@3.2.8
  - @effect/platform@0.55.4
  - @effect/platform-node-shared@0.6.4

## 0.51.3

### Patch Changes

- Updated dependencies [[`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - effect@3.2.7
  - @effect/platform@0.55.3
  - @effect/platform-node-shared@0.6.3

## 0.51.2

### Patch Changes

- Updated dependencies [[`2c2280b`](https://github.com/Effect-TS/effect/commit/2c2280b98a11fc002663c55792a4fa5781cd5fb6), [`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba)]:
  - @effect/platform@0.55.2
  - effect@3.2.6
  - @effect/platform-node-shared@0.6.2

## 0.51.1

### Patch Changes

- Updated dependencies [[`c5c94ed`](https://github.com/Effect-TS/effect/commit/c5c94edf1ddb0abb5c0e2adbb4ec2578a98d8e07)]:
  - @effect/platform-node-shared@0.6.1
  - @effect/platform@0.55.1

## 0.51.0

### Minor Changes

- [#2835](https://github.com/Effect-TS/effect/pull/2835) [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9) Thanks @tim-smart! - remove pool resizing in platform workers to enable concurrent access

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0), [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9)]:
  - effect@3.2.5
  - @effect/platform@0.55.0
  - @effect/platform-node-shared@0.6.0

## 0.50.0

### Minor Changes

- [#2801](https://github.com/Effect-TS/effect/pull/2801) [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3) Thanks @tim-smart! - remove `permits` from workers, to prevent issues with pool resizing

### Patch Changes

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`c07e0ce`](https://github.com/Effect-TS/effect/commit/c07e0cea8ce165887e2c9dfa5d669eba9b2fb798), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3)]:
  - effect@3.2.4
  - @effect/platform@0.54.0
  - @effect/platform-node-shared@0.5.0

## 0.49.14

### Patch Changes

- [#2803](https://github.com/Effect-TS/effect/pull/2803) [`5af633e`](https://github.com/Effect-TS/effect/commit/5af633eb5ff6560a64d87263d1692bb9c75f7b3c) Thanks @tim-smart! - update dependencies

- Updated dependencies [[`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - effect@3.2.3
  - @effect/platform@0.53.14
  - @effect/platform-node-shared@0.4.33

## 0.49.13

### Patch Changes

- [#2796](https://github.com/Effect-TS/effect/pull/2796) [`7cc8020`](https://github.com/Effect-TS/effect/commit/7cc802018395804ae2fbce20f610bb7ff6081c00) Thanks @tim-smart! - wait for callback in node http server responses

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2), [`c1eaef9`](https://github.com/Effect-TS/effect/commit/c1eaef910420dae416923d172ee58d219e921d0f)]:
  - effect@3.2.2
  - @effect/platform@0.53.13
  - @effect/platform-node-shared@0.4.32

## 0.49.12

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.12
  - @effect/platform-node-shared@0.4.31

## 0.49.11

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1
  - @effect/platform@0.53.11
  - @effect/platform-node-shared@0.4.30

## 0.49.10

### Patch Changes

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0
  - @effect/platform@0.53.10
  - @effect/platform-node-shared@0.4.29

## 0.49.9

### Patch Changes

- Updated dependencies [[`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e)]:
  - @effect/platform@0.53.9
  - effect@3.1.6
  - @effect/platform-node-shared@0.4.28

## 0.49.8

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.8
  - @effect/platform-node-shared@0.4.27

## 0.49.7

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.7
  - @effect/platform-node-shared@0.4.26

## 0.49.6

### Patch Changes

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610), [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - @effect/platform-node-shared@0.4.25
  - @effect/platform@0.53.6
  - effect@3.1.5

## 0.49.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.5
  - @effect/platform-node-shared@0.4.24

## 0.49.4

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4
  - @effect/platform@0.53.4
  - @effect/platform-node-shared@0.4.23

## 0.49.3

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.3
  - @effect/platform-node-shared@0.4.22

## 0.49.2

### Patch Changes

- [#2706](https://github.com/Effect-TS/effect/pull/2706) [`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e) Thanks [@sukovanej](https://github.com/sukovanej)! - Attempt to close a server only if `listen` succeeds. This fixes the error reporting in case a port is already in use.

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3
  - @effect/platform@0.53.2
  - @effect/platform-node-shared@0.4.21

## 0.49.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.53.1
  - @effect/platform-node-shared@0.4.20

## 0.49.0

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

### Patch Changes

- Updated dependencies [[`d57fbbb`](https://github.com/Effect-TS/effect/commit/d57fbbbd6c466936213a671fc3cd2390064f864e)]:
  - @effect/platform@0.53.0
  - @effect/platform-node-shared@0.4.19

## 0.48.4

### Patch Changes

- Updated dependencies [[`5866c62`](https://github.com/Effect-TS/effect/commit/5866c621d7eb4cc84e4ba972bfdfd219734cd45d)]:
  - @effect/platform@0.52.3
  - @effect/platform-node-shared@0.4.18

## 0.48.3

### Patch Changes

- [#2689](https://github.com/Effect-TS/effect/pull/2689) [`e4b82d2`](https://github.com/Effect-TS/effect/commit/e4b82d239bf0974173b5d687b45d1b1899be615f) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure http response middleware is interruptible

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - @effect/platform@0.52.2
  - effect@3.1.2
  - @effect/platform-node-shared@0.4.17

## 0.48.2

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1
  - @effect/platform@0.52.1
  - @effect/platform-node-shared@0.4.16

## 0.48.1

### Patch Changes

- Updated dependencies [[`9deab0a`](https://github.com/Effect-TS/effect/commit/9deab0aec9e99501f9441843e34df9afa10c5be9), [`7719b8a`](https://github.com/Effect-TS/effect/commit/7719b8a7350c14e952ffe685bfd5308773b3e271)]:
  - @effect/platform@0.52.0
  - @effect/platform-node-shared@0.4.15

## 0.48.0

### Minor Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`0ec93cb`](https://github.com/Effect-TS/effect/commit/0ec93cb4f166e7401c171c2f8e8276ce958d9a57) Thanks [@github-actions](https://github.com/apps/github-actions)! - \* capitalised Http.multipart.FileSchema and Http.multipart.FilesSchema
  - exported Http.multipart.FileSchema
  - added Http.multipart.SingleFileSchema

### Patch Changes

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`0ec93cb`](https://github.com/Effect-TS/effect/commit/0ec93cb4f166e7401c171c2f8e8276ce958d9a57), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0
  - @effect/platform@0.51.0
  - @effect/platform-node-shared@0.4.14

## 0.47.8

### Patch Changes

- [#2656](https://github.com/Effect-TS/effect/pull/2656) [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`16039a0`](https://github.com/Effect-TS/effect/commit/16039a08f04f11545e2fdf40952788a8f9cef04f), [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`d1d33e1`](https://github.com/Effect-TS/effect/commit/d1d33e10b25109f44b5ab1c6e4d778a59c0d3eeb), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - @effect/platform@0.50.8
  - @effect/platform-node-shared@0.4.13
  - effect@3.0.8

## 0.47.7

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7
  - @effect/platform@0.50.7
  - @effect/platform-node-shared@0.4.12

## 0.47.6

### Patch Changes

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1)]:
  - effect@3.0.6
  - @effect/platform@0.50.6
  - @effect/platform-node-shared@0.4.11

## 0.47.5

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5
  - @effect/platform@0.50.5
  - @effect/platform-node-shared@0.4.10

## 0.47.4

### Patch Changes

- Updated dependencies [[`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - effect@3.0.4
  - @effect/platform@0.50.4
  - @effect/platform-node-shared@0.4.9

## 0.47.3

### Patch Changes

- Updated dependencies [[`b3b51a2`](https://github.com/Effect-TS/effect/commit/b3b51a2ea0c6ab92a363db46ebaa7e1176d089f5)]:
  - @effect/platform@0.50.3
  - @effect/platform-node-shared@0.4.8

## 0.47.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.50.2
  - @effect/platform-node-shared@0.4.7

## 0.47.1

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.50.1
  - @effect/platform-node-shared@0.4.6

## 0.47.0

### Minor Changes

- [#2567](https://github.com/Effect-TS/effect/pull/2567) [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6) Thanks [@tim-smart](https://github.com/tim-smart)! - add URL & AbortSignal to Http.client.makeDefault

### Patch Changes

- [#2567](https://github.com/Effect-TS/effect/pull/2567) [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6) Thanks [@tim-smart](https://github.com/tim-smart)! - add more span attributes to http traces

- Updated dependencies [[`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6), [`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e), [`a3b0e6c`](https://github.com/Effect-TS/effect/commit/a3b0e6c490772e6d44b5d98dcf2729c4d5310ecc), [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6)]:
  - @effect/platform@0.50.0
  - effect@3.0.3
  - @effect/platform-node-shared@0.4.5

## 0.46.4

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - @effect/platform-node-shared@0.4.4
  - @effect/platform@0.49.4
  - effect@3.0.2

## 0.46.3

### Patch Changes

- Updated dependencies [[`8d39d65`](https://github.com/Effect-TS/effect/commit/8d39d6554af548228ad767112ce2e0b1f68fa8e1)]:
  - @effect/platform@0.49.3
  - @effect/platform-node-shared@0.4.3

## 0.46.2

### Patch Changes

- Updated dependencies [[`5ef0a1a`](https://github.com/Effect-TS/effect/commit/5ef0a1ae9b773fa2481550cb0d43ff7a0e03cd44)]:
  - @effect/platform-node-shared@0.4.2
  - @effect/platform@0.49.2

## 0.46.1

### Patch Changes

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`87c5687`](https://github.com/Effect-TS/effect/commit/87c5687de0782dab177b7861217fa3b040046282), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1
  - @effect/platform-node-shared@0.4.1
  - @effect/platform@0.49.1

## 0.46.0

### Minor Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2) Thanks [@github-actions](https://github.com/apps/github-actions)! - Swap type parameters in /platform data types

  A codemod has been released to make migration easier:

  ```
  npx @effect/codemod platform-0.49 src/**/*
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1) Thanks [@github-actions](https://github.com/apps/github-actions)! - replace use of `unit` terminology with `void`

  For all the data types.

  ```ts
  Effect.unit // => Effect.void
  Stream.unit // => Stream.void

  // etc
  ```

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Patch Changes

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769) Thanks [@github-actions](https://github.com/apps/github-actions)! - allow specifying undici options through a fiber ref

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`6460414`](https://github.com/Effect-TS/effect/commit/6460414351a45fb8e0a457c63f3653422efee766) Thanks [@github-actions](https://github.com/apps/github-actions)! - properly handle multiple ports in SharedWorker

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`6460414`](https://github.com/Effect-TS/effect/commit/6460414351a45fb8e0a457c63f3653422efee766), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`25d74f8`](https://github.com/Effect-TS/effect/commit/25d74f8c4d2dd4a9e5ec57ce2f20d36dedd25343), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0
  - @effect/platform@0.49.0
  - @effect/platform-node-shared@0.4.0

## 0.45.31

### Patch Changes

- [#2517](https://github.com/Effect-TS/effect/pull/2517) [`b79cc59`](https://github.com/Effect-TS/effect/commit/b79cc59dbe64b9a0a7742dc9100a9d36c8e46b72) Thanks [@tim-smart](https://github.com/tim-smart)! - add uninterruptible option to http routes, for marking a route as uninterruptible

- Updated dependencies [[`b79cc59`](https://github.com/Effect-TS/effect/commit/b79cc59dbe64b9a0a7742dc9100a9d36c8e46b72)]:
  - @effect/platform@0.48.29
  - @effect/platform-node-shared@0.3.29

## 0.45.30

### Patch Changes

- [#2504](https://github.com/Effect-TS/effect/pull/2504) [`da22adc`](https://github.com/Effect-TS/effect/commit/da22adc6507563876f1c416fd22a5f9206cc1395) Thanks [@tim-smart](https://github.com/tim-smart)! - use a FiberSet to run http server fibers

- [#2515](https://github.com/Effect-TS/effect/pull/2515) [`d590094`](https://github.com/Effect-TS/effect/commit/d5900943489ec1e0891836aeafb5ce99fb9c75c7) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.router.uninterruptible, for marking a route as uninterruptible

- Updated dependencies [[`41c8102`](https://github.com/Effect-TS/effect/commit/41c810228b1a50e4b41f19e735d7c62fe8d36871), [`776ef2b`](https://github.com/Effect-TS/effect/commit/776ef2bb66db9aa9f68b7beab14f6986f9c1288b), [`217147e`](https://github.com/Effect-TS/effect/commit/217147ea67c5c42c96f024775c41e5b070f81e4c), [`90776ec`](https://github.com/Effect-TS/effect/commit/90776ec8e8671d835b65fc33ead1de6c864b81b9), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`232c353`](https://github.com/Effect-TS/effect/commit/232c353c2e6f743f38e57639ee30e324ffa9c2a9), [`0ca835c`](https://github.com/Effect-TS/effect/commit/0ca835cbac8e69072a93ace83b534219faba24e8), [`8709856`](https://github.com/Effect-TS/effect/commit/870985694ae985c3cb9360ad8a25c60e6f785f55), [`d590094`](https://github.com/Effect-TS/effect/commit/d5900943489ec1e0891836aeafb5ce99fb9c75c7), [`e983740`](https://github.com/Effect-TS/effect/commit/e9837401145605aff5bc2ec7e73004f397c5d2d1), [`e3e0924`](https://github.com/Effect-TS/effect/commit/e3e09247d46a35430fc60e4aa4032cc50814f212)]:
  - effect@2.4.19
  - @effect/platform@0.48.28
  - @effect/platform-node-shared@0.3.28

## 0.45.29

### Patch Changes

- Updated dependencies [[`c6dd3c6`](https://github.com/Effect-TS/effect/commit/c6dd3c6909cafe05adc8450c5a499260e17e60d3), [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d), [`672f137`](https://github.com/Effect-TS/effect/commit/672f13747ddf6dac3ba304fd4511b1df44ab566d)]:
  - @effect/platform@0.48.27
  - @effect/platform-node-shared@0.3.27

## 0.45.28

### Patch Changes

- Updated dependencies [[`365a486`](https://github.com/Effect-TS/effect/commit/365a4865de5e47ce09f4cfd51fc0f67438f82a57)]:
  - @effect/platform@0.48.26
  - @effect/platform-node-shared@0.3.26

## 0.45.27

### Patch Changes

- Updated dependencies [[`dadc690`](https://github.com/Effect-TS/effect/commit/dadc6906121c512bc32be22b52adbd1ada834594), [`d209171`](https://github.com/Effect-TS/effect/commit/d2091714a786820ebae4bef04a9d67d25dd08e88)]:
  - effect@2.4.18
  - @effect/platform@0.48.25
  - @effect/platform-node-shared@0.3.25

## 0.45.26

### Patch Changes

- Updated dependencies [[`f993857`](https://github.com/Effect-TS/effect/commit/f993857d5bb21ff7317ec69e481499632f0365f3), [`9c6a500`](https://github.com/Effect-TS/effect/commit/9c6a5001b467b6255c68a922f4b6e8d692b63d01), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`607b2e7`](https://github.com/Effect-TS/effect/commit/607b2e7a7fd9318c57acf4e50ec61747eea74ad7), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`35ad0ba`](https://github.com/Effect-TS/effect/commit/35ad0ba9f3ba27c60453620e514b980f819f92af), [`8206caf`](https://github.com/Effect-TS/effect/commit/8206caf7c2d22c68be4313318b61cfdacf6222b6), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`7ddd654`](https://github.com/Effect-TS/effect/commit/7ddd65415b65ccb654ad04f4dbefe39402f15117), [`8fdfda6`](https://github.com/Effect-TS/effect/commit/8fdfda6618be848c01b399d13bc05a9a3adfb613), [`f456ba2`](https://github.com/Effect-TS/effect/commit/f456ba273bae21a6dcf8c966c50c97b5f0897d9f)]:
  - @effect/platform-node-shared@0.3.24
  - @effect/platform@0.48.24
  - effect@2.4.17

## 0.45.25

### Patch Changes

- Updated dependencies [[`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2), [`63a1df2`](https://github.com/Effect-TS/effect/commit/63a1df2e4de3766f48f15676fbd0360ab9c27816), [`5170ce7`](https://github.com/Effect-TS/effect/commit/5170ce708c606283e8a30d273950f1a21c7eddc2), [`74a5dae`](https://github.com/Effect-TS/effect/commit/74a5daed0e65b32a36e026bfcf66d02269cb967a)]:
  - @effect/platform@0.48.23
  - effect@2.4.16
  - @effect/platform-node-shared@0.3.23

## 0.45.24

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.22
  - @effect/platform-node-shared@0.3.22

## 0.45.23

### Patch Changes

- Updated dependencies [[`d7688c0`](https://github.com/Effect-TS/effect/commit/d7688c0c72717fe7876c871567f6946dabfc0546), [`b3a4fac`](https://github.com/Effect-TS/effect/commit/b3a4face2acaca422f0b0530436e8f13129f3b3a)]:
  - effect@2.4.15
  - @effect/platform@0.48.21
  - @effect/platform-node-shared@0.3.21

## 0.45.22

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

- Updated dependencies [[`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7), [`4789083`](https://github.com/Effect-TS/effect/commit/4789083283bdaec456982d614ebc4a496ea0e7f7)]:
  - @effect/platform@0.48.20
  - @effect/platform-node-shared@0.3.20

## 0.45.21

### Patch Changes

- [#2411](https://github.com/Effect-TS/effect/pull/2411) [`fb7285e`](https://github.com/Effect-TS/effect/commit/fb7285e8d6a70527df7137a6a3efdd03ae61cb8b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix broken imports in /platform

- Updated dependencies [[`fb7285e`](https://github.com/Effect-TS/effect/commit/fb7285e8d6a70527df7137a6a3efdd03ae61cb8b)]:
  - @effect/platform@0.48.19
  - @effect/platform-node-shared@0.3.19

## 0.45.20

### Patch Changes

- [#2410](https://github.com/Effect-TS/effect/pull/2410) [`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334) Thanks [@tim-smart](https://github.com/tim-smart)! - add undici http client to @effect/platform-node

- Updated dependencies [[`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334), [`26435ec`](https://github.com/Effect-TS/effect/commit/26435ecfa06569dc18d1801ccf38213a43b7c334), [`6180c0c`](https://github.com/Effect-TS/effect/commit/6180c0cc51dee785cfce72220a52c9fc3b9bf9aa)]:
  - @effect/platform-node-shared@0.3.18
  - @effect/platform@0.48.18
  - effect@2.4.14

## 0.45.19

### Patch Changes

- [#2403](https://github.com/Effect-TS/effect/pull/2403) [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3) Thanks [@tim-smart](https://github.com/tim-smart)! - use ReadonlyRecord for storing cookies

- [#2403](https://github.com/Effect-TS/effect/pull/2403) [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3) Thanks [@tim-smart](https://github.com/tim-smart)! - add set-cookie headers in Http.response.toWeb

- Updated dependencies [[`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe), [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3), [`8c9abe2`](https://github.com/Effect-TS/effect/commit/8c9abe2b35c46d8891d4b2c14ff9eb46302a14f3), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`54b7c00`](https://github.com/Effect-TS/effect/commit/54b7c0077fa784ad2646b812d6a44641f672edcd), [`3336287`](https://github.com/Effect-TS/effect/commit/3336287ff55a25e56d759b83847bfaa21c40f499), [`47a8f1b`](https://github.com/Effect-TS/effect/commit/47a8f1b644d8294692d92cacd3c8c7543edbfabe)]:
  - @effect/platform@0.48.17
  - effect@2.4.13
  - @effect/platform-node-shared@0.3.17

## 0.45.18

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

- Updated dependencies [[`75a8d16`](https://github.com/Effect-TS/effect/commit/75a8d16247cc14860cdd7fd948ef542c50c2d55e), [`3307729`](https://github.com/Effect-TS/effect/commit/3307729de162a033fa9caa8e14c111013dcf0d87)]:
  - @effect/platform-node-shared@0.3.16
  - @effect/platform@0.48.16
  - effect@2.4.12

## 0.45.17

### Patch Changes

- [#2384](https://github.com/Effect-TS/effect/pull/2384) [`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- Updated dependencies [[`2f488c4`](https://github.com/Effect-TS/effect/commit/2f488c436de52576562803c57ebc132ef40ccdd8), [`37ca592`](https://github.com/Effect-TS/effect/commit/37ca592a4101ad90adbf8c8b3f727faf3110cae5), [`317b5b8`](https://github.com/Effect-TS/effect/commit/317b5b8e8c8c2207469b3ebfcf72bf3a9f7cbc60)]:
  - @effect/platform-node-shared@0.3.15
  - effect@2.4.11
  - @effect/platform@0.48.15

## 0.45.16

### Patch Changes

- Updated dependencies [[`9bab1f9`](https://github.com/Effect-TS/effect/commit/9bab1f9fa5b999740755e4e82485cb77c638643a), [`9bbde5b`](https://github.com/Effect-TS/effect/commit/9bbde5be9a0168d1c2a0308bfc27167ed62f3968)]:
  - effect@2.4.10
  - @effect/platform@0.48.14
  - @effect/platform-node-shared@0.3.14

## 0.45.15

### Patch Changes

- Updated dependencies [[`1879f62`](https://github.com/Effect-TS/effect/commit/1879f629d0c4815dbb5955779247cd3f3da5cd85)]:
  - @effect/platform-node-shared@0.3.13
  - @effect/platform@0.48.13

## 0.45.14

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.12
  - @effect/platform-node-shared@0.3.12

## 0.45.13

### Patch Changes

- Updated dependencies [[`0f6c7b4`](https://github.com/Effect-TS/effect/commit/0f6c7b426eb3432f60e3a17f8cd92ceac91597bf)]:
  - @effect/platform-node-shared@0.3.11
  - @effect/platform@0.48.11

## 0.45.12

### Patch Changes

- [#2357](https://github.com/Effect-TS/effect/pull/2357) [`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99) Thanks [@tim-smart](https://github.com/tim-smart)! - make more data types in /platform implement Inspectable

- Updated dependencies [[`71fd528`](https://github.com/Effect-TS/effect/commit/71fd5287500f9ce155a7d9f0df6ee3e0ac3aeb99)]:
  - @effect/platform-node-shared@0.3.10
  - @effect/platform@0.48.10
  - effect@2.4.9

## 0.45.11

### Patch Changes

- Updated dependencies [[`bb0b69e`](https://github.com/Effect-TS/effect/commit/bb0b69e519698c7c76aa68217de423c78ad16566), [`6b20bad`](https://github.com/Effect-TS/effect/commit/6b20badebb3a7ca4d38857753e8ecaa09d02ccfb), [`4e64e9b`](https://github.com/Effect-TS/effect/commit/4e64e9b9876de6bfcbabe39e18a91a08e5f3fbb0), [`3851a02`](https://github.com/Effect-TS/effect/commit/3851a022c481006aec1db36651e4b4fd727aa742), [`5f5fcd9`](https://github.com/Effect-TS/effect/commit/5f5fcd969ae30ed6fe61d566a571498d9e895e16), [`814e5b8`](https://github.com/Effect-TS/effect/commit/814e5b828f68210b9e8f336fd6ac688646835dd9)]:
  - effect@2.4.8
  - @effect/platform@0.48.9
  - @effect/platform-node-shared@0.3.9

## 0.45.10

### Patch Changes

- Updated dependencies [[`69d27bb`](https://github.com/Effect-TS/effect/commit/69d27bb633884b6b50f9c3d9e95c29f09b4860b5)]:
  - @effect/platform-node-shared@0.3.8
  - @effect/platform@0.48.8

## 0.45.9

### Patch Changes

- Updated dependencies [[`f908948`](https://github.com/Effect-TS/effect/commit/f908948fd05771a670c0b746e2dd9caa9408ef83)]:
  - @effect/platform@0.48.7
  - @effect/platform-node-shared@0.3.7

## 0.45.8

### Patch Changes

- Updated dependencies [[`eb93283`](https://github.com/Effect-TS/effect/commit/eb93283985913d7b04ca750e36ac8513e7b6cef6)]:
  - effect@2.4.7
  - @effect/platform@0.48.6
  - @effect/platform-node-shared@0.3.6

## 0.45.7

### Patch Changes

- Updated dependencies [[`e006e4a`](https://github.com/Effect-TS/effect/commit/e006e4a538c97bae6ca1efa74802159e8a688fcb)]:
  - @effect/platform-node-shared@0.3.5
  - @effect/platform@0.48.5

## 0.45.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.48.4
  - @effect/platform-node-shared@0.3.4

## 0.45.5

### Patch Changes

- Updated dependencies [[`c362e06`](https://github.com/Effect-TS/effect/commit/c362e066550252d5a9fcbc31a4b34d0e17c50699), [`83ddd6f`](https://github.com/Effect-TS/effect/commit/83ddd6f41029724b2cbd144cf309463967ed1164)]:
  - @effect/platform-node-shared@0.3.3
  - @effect/platform@0.48.3

## 0.45.4

### Patch Changes

- Updated dependencies [[`4f35a7e`](https://github.com/Effect-TS/effect/commit/4f35a7e7c4eba598924aff24d1158b9056bb24be), [`9971186`](https://github.com/Effect-TS/effect/commit/99711862722188fbb5ed3ee75126ad5edf13f72f)]:
  - @effect/platform@0.48.2
  - effect@2.4.6
  - @effect/platform-node-shared@0.3.2

## 0.45.3

### Patch Changes

- Updated dependencies [[`bce21c5`](https://github.com/Effect-TS/effect/commit/bce21c5ded2177114666ba229bd5029fa000dee3), [`c7d3036`](https://github.com/Effect-TS/effect/commit/c7d303630b7f0825cb2e584557c5767a67214d9f)]:
  - effect@2.4.5
  - @effect/platform@0.48.1
  - @effect/platform-node-shared@0.3.1

## 0.45.2

### Patch Changes

- [#2283](https://github.com/Effect-TS/effect/pull/2283) [`509be1a`](https://github.com/Effect-TS/effect/commit/509be1a0817118489750cf028523134677e44a8a) Thanks [@tim-smart](https://github.com/tim-smart)! - add SocketCloseError with additional metadata

- Updated dependencies [[`5d47ee0`](https://github.com/Effect-TS/effect/commit/5d47ee0855e492532085b6092879b1b952d84949), [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5), [`817a04c`](https://github.com/Effect-TS/effect/commit/817a04cb2df0f4140984dc97eb3e1bb14a6c4a38), [`d90a99d`](https://github.com/Effect-TS/effect/commit/d90a99d03d074adc7cd2533f15419138264da5a2), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`509be1a`](https://github.com/Effect-TS/effect/commit/509be1a0817118489750cf028523134677e44a8a), [`1cb7f9c`](https://github.com/Effect-TS/effect/commit/1cb7f9cff7c2272a32fc7a324d87b02e2cd8a2f5), [`dd05faa`](https://github.com/Effect-TS/effect/commit/dd05faa621555ef3585ecd914ac13ecd89b710f4), [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd), [`a1f44cb`](https://github.com/Effect-TS/effect/commit/a1f44cb5112713ff9a3ac3d91a63a2c99d6b7fc1), [`d910dd2`](https://github.com/Effect-TS/effect/commit/d910dd2ca1e8e5aa2f09d9bf3694ede745758f99), [`e7ca973`](https://github.com/Effect-TS/effect/commit/e7ca973c5430ae60716701e58bedd4632ff971fd), [`802674b`](https://github.com/Effect-TS/effect/commit/802674b379b7559ad3ff09b33388891445a9e48b), [`bdff193`](https://github.com/Effect-TS/effect/commit/bdff193365dd9ec2863573b08eb960aa8dee5c93)]:
  - effect@2.4.4
  - @effect/platform@0.48.0
  - @effect/platform-node-shared@0.3.0

## 0.45.1

### Patch Changes

- [#2276](https://github.com/Effect-TS/effect/pull/2276) [`0680545`](https://github.com/Effect-TS/effect/commit/068054540f19bb23a79c7c021ed8b2fe34f3e19f) Thanks [@tim-smart](https://github.com/tim-smart)! - improve /platform error messages

- Updated dependencies [[`0680545`](https://github.com/Effect-TS/effect/commit/068054540f19bb23a79c7c021ed8b2fe34f3e19f), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e), [`20e63fb`](https://github.com/Effect-TS/effect/commit/20e63fb9207210f3fe2d136ec40d0a2dbff3225e)]:
  - @effect/platform@0.47.1
  - effect@2.4.3
  - @effect/platform-node-shared@0.2.5

## 0.45.0

### Minor Changes

- [#2261](https://github.com/Effect-TS/effect/pull/2261) [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e) Thanks [@tim-smart](https://github.com/tim-smart)! - move Socket module to platform

### Patch Changes

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

- Updated dependencies [[`e03811e`](https://github.com/Effect-TS/effect/commit/e03811e80c93e986e6348b3b67ac2ed6d5fefff0), [`ac41d84`](https://github.com/Effect-TS/effect/commit/ac41d84776484cdce8165b7ca2c9c9b6377eee2d), [`0f3d99c`](https://github.com/Effect-TS/effect/commit/0f3d99c27521ec6b221b644a0fffc79199c3acca), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`1bf9f31`](https://github.com/Effect-TS/effect/commit/1bf9f31f07667de677673f7c29a4e7a26ebad3c8), [`e3ff789`](https://github.com/Effect-TS/effect/commit/e3ff789226f89e71eb28ca38ce79f90af6a03f1a), [`6137533`](https://github.com/Effect-TS/effect/commit/613753300c7705518ab1fea2f370b032851c2750), [`507ba40`](https://github.com/Effect-TS/effect/commit/507ba4060ff043c1a8d541dae723fa6940633b00), [`4064ea0`](https://github.com/Effect-TS/effect/commit/4064ea04e0b3fa23108ee471cd89ab2482b2f6e5), [`e466afe`](https://github.com/Effect-TS/effect/commit/e466afe32f2de598ceafd8982bd0cfbd388e5671), [`f373529`](https://github.com/Effect-TS/effect/commit/f373529999f4b8bc92b634f6ea14f19271388eed), [`de74eb8`](https://github.com/Effect-TS/effect/commit/de74eb80a79eebde5ff645033765e7a617e92f27), [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e), [`fa9663c`](https://github.com/Effect-TS/effect/commit/fa9663cb854ca03dba672d7857ecff84f1140c9e)]:
  - effect@2.4.2
  - @effect/platform-node-shared@0.2.4
  - @effect/platform@0.47.0

## 0.44.11

### Patch Changes

- Updated dependencies [[`a4a0006`](https://github.com/Effect-TS/effect/commit/a4a0006c7f19fc261df5cda16963d73457e4d6ac), [`7535080`](https://github.com/Effect-TS/effect/commit/7535080f2e2f9859711031161600c01807cc43ea), [`0a37676`](https://github.com/Effect-TS/effect/commit/0a37676aa0eb2a21e17af2e6df9f81f52bbc8831), [`bd1d7ac`](https://github.com/Effect-TS/effect/commit/bd1d7ac75eea57a94d5e2d8e1edccb3136e84899), [`6f503b7`](https://github.com/Effect-TS/effect/commit/6f503b774d893bf2af34f66202e270d8c45d5f31)]:
  - effect@2.4.1
  - @effect/platform@0.46.3
  - @effect/platform-node-shared@0.2.3

## 0.44.10

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.46.2
  - @effect/platform-node-shared@0.2.2

## 0.44.9

### Patch Changes

- Updated dependencies [[`aa6556f`](https://github.com/Effect-TS/effect/commit/aa6556f007117caea84d6965aa30846a11879e9d)]:
  - @effect/platform@0.46.1
  - @effect/platform-node-shared@0.2.1

## 0.44.8

### Patch Changes

- Updated dependencies [[`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`489fcf3`](https://github.com/Effect-TS/effect/commit/489fcf363ff2b2a953166b740cb9a62d7fc2a101), [`7d9c3bf`](https://github.com/Effect-TS/effect/commit/7d9c3bff6c18d451e0e4781042945ec5c7be1b9f), [`d8d278b`](https://github.com/Effect-TS/effect/commit/d8d278b2efb2966947029885e01f7b68348a021f), [`14c5711`](https://github.com/Effect-TS/effect/commit/14c57110078f0862b8da5c7a2c5d980f54447484), [`5de7be5`](https://github.com/Effect-TS/effect/commit/5de7be5beca2e963b503e6029dcc3217848187d2), [`b9cb3a9`](https://github.com/Effect-TS/effect/commit/b9cb3a9c9bfdd75536bd70b4e8b557c12d4923ff), [`585fcce`](https://github.com/Effect-TS/effect/commit/585fcce162d0f07a48d7cd984a9b722966fbebbe), [`93b412d`](https://github.com/Effect-TS/effect/commit/93b412d4a9ed762dc9fa5807e51fad0fc78a614a), [`55b26a6`](https://github.com/Effect-TS/effect/commit/55b26a6342b4826f1116e7a1eb660118c274458e), [`a025b12`](https://github.com/Effect-TS/effect/commit/a025b121235ba01cfce8d62a775491880c575561), [`2097739`](https://github.com/Effect-TS/effect/commit/20977393d2383bff709304e81ec7d51cafd57108)]:
  - effect@2.4.0
  - @effect/platform@0.46.0
  - @effect/platform-node-shared@0.2.0

## 0.44.7

### Patch Changes

- [#2187](https://github.com/Effect-TS/effect/pull/2187) [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf) Thanks [@tim-smart](https://github.com/tim-smart)! - update development dependencies

- Updated dependencies [[`5ad2eec`](https://github.com/Effect-TS/effect/commit/5ad2eece0280b6db6a749d25cac1dcf6d33659a9), [`e6d36c0`](https://github.com/Effect-TS/effect/commit/e6d36c0813d836f17eabb6a9c7849baffca12dbf)]:
  - effect@2.3.8
  - @effect/platform-node-shared@0.1.14
  - @effect/platform@0.45.6

## 0.44.6

### Patch Changes

- Updated dependencies [[`6daf084`](https://github.com/Effect-TS/effect/commit/6daf0845de008772011db8d7c75b7c37a6b4d334)]:
  - @effect/platform@0.45.5
  - @effect/platform-node-shared@0.1.13

## 0.44.5

### Patch Changes

- Updated dependencies [[`bc8404d`](https://github.com/Effect-TS/effect/commit/bc8404d54fd42072d200c0399cb39672837afa9f), [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea), [`2c5cbcd`](https://github.com/Effect-TS/effect/commit/2c5cbcd1161b4f40dab184999291e817314107de), [`6565916`](https://github.com/Effect-TS/effect/commit/6565916ef254bf910e47d25fd0ef55e7cb420241), [`abcb7d9`](https://github.com/Effect-TS/effect/commit/abcb7d983a4a85b43b7175e952f5b331b9019aea)]:
  - effect@2.3.7
  - @effect/platform@0.45.4
  - @effect/platform-node-shared@0.1.12

## 0.44.4

### Patch Changes

- Updated dependencies [[`09532a8`](https://github.com/Effect-TS/effect/commit/09532a86b7d0cc23557c89158f0342753dfce4b0)]:
  - @effect/platform@0.45.3
  - @effect/platform-node-shared@0.1.11

## 0.44.3

### Patch Changes

- [#2150](https://github.com/Effect-TS/effect/pull/2150) [`f612749`](https://github.com/Effect-TS/effect/commit/f612749ddfff40cadef3387100135f2cb9a4a9f3) Thanks [@tim-smart](https://github.com/tim-smart)! - add unsafe body accessors to node http IncomingMessage

  these can be used from debuggers to inspect the request body.

## 0.44.2

### Patch Changes

- Updated dependencies [[`b1163b2`](https://github.com/Effect-TS/effect/commit/b1163b2bd67b65bafbbb39fc4c67576e5cbaf444), [`b46b869`](https://github.com/Effect-TS/effect/commit/b46b869e59a6da5aa235a9fcc25e1e0d24e9e8f8), [`de1b226`](https://github.com/Effect-TS/effect/commit/de1b226282b5ab6c2809dd93f3bdb066f24a1333), [`a663390`](https://github.com/Effect-TS/effect/commit/a66339090ae7b960f8a8b90a0dcdc505de5aaf3e), [`ff88f80`](https://github.com/Effect-TS/effect/commit/ff88f808c4ed9947a148045849e7410b00acad0a), [`11be07b`](https://github.com/Effect-TS/effect/commit/11be07bf65d82cfdf994cdb9d8ca937f995cb4f0), [`c568645`](https://github.com/Effect-TS/effect/commit/c5686451c87d26382135a1c63b00ef171bb24f62), [`88835e5`](https://github.com/Effect-TS/effect/commit/88835e575a0bfbeff9a3696a332f32192c940e12), [`b415577`](https://github.com/Effect-TS/effect/commit/b415577f6c576073733929c858e5aac27b6d5880), [`ff8046f`](https://github.com/Effect-TS/effect/commit/ff8046f57dfd073eba60ce6d3144ab060fbf93ce), [`44c3b43`](https://github.com/Effect-TS/effect/commit/44c3b43653e64d7e425d39815d8ff405acec9b99)]:
  - effect@2.3.6
  - @effect/platform@0.45.2
  - @effect/platform-node-shared@0.1.10

## 0.44.1

### Patch Changes

- Updated dependencies [[`65895ab`](https://github.com/Effect-TS/effect/commit/65895ab982e0917ac92f0827e387e7cf61be1e69)]:
  - @effect/platform@0.45.1
  - @effect/platform-node-shared@0.1.9

## 0.44.0

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

### Patch Changes

- Updated dependencies [[`2b62548`](https://github.com/Effect-TS/effect/commit/2b6254845882f399636d24223c483e5489e3cff4)]:
  - @effect/platform@0.45.0
  - @effect/platform-node-shared@0.1.8

## 0.43.7

### Patch Changes

- Updated dependencies [[`b881365`](https://github.com/Effect-TS/effect/commit/b8813650355322ea2fc1fbaa4f846bd87a7a05f3)]:
  - effect@2.3.5
  - @effect/platform@0.44.7
  - @effect/platform-node-shared@0.1.7

## 0.43.6

### Patch Changes

- Updated dependencies [[`17bda66`](https://github.com/Effect-TS/effect/commit/17bda66431c999a546920c10adb205e6c8bea7d1)]:
  - effect@2.3.4
  - @effect/platform@0.44.6
  - @effect/platform-node-shared@0.1.6

## 0.43.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.44.5
  - @effect/platform-node-shared@0.1.5

## 0.43.4

### Patch Changes

- Updated dependencies [[`efd41d8`](https://github.com/Effect-TS/effect/commit/efd41d8131c3d90867608969ef7c4eef490eb5e6), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f), [`0f83515`](https://github.com/Effect-TS/effect/commit/0f83515a9c01d13c7c15a3f026e02d22c3c6bb7f)]:
  - effect@2.3.3
  - @effect/platform@0.44.4
  - @effect/platform-node-shared@0.1.4

## 0.43.3

### Patch Changes

- Updated dependencies [[`6654f5f`](https://github.com/Effect-TS/effect/commit/6654f5f0f6b9d97165ede5e04ca16776e2599328), [`2eb11b4`](https://github.com/Effect-TS/effect/commit/2eb11b47752cedf233ef4c4395d9c4efc9b9e180), [`56c09bd`](https://github.com/Effect-TS/effect/commit/56c09bd369279a6a7785209d172739935818cba6), [`71aa5b1`](https://github.com/Effect-TS/effect/commit/71aa5b1c180dcb8b53aefe232d12a97bd06b5447), [`1700af8`](https://github.com/Effect-TS/effect/commit/1700af8af1131602887da721914c8562b6342393)]:
  - effect@2.3.2
  - @effect/platform@0.44.3
  - @effect/platform-node-shared@0.1.3

## 0.43.2

### Patch Changes

- Updated dependencies [[`29739dd`](https://github.com/Effect-TS/effect/commit/29739dde8e6232824d49c4c7f8856de245249c5c)]:
  - @effect/platform@0.44.2
  - @effect/platform-node-shared@0.1.2

## 0.43.1

### Patch Changes

- Updated dependencies [[`b5a8215`](https://github.com/Effect-TS/effect/commit/b5a8215ee2a97a8865d69ee55ce1b9835948c922)]:
  - effect@2.3.1
  - @effect/platform@0.44.1
  - @effect/platform-node-shared@0.1.1

## 0.43.0

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

- Updated dependencies [[`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`c77f635`](https://github.com/Effect-TS/effect/commit/c77f635f8a26ca6d83cb569d911f8eee79033fd9), [`e343a74`](https://github.com/Effect-TS/effect/commit/e343a74843dd9edf879417fa94cb51de7ed5b402), [`acf1894`](https://github.com/Effect-TS/effect/commit/acf1894f45945dbe5c39451e36aabb4b5092f257), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`1a77f72`](https://github.com/Effect-TS/effect/commit/1a77f72cdaf43d6cdc91b6060f82832edcdbbcb3), [`af47aa3`](https://github.com/Effect-TS/effect/commit/af47aa37196ad542c9c23a4896d8ef98147e1205), [`c986f0e`](https://github.com/Effect-TS/effect/commit/c986f0e0ce4d22ba08177ed351152718479ab63c), [`96bcee2`](https://github.com/Effect-TS/effect/commit/96bcee21021aecd8ffd86440a2c9be353c4668e3), [`70dde23`](https://github.com/Effect-TS/effect/commit/70dde238f81125e353fd7bde5fc24ecd8969bf97), [`a34dbdc`](https://github.com/Effect-TS/effect/commit/a34dbdc1552c73c1b612676f262a0c735ce444a7), [`81b7425`](https://github.com/Effect-TS/effect/commit/81b7425320cbbe2a6cf547a3e3ab3549cdba14cf), [`b1e2086`](https://github.com/Effect-TS/effect/commit/b1e2086ea8bf410e4ad75d71c0760825924e8f9f), [`02c3461`](https://github.com/Effect-TS/effect/commit/02c34615d02f91269ea04036d0306fccf4e39e18), [`0e56e99`](https://github.com/Effect-TS/effect/commit/0e56e998ab9815c4d096c239a553cb86a0f99af9), [`8b0ded9`](https://github.com/Effect-TS/effect/commit/8b0ded9f10ba0d96fcb9af24eff2dbd9341f85e3), [`8dd83e8`](https://github.com/Effect-TS/effect/commit/8dd83e854bfcaa6dab876994c5f813dcfb486c28), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`d75f6fe`](https://github.com/Effect-TS/effect/commit/d75f6fe6499deb0a5ee9ec94af3b5fd4eb03a2d0), [`7356e5c`](https://github.com/Effect-TS/effect/commit/7356e5cc16e9d70f18c02dee1dcb4ad539fd130a), [`3077cde`](https://github.com/Effect-TS/effect/commit/3077cde08a60246821a940964a84dd7f7c8b9f54), [`be19ce0`](https://github.com/Effect-TS/effect/commit/be19ce0b8bdf1fac80bb8d7e0b06a86986b47409), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`78f47ab`](https://github.com/Effect-TS/effect/commit/78f47abfe3cb0a8bbde818b1c5fc603270538b47), [`6361ee2`](https://github.com/Effect-TS/effect/commit/6361ee2e83bdfead24045c3d058a7298efc18113), [`52e5d20`](https://github.com/Effect-TS/effect/commit/52e5d2077582bf51f25861c7139fc920c2c24166), [`c6137ec`](https://github.com/Effect-TS/effect/commit/c6137ec62c6b5542d5062ae1a3c936cb915dee22), [`86f665d`](https://github.com/Effect-TS/effect/commit/86f665d7bd25ba0a3f046a2384798378310dcf0c), [`f5ae081`](https://github.com/Effect-TS/effect/commit/f5ae08195e68e76faeac258c565d79da4e01e7d6), [`4a5d01a`](https://github.com/Effect-TS/effect/commit/4a5d01a409e9b6dd53893e65f8e5c9247f568021), [`60686f5`](https://github.com/Effect-TS/effect/commit/60686f5c38bef1b93a3a0dda9b6596d46aceab03), [`9a2d1c1`](https://github.com/Effect-TS/effect/commit/9a2d1c1468ea0789b34767ad683da074f061ea9c), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e), [`8ee2931`](https://github.com/Effect-TS/effect/commit/8ee293159b4f7cb7af8558287a0a047f3a69743d), [`6727474`](https://github.com/Effect-TS/effect/commit/672747497490a30d36dd49c06db19aabf09dc7f0), [`5127afe`](https://github.com/Effect-TS/effect/commit/5127afec1c519e0a3d7460844a9101a96272f29e)]:
  - effect@2.3.0
  - @effect/platform@0.44.0
  - @effect/platform-node-shared@0.1.0

## 0.42.11

### Patch Changes

- Updated dependencies [[`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c), [`3ddfdbf`](https://github.com/Effect-TS/effect/commit/3ddfdbf914edea536aef207cec6695f33496258c)]:
  - effect@2.2.5
  - @effect/platform@0.43.11

## 0.42.10

### Patch Changes

- Updated dependencies [[`d0b911c`](https://github.com/Effect-TS/effect/commit/d0b911c75f284c7aa87f25aa96926e6bde7690d0), [`330e1a4`](https://github.com/Effect-TS/effect/commit/330e1a4e2c1fc0af6c80c80c81dd38c3e50fab78), [`6928a2b`](https://github.com/Effect-TS/effect/commit/6928a2b0bae86a4bdfbece0aa32924207c2d5a70), [`296bc1c`](https://github.com/Effect-TS/effect/commit/296bc1c9d24986d299d2669115d584cb27b73c60)]:
  - effect@2.2.4
  - @effect/platform@0.43.10

## 0.42.9

### Patch Changes

- Updated dependencies [[`1b841a9`](https://github.com/Effect-TS/effect/commit/1b841a91fed86825cd2867cf1e68e41d8ff26b4e)]:
  - @effect/platform@0.43.9

## 0.42.8

### Patch Changes

- Updated dependencies [[`32bf796`](https://github.com/Effect-TS/effect/commit/32bf796c3e5db1b2b68e8b1b20db664295991643)]:
  - @effect/platform@0.43.8

## 0.42.7

### Patch Changes

- Updated dependencies [[`cde08f3`](https://github.com/Effect-TS/effect/commit/cde08f354ed2ff2921d1d98bd539c7d65a2ddd73)]:
  - @effect/platform@0.43.7

## 0.42.6

### Patch Changes

- Updated dependencies [[`c96bb17`](https://github.com/Effect-TS/effect/commit/c96bb17043e2cec1eaeb319614a4c2904d876beb)]:
  - @effect/platform@0.43.6

## 0.42.5

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.5

## 0.42.4

### Patch Changes

- [#1999](https://github.com/Effect-TS/effect/pull/1999) [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure forked fibers are interruptible

- Updated dependencies [[`22794e0`](https://github.com/Effect-TS/effect/commit/22794e0ba00e40281f30a22fa84412003c24877d), [`f73e6c0`](https://github.com/Effect-TS/effect/commit/f73e6c033fb0729a9cfa5eb4bc39f79d3126e247), [`78f5921`](https://github.com/Effect-TS/effect/commit/78f59211502ded6fcbe15a49d6fde941cccc9d52)]:
  - effect@2.2.3
  - @effect/platform@0.43.4

## 0.42.3

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.3

## 0.42.2

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.43.2

## 0.42.1

### Patch Changes

- Updated dependencies [[`d404561`](https://github.com/Effect-TS/effect/commit/d404561e47ec2fa5f68709a308ee5d2ee959141d), [`7b84a3c`](https://github.com/Effect-TS/effect/commit/7b84a3c7e4b9c8dc02294b0e3cc3ae3becea977b)]:
  - effect@2.2.2
  - @effect/platform@0.43.1

## 0.42.0

### Minor Changes

- [#1922](https://github.com/Effect-TS/effect/pull/1922) [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764) Thanks [@gcanti](https://github.com/gcanti)! - add context tracking to Schema, closes #1873

### Patch Changes

- Updated dependencies [[`84da31f`](https://github.com/Effect-TS/effect/commit/84da31f0643e8651b9d311b30526b1e4edfbdfb8), [`645bea2`](https://github.com/Effect-TS/effect/commit/645bea2551129f94a5b0e38347e28067dee531bb), [`62b40e8`](https://github.com/Effect-TS/effect/commit/62b40e8479371d6663c0255aaca56a1ae0d59764)]:
  - effect@2.2.1
  - @effect/platform@0.43.0

## 0.41.8

### Patch Changes

- Updated dependencies [[`202befc`](https://github.com/Effect-TS/effect/commit/202befc2ecbeb117c4fa85ef9b12a3d3a48273d2), [`fe05ad7`](https://github.com/Effect-TS/effect/commit/fe05ad7bcb3b88d47800ab69ebf53641023676f1), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`ee4ff8a`](https://github.com/Effect-TS/effect/commit/ee4ff8a943141fcf2877af92c5877ee87a989fb9), [`10df798`](https://github.com/Effect-TS/effect/commit/10df798639e556f9d88265ef7fc3cf8a3bbe3874)]:
  - effect@2.2.0
  - @effect/platform@0.42.7

## 0.41.7

### Patch Changes

- Updated dependencies [[`21b9edd`](https://github.com/Effect-TS/effect/commit/21b9edde464f7c5624ef54ad1b5e264204a37625)]:
  - effect@2.1.2
  - @effect/platform@0.42.6

## 0.41.6

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.42.5

## 0.41.5

### Patch Changes

- Updated dependencies [[`a222524`](https://github.com/Effect-TS/effect/commit/a2225247e9de2e013d287320790fde88c081dbbd)]:
  - effect@2.1.1
  - @effect/platform@0.42.4

## 0.41.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.42.3

## 0.41.3

### Patch Changes

- Updated dependencies [[`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02), [`05c44b3`](https://github.com/Effect-TS/effect/commit/05c44b30662554dde50b70bad79f13ae895fda02)]:
  - effect@2.1.0
  - @effect/platform@0.42.2

## 0.41.2

### Patch Changes

- Updated dependencies [[`f7f19f6`](https://github.com/Effect-TS/effect/commit/f7f19f66a5fa349baa2412c1f9f15111c437df09)]:
  - effect@2.0.5
  - @effect/platform@0.42.1

## 0.41.1

### Patch Changes

- [#1905](https://github.com/Effect-TS/effect/pull/1905) [`71ed54c`](https://github.com/Effect-TS/effect/commit/71ed54c3fbb1ead5da2776bc6207050cb073ada4) Thanks [@datner](https://github.com/datner)! - change to an actually allowed number

- Updated dependencies [[`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`540b294`](https://github.com/Effect-TS/effect/commit/540b2941dd0a81e9688311583ce7e2e140d6e7a5), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`a3f96d6`](https://github.com/Effect-TS/effect/commit/a3f96d615b8b3e238dbfa01ef713c87e6f4532be), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`8eec87e`](https://github.com/Effect-TS/effect/commit/8eec87e311ce55281a98517e6df0ef103b43e8a8), [`25adce7`](https://github.com/Effect-TS/effect/commit/25adce7ae76ce834096dca1ed70a60ad1a349217), [`536c1df`](https://github.com/Effect-TS/effect/commit/536c1dfb7833961dfb2fbd6bcd2dbdfa2f208d51), [`48a3d40`](https://github.com/Effect-TS/effect/commit/48a3d40aed0f923f567b8911dade732ff472d981)]:
  - effect@2.0.4
  - @effect/platform@0.42.0

## 0.41.0

### Minor Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - lift worker shutdown to /platform implementation

### Patch Changes

- [#1885](https://github.com/Effect-TS/effect/pull/1885) [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid killing all fibers on interrupt

- Updated dependencies [[`87f7ef2`](https://github.com/Effect-TS/effect/commit/87f7ef28a3c27e2e4f2fcfa465f85bb2a45a3d6b), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0), [`1d3a06b`](https://github.com/Effect-TS/effect/commit/1d3a06bb58ad1ac123ae8f9d42b4345f9c9c53c0)]:
  - effect@2.0.3
  - @effect/platform@0.41.0

## 0.40.4

### Patch Changes

- Updated dependencies []:
  - @effect/platform@0.40.4

## 0.40.3

### Patch Changes

- [#1879](https://github.com/Effect-TS/effect/pull/1879) [`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af) Thanks [@tim-smart](https://github.com/tim-smart)! - add http Multiplex module

- Updated dependencies [[`92c0322`](https://github.com/Effect-TS/effect/commit/92c0322a58bf7e5b8dbb602186030839e89df5af)]:
  - @effect/platform@0.40.3

## 0.40.2

### Patch Changes

- Updated dependencies [[`4c90c54`](https://github.com/Effect-TS/effect/commit/4c90c54d87c91f75f3ad114926cdf3b0c25df091), [`d5a1949`](https://github.com/Effect-TS/effect/commit/d5a19499aac7c1d147674a35ac69992177c7536c), [`d3d3bda`](https://github.com/Effect-TS/effect/commit/d3d3bda74c794153def9027e0c40896e72cd5d14)]:
  - @effect/platform@0.40.2
  - effect@2.0.2

## 0.40.1

### Patch Changes

- Updated dependencies [[`16bd87d`](https://github.com/Effect-TS/effect/commit/16bd87d32611b966dc42ea4fc979764f97a49071)]:
  - effect@2.0.1
  - @effect/platform@0.40.1

## 0.40.0

### Minor Changes

- [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch to monorepo structure

- [#1846](https://github.com/Effect-TS/effect/pull/1846) [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f) Thanks [@fubhy](https://github.com/fubhy)! - Enabled `exactOptionalPropertyTypes` throughout

### Patch Changes

- [`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch effect dependency to caret

- [#1848](https://github.com/Effect-TS/effect/pull/1848) [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7) Thanks [@fubhy](https://github.com/fubhy)! - Avoid default parameter initilization

- [#1796](https://github.com/Effect-TS/effect/pull/1796) [`99d22cb`](https://github.com/Effect-TS/effect/commit/99d22cbee13cc2111a4a634cbe73b9b7d7fd88c7) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - Http client treats upgrade response as successful response

- Updated dependencies [[`d987daa`](https://github.com/Effect-TS/effect/commit/d987daafaddd43b6ade74916a08236c19ea0a9fa), [`7b5eaa3`](https://github.com/Effect-TS/effect/commit/7b5eaa3838c79bf4bdccf91b94d61bbc38a2ec95), [`0724211`](https://github.com/Effect-TS/effect/commit/072421149c36010748ff6b6ee19c15c6cffefe09), [`9f2bc5a`](https://github.com/Effect-TS/effect/commit/9f2bc5a19e0b678a0a85e84daac290922b0fd57d), [`04fb8b4`](https://github.com/Effect-TS/effect/commit/04fb8b428b19bba85a2c79910c5e363340d074e7), [`d0471ca`](https://github.com/Effect-TS/effect/commit/d0471ca7b544746674b9e1750202da72b0a21233), [`bcf0900`](https://github.com/Effect-TS/effect/commit/bcf0900b58f449262556f80bff21e771a37272aa), [`6299b84`](https://github.com/Effect-TS/effect/commit/6299b84c11e5d1fe79fa538df8935018c7613747), [`c0aeb5e`](https://github.com/Effect-TS/effect/commit/c0aeb5e302869bcd7d7627f8cc5b630d07c12d10), [`693b8f3`](https://github.com/Effect-TS/effect/commit/693b8f3a3dfd43ae61f0d9292cdf356be7329f2f)]:
  - @effect/platform@0.40.0
  - effect@2.0.0

## 0.39.0

### Minor Changes

- [#369](https://github.com/Effect-TS/platform/pull/369) [`5d5f62b`](https://github.com/Effect-TS/platform/commit/5d5f62b03ffdbca0a986d968e1dbb45886dfa827) Thanks [@tim-smart](https://github.com/tim-smart)! - rename server FormData module to Multipart

- [#372](https://github.com/Effect-TS/platform/pull/372) [`15784c9`](https://github.com/Effect-TS/platform/commit/15784c920dcae40f328bb45ac850987135207365) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#373](https://github.com/Effect-TS/platform/pull/373) [`b042ba5`](https://github.com/Effect-TS/platform/commit/b042ba5ae78a1eed592e543c233fe3040d6a60da) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`5d5f62b`](https://github.com/Effect-TS/platform/commit/5d5f62b03ffdbca0a986d968e1dbb45886dfa827), [`15784c9`](https://github.com/Effect-TS/platform/commit/15784c920dcae40f328bb45ac850987135207365), [`b042ba5`](https://github.com/Effect-TS/platform/commit/b042ba5ae78a1eed592e543c233fe3040d6a60da), [`49fb154`](https://github.com/Effect-TS/platform/commit/49fb15439f18701321db8ded839243b9dd8de71a)]:
  - @effect/platform@0.39.0

## 0.38.0

### Minor Changes

- [#367](https://github.com/Effect-TS/platform/pull/367) [`7d1584b`](https://github.com/Effect-TS/platform/commit/7d1584b23d464651c206201ff304c6eb4bebfc3a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`7d1584b`](https://github.com/Effect-TS/platform/commit/7d1584b23d464651c206201ff304c6eb4bebfc3a)]:
  - @effect/platform@0.38.0

## 0.37.10

### Patch Changes

- [#366](https://github.com/Effect-TS/platform/pull/366) [`1d6bf73`](https://github.com/Effect-TS/platform/commit/1d6bf730dad0a6bbb282f436ec7d5870de76ca3a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Scope to every http request

- [#365](https://github.com/Effect-TS/platform/pull/365) [`3351136`](https://github.com/Effect-TS/platform/commit/335113601c238104eb2e331d26b5e463bde80dff) Thanks [@tim-smart](https://github.com/tim-smart)! - respond with 503 on server induced interrupt

- Updated dependencies [[`e2c545a`](https://github.com/Effect-TS/platform/commit/e2c545a328c2bccbba661540a8835b10bce4b438), [`1d6bf73`](https://github.com/Effect-TS/platform/commit/1d6bf730dad0a6bbb282f436ec7d5870de76ca3a), [`3351136`](https://github.com/Effect-TS/platform/commit/335113601c238104eb2e331d26b5e463bde80dff)]:
  - @effect/platform@0.37.8

## 0.37.9

### Patch Changes

- Updated dependencies [[`df3af6b`](https://github.com/Effect-TS/platform/commit/df3af6be61572bab15004bbca2c5739d8206f3c3)]:
  - @effect/platform@0.37.7

## 0.37.8

### Patch Changes

- [#359](https://github.com/Effect-TS/platform/pull/359) [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364) Thanks [@tim-smart](https://github.com/tim-smart)! - use branded type for Headers

- [#359](https://github.com/Effect-TS/platform/pull/359) [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364) Thanks [@tim-smart](https://github.com/tim-smart)! - change UrlParams to ReadonlyArray

- Updated dependencies [[`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364), [`6dbc587`](https://github.com/Effect-TS/platform/commit/6dbc587868d2703ad9a4c9995cb9dacdfc29c364)]:
  - @effect/platform@0.37.6

## 0.37.7

### Patch Changes

- [#357](https://github.com/Effect-TS/platform/pull/357) [`6db1c07`](https://github.com/Effect-TS/platform/commit/6db1c0768d8afd8a45c0af31cbdfc40c9319e48b) Thanks [@tim-smart](https://github.com/tim-smart)! - respond witu 499 on interrupt

## 0.37.6

### Patch Changes

- [#354](https://github.com/Effect-TS/platform/pull/354) [`190bc84`](https://github.com/Effect-TS/platform/commit/190bc84b137a729a38b6812e220085b3d12cb124) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer support to SerializedWorker

- Updated dependencies [[`190bc84`](https://github.com/Effect-TS/platform/commit/190bc84b137a729a38b6812e220085b3d12cb124)]:
  - @effect/platform@0.37.5

## 0.37.5

### Patch Changes

- [#352](https://github.com/Effect-TS/platform/pull/352) [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d) Thanks [@tim-smart](https://github.com/tim-smart)! - interrupt all fibers on worker interrupt

- Updated dependencies [[`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d), [`1c02a35`](https://github.com/Effect-TS/platform/commit/1c02a35df2f34601b547e17ddeab98236e10f77d)]:
  - @effect/platform@0.37.4

## 0.37.4

### Patch Changes

- [#350](https://github.com/Effect-TS/platform/pull/350) [`b30e5e3`](https://github.com/Effect-TS/platform/commit/b30e5e3874f22037f92253037fff6952f537ee40) Thanks [@tim-smart](https://github.com/tim-smart)! - add decode option to worker runner

- Updated dependencies [[`b30e5e3`](https://github.com/Effect-TS/platform/commit/b30e5e3874f22037f92253037fff6952f537ee40)]:
  - @effect/platform@0.37.3

## 0.37.3

### Patch Changes

- [#348](https://github.com/Effect-TS/platform/pull/348) [`28edc60`](https://github.com/Effect-TS/platform/commit/28edc60d2fcd30160529c677a9ffd786775e534b) Thanks [@tim-smart](https://github.com/tim-smart)! - add layer worker runner apis

- Updated dependencies [[`28edc60`](https://github.com/Effect-TS/platform/commit/28edc60d2fcd30160529c677a9ffd786775e534b)]:
  - @effect/platform@0.37.2

## 0.37.2

### Patch Changes

- [#346](https://github.com/Effect-TS/platform/pull/346) [`c0fdc3d`](https://github.com/Effect-TS/platform/commit/c0fdc3df8d8fc057fc388f5cb1a17d707d54f3eb) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure node client doesn't throw on interruption

## 0.37.1

### Patch Changes

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support error and output transfers in worker runners

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - support initialMessage in workers

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - add Schema transforms to Transferable

- [#344](https://github.com/Effect-TS/platform/pull/344) [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7) Thanks [@tim-smart](https://github.com/tim-smart)! - make worker encoding return Effects

- Updated dependencies [[`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7), [`5b7cdbd`](https://github.com/Effect-TS/platform/commit/5b7cdbdf8ded48903a9f39df800fd7a22f73f0f7)]:
  - @effect/platform@0.37.1

## 0.37.0

### Minor Changes

- [#341](https://github.com/Effect-TS/platform/pull/341) [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1) Thanks [@tim-smart](https://github.com/tim-smart)! - use peer deps for /platform-\*

### Patch Changes

- Updated dependencies [[`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1), [`649f57f`](https://github.com/Effect-TS/platform/commit/649f57fdf557eed5f8405a4a4553dfc47fd8d4b1)]:
  - @effect/platform@0.37.0

## 0.36.0

### Minor Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - change http serve api to return immediately

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - Http.server.serve now returns a Layer

### Patch Changes

- [#338](https://github.com/Effect-TS/platform/pull/338) [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.server.serveEffect

- Updated dependencies [[`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a), [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a), [`7eaa8e5`](https://github.com/Effect-TS/platform/commit/7eaa8e52b18d408688e7b4909bcf016b0c04e80a)]:
  - @effect/platform@0.36.0

## 0.35.1

### Patch Changes

- [#335](https://github.com/Effect-TS/platform/pull/335) [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e) Thanks [@tim-smart](https://github.com/tim-smart)! - add SerializedWorker

- Updated dependencies [[`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e), [`4f0166e`](https://github.com/Effect-TS/platform/commit/4f0166ee2241bd9b71739c98d428b5809313e46e)]:
  - @effect/platform@0.35.0

## 0.35.0

### Minor Changes

- [#331](https://github.com/Effect-TS/platform/pull/331) [`db1ca18`](https://github.com/Effect-TS/platform/commit/db1ca18725f9dd4be1c36ddc80faa3aa53c10eb7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`db1ca18`](https://github.com/Effect-TS/platform/commit/db1ca18725f9dd4be1c36ddc80faa3aa53c10eb7)]:
  - @effect/platform@0.34.0

## 0.34.3

### Patch Changes

- [#329](https://github.com/Effect-TS/platform/pull/329) [`5c75749`](https://github.com/Effect-TS/platform/commit/5c75749d451f8e79e1cb8057729691e4b3c1c6aa) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - HttpClient added another error event listener in waitForResponse

## 0.34.2

### Patch Changes

- Updated dependencies [[`162aa91`](https://github.com/Effect-TS/platform/commit/162aa915934112983c543a6be2a9d7091b86fac9)]:
  - @effect/platform@0.33.1

## 0.34.1

### Patch Changes

- [#324](https://github.com/Effect-TS/platform/pull/324) [`6b90c81`](https://github.com/Effect-TS/platform/commit/6b90c81391e613a25db564aebb9a64971ce077a5) Thanks [@tim-smart](https://github.com/tim-smart)! - improve serve api

## 0.34.0

### Minor Changes

- [#321](https://github.com/Effect-TS/platform/pull/321) [`16a5bca`](https://github.com/Effect-TS/platform/commit/16a5bca2bd4aed570ce95233a0e47350010d031f) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#319](https://github.com/Effect-TS/platform/pull/319) [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed) Thanks [@IMax153](https://github.com/IMax153)! - add Terminal.readLine to read input line-by-line from the terminal

- [#319](https://github.com/Effect-TS/platform/pull/319) [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed) Thanks [@IMax153](https://github.com/IMax153)! - make Terminal.columns an Effect to account for resizing the terminal

- Updated dependencies [[`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed), [`425365e`](https://github.com/Effect-TS/platform/commit/425365ebc40c52a6e2a4bff865c3a982ce74f4ed), [`16a5bca`](https://github.com/Effect-TS/platform/commit/16a5bca2bd4aed570ce95233a0e47350010d031f)]:
  - @effect/platform@0.33.0

## 0.33.5

### Patch Changes

- [#316](https://github.com/Effect-TS/platform/pull/316) [`19431f0`](https://github.com/Effect-TS/platform/commit/19431f0b5ccb8beacd502de876962f55cabf6ed4) Thanks [@tim-smart](https://github.com/tim-smart)! - add logging to runMain

## 0.33.4

### Patch Changes

- [#314](https://github.com/Effect-TS/platform/pull/314) [`e63cf81`](https://github.com/Effect-TS/platform/commit/e63cf819dc26588e29a0177afb1665aa5fd96dfd) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor node command executor

## 0.33.3

### Patch Changes

- [#312](https://github.com/Effect-TS/platform/pull/312) [`cc1f588`](https://github.com/Effect-TS/platform/commit/cc1f5886bf4188e0128b64b9e2a67f789680cab0) Thanks [@tim-smart](https://github.com/tim-smart)! - scope commands to prevent process leaks

- Updated dependencies [[`cc1f588`](https://github.com/Effect-TS/platform/commit/cc1f5886bf4188e0128b64b9e2a67f789680cab0)]:
  - @effect/platform@0.32.2

## 0.33.2

### Patch Changes

- [#310](https://github.com/Effect-TS/platform/pull/310) [`14239fb`](https://github.com/Effect-TS/platform/commit/14239fb11ae45db1a02d9ba883d0412a9c9e6343) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`14239fb`](https://github.com/Effect-TS/platform/commit/14239fb11ae45db1a02d9ba883d0412a9c9e6343)]:
  - @effect/platform@0.32.1

## 0.33.1

### Patch Changes

- [#308](https://github.com/Effect-TS/platform/pull/308) [`4da9a1b`](https://github.com/Effect-TS/platform/commit/4da9a1b73f7644561eab5d7d0d3dcc3b1b8b9b64) Thanks [@tim-smart](https://github.com/tim-smart)! - fix mime version to preserve cjs support

## 0.33.0

### Minor Changes

- [#307](https://github.com/Effect-TS/platform/pull/307) [`746f969`](https://github.com/Effect-TS/platform/commit/746f9692e2f7133dcb413e0eea08ac7b6b97a9bd) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`746f969`](https://github.com/Effect-TS/platform/commit/746f9692e2f7133dcb413e0eea08ac7b6b97a9bd), [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d), [`92e56a1`](https://github.com/Effect-TS/platform/commit/92e56a1f844f28f26621a1887cc4da045039066d)]:
  - @effect/platform@0.32.0

## 0.32.3

### Patch Changes

- Updated dependencies [[`7a46ec6`](https://github.com/Effect-TS/platform/commit/7a46ec679e2d4718919c407d0c6c5f0fdc35e62d)]:
  - @effect/platform@0.31.2

## 0.32.2

### Patch Changes

- [#295](https://github.com/Effect-TS/platform/pull/295) [`2f1ca0c`](https://github.com/Effect-TS/platform/commit/2f1ca0cd6d39062fef5717f322cec6767f243def) Thanks [@tim-smart](https://github.com/tim-smart)! - expose node channel apis

## 0.32.1

### Patch Changes

- [#293](https://github.com/Effect-TS/platform/pull/293) [`5a7d254`](https://github.com/Effect-TS/platform/commit/5a7d25406b0841cf6ec49218bd3324a4ddc3df5b) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure http methods are uppercase

- Updated dependencies [[`b712491`](https://github.com/Effect-TS/platform/commit/b71249168eb4623de8dbd28cd0102be688f5caa3)]:
  - @effect/platform@0.31.1

## 0.32.0

### Minor Changes

- [#291](https://github.com/Effect-TS/platform/pull/291) [`5a677f1`](https://github.com/Effect-TS/platform/commit/5a677f1062d7373e21839dfa51db26beef15dca4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#289](https://github.com/Effect-TS/platform/pull/289) [`624855f`](https://github.com/Effect-TS/platform/commit/624855f635162b2c1232429253477d0805e02657) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

- Updated dependencies [[`5a677f1`](https://github.com/Effect-TS/platform/commit/5a677f1062d7373e21839dfa51db26beef15dca4), [`624855f`](https://github.com/Effect-TS/platform/commit/624855f635162b2c1232429253477d0805e02657)]:
  - @effect/platform@0.31.0

## 0.31.9

### Patch Changes

- Updated dependencies [[`d5d0932`](https://github.com/Effect-TS/platform/commit/d5d093219cde4f51afb9251d9ba4270fc70be0c1)]:
  - @effect/platform@0.30.6

## 0.31.8

### Patch Changes

- [#285](https://github.com/Effect-TS/platform/pull/285) [`a13377b`](https://github.com/Effect-TS/platform/commit/a13377b21b1369947f76d1719dd0b4acc5c64086) Thanks [@IMax153](https://github.com/IMax153)! - avoid mutating global state with Terminal service

## 0.31.7

### Patch Changes

- [#283](https://github.com/Effect-TS/platform/pull/283) [`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2) Thanks [@tim-smart](https://github.com/tim-smart)! - add WorkerManager to Node/BunContext

- [#283](https://github.com/Effect-TS/platform/pull/283) [`efd464b`](https://github.com/Effect-TS/platform/commit/efd464bd0b16bb6bf3bb7507f9da835b380fb1a2) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Terminal from Node/BunContext

## 0.31.6

### Patch Changes

- [#282](https://github.com/Effect-TS/platform/pull/282) [`534cb34`](https://github.com/Effect-TS/platform/commit/534cb3486b55e08f9c9cb3f0d955b04da128986c) Thanks [@IMax153](https://github.com/IMax153)! - add Terminal to NodeContext and BunContext

- [#282](https://github.com/Effect-TS/platform/pull/282) [`534cb34`](https://github.com/Effect-TS/platform/commit/534cb3486b55e08f9c9cb3f0d955b04da128986c) Thanks [@IMax153](https://github.com/IMax153)! - fix bug where keypress could still be emit after terminal was quit

- [#280](https://github.com/Effect-TS/platform/pull/280) [`d8e2234`](https://github.com/Effect-TS/platform/commit/d8e2234bc2fa0794e2a4b6a693ae1e7c1836bfb8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Recursive interrupt all fibers on kill

## 0.31.5

### Patch Changes

- Updated dependencies [[`36e449c`](https://github.com/Effect-TS/platform/commit/36e449c95fab80dc54505cef2071dcbecce35b4f)]:
  - @effect/platform@0.30.5

## 0.31.4

### Patch Changes

- [#275](https://github.com/Effect-TS/platform/pull/275) [`e28989e`](https://github.com/Effect-TS/platform/commit/e28989ebd1813cec7ce68f7dd8718f2254e05cad) Thanks [@tim-smart](https://github.com/tim-smart)! - add stack to WorkerError

- Updated dependencies [[`e28989e`](https://github.com/Effect-TS/platform/commit/e28989ebd1813cec7ce68f7dd8718f2254e05cad)]:
  - @effect/platform@0.30.4

## 0.31.3

### Patch Changes

- [#272](https://github.com/Effect-TS/platform/pull/272) [`1a055ac`](https://github.com/Effect-TS/platform/commit/1a055ac959faf12e9c57768b20babea12b1f7d2d) Thanks [@tim-smart](https://github.com/tim-smart)! - add WorkerError to send api

- Updated dependencies [[`1a055ac`](https://github.com/Effect-TS/platform/commit/1a055ac959faf12e9c57768b20babea12b1f7d2d)]:
  - @effect/platform@0.30.3

## 0.31.2

### Patch Changes

- [#270](https://github.com/Effect-TS/platform/pull/270) [`3257fd5`](https://github.com/Effect-TS/platform/commit/3257fd52016af5a38c135de5f0aa33aac7de2538) Thanks [@tim-smart](https://github.com/tim-smart)! - update multipasta

- Updated dependencies [[`3257fd5`](https://github.com/Effect-TS/platform/commit/3257fd52016af5a38c135de5f0aa33aac7de2538)]:
  - @effect/platform@0.30.2

## 0.31.1

### Patch Changes

- [#268](https://github.com/Effect-TS/platform/pull/268) [`58f5ccc`](https://github.com/Effect-TS/platform/commit/58f5ccc07d74abe6820debc0179665e5ef76b5c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

- Updated dependencies [[`58f5ccc`](https://github.com/Effect-TS/platform/commit/58f5ccc07d74abe6820debc0179665e5ef76b5c4)]:
  - @effect/platform@0.30.1

## 0.31.0

### Minor Changes

- [#267](https://github.com/Effect-TS/platform/pull/267) [`3d38b40`](https://github.com/Effect-TS/platform/commit/3d38b40a939e32c6c0e8b62dd53a844a6f389182) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`3d38b40`](https://github.com/Effect-TS/platform/commit/3d38b40a939e32c6c0e8b62dd53a844a6f389182)]:
  - @effect/platform@0.30.0

## 0.30.1

### Patch Changes

- [#263](https://github.com/Effect-TS/platform/pull/263) [`2bbe692`](https://github.com/Effect-TS/platform/commit/2bbe6928aa5e6929e58877ba236547310bca7e2b) Thanks [@tim-smart](https://github.com/tim-smart)! - fix fieldMimeTypes fiber ref

- Updated dependencies [[`2bbe692`](https://github.com/Effect-TS/platform/commit/2bbe6928aa5e6929e58877ba236547310bca7e2b)]:
  - @effect/platform@0.29.1

## 0.30.0

### Minor Changes

- [#250](https://github.com/Effect-TS/platform/pull/250) [`6e18090`](https://github.com/Effect-TS/platform/commit/6e18090db4686cd5564ab9dc3d8771d7b3ad97fa) Thanks [@tim-smart](https://github.com/tim-smart)! - updated FormData model and apis

### Patch Changes

- Updated dependencies [[`6e18090`](https://github.com/Effect-TS/platform/commit/6e18090db4686cd5564ab9dc3d8771d7b3ad97fa)]:
  - @effect/platform@0.29.0

## 0.29.4

### Patch Changes

- [#260](https://github.com/Effect-TS/platform/pull/260) [`8f5e6a2`](https://github.com/Effect-TS/platform/commit/8f5e6a2f2ced4408b0b311b0456828855e1cb958) Thanks [@IMax153](https://github.com/IMax153)! - expose available terminal columns from the Terminal service

- Updated dependencies [[`8f5e6a2`](https://github.com/Effect-TS/platform/commit/8f5e6a2f2ced4408b0b311b0456828855e1cb958)]:
  - @effect/platform@0.28.4

## 0.29.3

### Patch Changes

- Updated dependencies [[`9f79c1f`](https://github.com/Effect-TS/platform/commit/9f79c1f5278e60b3bcbd59f08e20189bcb25a84e)]:
  - @effect/platform@0.28.3

## 0.29.2

### Patch Changes

- [#256](https://github.com/Effect-TS/platform/pull/256) [`62cbddb`](https://github.com/Effect-TS/platform/commit/62cbddb530371291123dea220bfebcc0521b54df) Thanks [@jessekelly881](https://github.com/jessekelly881)! - fix: added missing File type export

- [#255](https://github.com/Effect-TS/platform/pull/255) [`fea76da`](https://github.com/Effect-TS/platform/commit/fea76da05190a65912911bd5b6f9cc0bef3b2edc) Thanks [@IMax153](https://github.com/IMax153)! - add basic Terminal interface for prompting user input

- Updated dependencies [[`fea76da`](https://github.com/Effect-TS/platform/commit/fea76da05190a65912911bd5b6f9cc0bef3b2edc)]:
  - @effect/platform@0.28.2

## 0.29.1

### Patch Changes

- [#253](https://github.com/Effect-TS/platform/pull/253) [`43d2e29`](https://github.com/Effect-TS/platform/commit/43d2e2984fe88b39e907f45f089206ed88ad52d1) Thanks [@fubhy](https://github.com/fubhy)! - Update dependencies

- Updated dependencies [[`43d2e29`](https://github.com/Effect-TS/platform/commit/43d2e2984fe88b39e907f45f089206ed88ad52d1)]:
  - @effect/platform@0.28.1

## 0.29.0

### Minor Changes

- [#251](https://github.com/Effect-TS/platform/pull/251) [`05fef78`](https://github.com/Effect-TS/platform/commit/05fef784ac975059fb6335576feadc7f34644314) Thanks [@fubhy](https://github.com/fubhy)! - Re-added exports for http module

### Patch Changes

- Updated dependencies [[`05fef78`](https://github.com/Effect-TS/platform/commit/05fef784ac975059fb6335576feadc7f34644314)]:
  - @effect/platform@0.28.0

## 0.28.4

### Patch Changes

- [#248](https://github.com/Effect-TS/platform/pull/248) [`8a4b1c1`](https://github.com/Effect-TS/platform/commit/8a4b1c14808d9815eb93a5b10d8a5b26c4dd027b) Thanks [@IMax153](https://github.com/IMax153)! - allow for specifying that a Command should be run in a shell

- Updated dependencies [[`8a4b1c1`](https://github.com/Effect-TS/platform/commit/8a4b1c14808d9815eb93a5b10d8a5b26c4dd027b)]:
  - @effect/platform@0.27.4

## 0.28.3

### Patch Changes

- [#243](https://github.com/Effect-TS/platform/pull/243) [`1ac0a42`](https://github.com/Effect-TS/platform/commit/1ac0a4208184ef1d23d5ad41a7f0e32bc4d80d85) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker interruption

- Updated dependencies [[`1ac0a42`](https://github.com/Effect-TS/platform/commit/1ac0a4208184ef1d23d5ad41a7f0e32bc4d80d85)]:
  - @effect/platform@0.27.3

## 0.28.2

### Patch Changes

- Updated dependencies [[`e2aa7cd`](https://github.com/Effect-TS/platform/commit/e2aa7cd606a735809fbf79327cfebc009e89d84d)]:
  - @effect/platform@0.27.2

## 0.28.1

### Patch Changes

- [#239](https://github.com/Effect-TS/platform/pull/239) [`4d94b9d`](https://github.com/Effect-TS/platform/commit/4d94b9d30adba2bf4f6f6e1d4cd735e6362667c5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`4d94b9d`](https://github.com/Effect-TS/platform/commit/4d94b9d30adba2bf4f6f6e1d4cd735e6362667c5)]:
  - @effect/platform@0.27.1

## 0.28.0

### Minor Changes

- [#237](https://github.com/Effect-TS/platform/pull/237) [`1f79ed6`](https://github.com/Effect-TS/platform/commit/1f79ed6b4d2ee9ae2b59c4536854566c579e77c4) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`1f79ed6`](https://github.com/Effect-TS/platform/commit/1f79ed6b4d2ee9ae2b59c4536854566c579e77c4)]:
  - @effect/platform@0.27.0

## 0.27.9

### Patch Changes

- [#235](https://github.com/Effect-TS/platform/pull/235) [`6e14c02`](https://github.com/Effect-TS/platform/commit/6e14c02db668f380bb92f19037685fe40592a8fe) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for hanging worker shutdown

- Updated dependencies [[`6e14c02`](https://github.com/Effect-TS/platform/commit/6e14c02db668f380bb92f19037685fe40592a8fe)]:
  - @effect/platform@0.26.7

## 0.27.8

### Patch Changes

- [#233](https://github.com/Effect-TS/platform/pull/233) [`71947e0`](https://github.com/Effect-TS/platform/commit/71947e0e0aa9dccf9aad6f63dd98a6b6c89f23b4) Thanks [@tim-smart](https://github.com/tim-smart)! - fix worker scope hanging on close

- Updated dependencies [[`71947e0`](https://github.com/Effect-TS/platform/commit/71947e0e0aa9dccf9aad6f63dd98a6b6c89f23b4)]:
  - @effect/platform@0.26.6

## 0.27.7

### Patch Changes

- [#231](https://github.com/Effect-TS/platform/pull/231) [`a3cbba4`](https://github.com/Effect-TS/platform/commit/a3cbba4a0fa0f1ef99a6d7e54f5ab46c6813ef00) Thanks [@tim-smart](https://github.com/tim-smart)! - add onCreate and broadcast to pool options

- Updated dependencies [[`a3cbba4`](https://github.com/Effect-TS/platform/commit/a3cbba4a0fa0f1ef99a6d7e54f5ab46c6813ef00)]:
  - @effect/platform@0.26.5

## 0.27.6

### Patch Changes

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - type worker runner success as never

- [#229](https://github.com/Effect-TS/platform/pull/229) [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09) Thanks [@tim-smart](https://github.com/tim-smart)! - disable worker pool scaling

- Updated dependencies [[`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09), [`4661a8c`](https://github.com/Effect-TS/platform/commit/4661a8c63a13cc6630d5f3cbac90f4ff1d096e09)]:
  - @effect/platform@0.26.4

## 0.27.5

### Patch Changes

- Updated dependencies [[`abb6baa`](https://github.com/Effect-TS/platform/commit/abb6baa61346580f97d2ab91b84a7342b5becc60)]:
  - @effect/platform@0.26.3

## 0.27.4

### Patch Changes

- [#223](https://github.com/Effect-TS/platform/pull/223) [`3ab8299`](https://github.com/Effect-TS/platform/commit/3ab82991a21e15b4b7f5e53bc2d6e5a807f23698) Thanks [@tim-smart](https://github.com/tim-smart)! - add makeHandler api for node http server

- [#223](https://github.com/Effect-TS/platform/pull/223) [`3ab8299`](https://github.com/Effect-TS/platform/commit/3ab82991a21e15b4b7f5e53bc2d6e5a807f23698) Thanks [@tim-smart](https://github.com/tim-smart)! - add apis to access underlying http request source

## 0.27.3

### Patch Changes

- [#221](https://github.com/Effect-TS/platform/pull/221) [`3e57e82`](https://github.com/Effect-TS/platform/commit/3e57e8224bf7b4474b21ef1dc25db13107d9b635) Thanks [@tim-smart](https://github.com/tim-smart)! - export WorkerRunner layers

## 0.27.2

### Patch Changes

- Updated dependencies [[`f37f58c`](https://github.com/Effect-TS/platform/commit/f37f58ca21c1d5dfedc40c01cde0ffbc954d7e32)]:
  - @effect/platform@0.26.2

## 0.27.1

### Patch Changes

- Updated dependencies [[`7471ac1`](https://github.com/Effect-TS/platform/commit/7471ac139f3c6867cd0d228ec54e88abd1384f5c)]:
  - @effect/platform@0.26.1

## 0.27.0

### Minor Changes

- [#215](https://github.com/Effect-TS/platform/pull/215) [`59da2a6`](https://github.com/Effect-TS/platform/commit/59da2a6877e219b2ca0433aeeecab4ad7487816b) Thanks [@tim-smart](https://github.com/tim-smart)! - seperate request processing in http client

### Patch Changes

- Updated dependencies [[`59da2a6`](https://github.com/Effect-TS/platform/commit/59da2a6877e219b2ca0433aeeecab4ad7487816b)]:
  - @effect/platform@0.26.0

## 0.26.1

### Patch Changes

- [#213](https://github.com/Effect-TS/platform/pull/213) [`38a49eb`](https://github.com/Effect-TS/platform/commit/38a49eb6ea99ef773007a98ec262898207c8f3c7) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`38a49eb`](https://github.com/Effect-TS/platform/commit/38a49eb6ea99ef773007a98ec262898207c8f3c7)]:
  - @effect/platform@0.25.1

## 0.26.0

### Minor Changes

- [#211](https://github.com/Effect-TS/platform/pull/211) [`9ec45cb`](https://github.com/Effect-TS/platform/commit/9ec45cba6b7d5016079ccad9357934f12afe8750) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`9ec45cb`](https://github.com/Effect-TS/platform/commit/9ec45cba6b7d5016079ccad9357934f12afe8750)]:
  - @effect/platform@0.25.0

## 0.25.0

### Minor Changes

- [#209](https://github.com/Effect-TS/platform/pull/209) [`9c51aa1`](https://github.com/Effect-TS/platform/commit/9c51aa18beb7fd34023863ca069d3dde372765d8) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`9c51aa1`](https://github.com/Effect-TS/platform/commit/9c51aa18beb7fd34023863ca069d3dde372765d8)]:
  - @effect/platform@0.24.0

## 0.24.1

### Patch Changes

- [#206](https://github.com/Effect-TS/platform/pull/206) [`b47639b`](https://github.com/Effect-TS/platform/commit/b47639b1df021beb075469921e9ef7a08c174555) Thanks [@tim-smart](https://github.com/tim-smart)! - small stream improvements

- [#208](https://github.com/Effect-TS/platform/pull/208) [`41f8a65`](https://github.com/Effect-TS/platform/commit/41f8a650238bfbac5b8e18d58a431c3605b71aa5) Thanks [@tim-smart](https://github.com/tim-smart)! - add Http.middleware.withLoggerDisabled

- Updated dependencies [[`b47639b`](https://github.com/Effect-TS/platform/commit/b47639b1df021beb075469921e9ef7a08c174555), [`41f8a65`](https://github.com/Effect-TS/platform/commit/41f8a650238bfbac5b8e18d58a431c3605b71aa5)]:
  - @effect/platform@0.23.1

## 0.24.0

### Minor Changes

- [#204](https://github.com/Effect-TS/platform/pull/204) [`ee0c08f`](https://github.com/Effect-TS/platform/commit/ee0c08fd9828eae32696da1bde33d50a3ad9edf3) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`ee0c08f`](https://github.com/Effect-TS/platform/commit/ee0c08fd9828eae32696da1bde33d50a3ad9edf3)]:
  - @effect/platform@0.23.0

## 0.23.2

### Patch Changes

- [#194](https://github.com/Effect-TS/platform/pull/194) [`79b71d8`](https://github.com/Effect-TS/platform/commit/79b71d8cb3aa6520b2dcb7930850b423174e04b2) Thanks [@tim-smart](https://github.com/tim-smart)! - add Worker & WorkerRunner modules

- Updated dependencies [[`79b71d8`](https://github.com/Effect-TS/platform/commit/79b71d8cb3aa6520b2dcb7930850b423174e04b2)]:
  - @effect/platform@0.22.1

## 0.23.1

### Patch Changes

- [#200](https://github.com/Effect-TS/platform/pull/200) [`58a002a`](https://github.com/Effect-TS/platform/commit/58a002acaafdb31e601c0de1878f4a8dee723e13) Thanks [@tim-smart](https://github.com/tim-smart)! - fix hanging node Sink fromWritable

## 0.23.0

### Minor Changes

- [#197](https://github.com/Effect-TS/platform/pull/197) [`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559) Thanks [@tim-smart](https://github.com/tim-smart)! - update api for Stream.toString & toUint8Array

- [#199](https://github.com/Effect-TS/platform/pull/199) [`1e94b15`](https://github.com/Effect-TS/platform/commit/1e94b1588e51df20f9c4fc4871b246048751506c) Thanks [@tim-smart](https://github.com/tim-smart)! - enable tracing by default

### Patch Changes

- [#197](https://github.com/Effect-TS/platform/pull/197) [`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559) Thanks [@tim-smart](https://github.com/tim-smart)! - fix for non-compliant node steams

- [#197](https://github.com/Effect-TS/platform/pull/197) [`fcc5871`](https://github.com/Effect-TS/platform/commit/fcc5871d326296334ff9a421860d69e697eea559) Thanks [@tim-smart](https://github.com/tim-smart)! - accept NodeJS.\*Stream in Stream & Sink modules

- Updated dependencies [[`1e94b15`](https://github.com/Effect-TS/platform/commit/1e94b1588e51df20f9c4fc4871b246048751506c)]:
  - @effect/platform@0.22.0

## 0.22.1

### Patch Changes

- [#195](https://github.com/Effect-TS/platform/pull/195) [`25ce726`](https://github.com/Effect-TS/platform/commit/25ce72656a9addbb1f4d539ea69423b73fe43f46) Thanks [@tim-smart](https://github.com/tim-smart)! - add Stream.fromDuplex & pipeThroughDuplex/Simple

## 0.22.0

### Minor Changes

- [#193](https://github.com/Effect-TS/platform/pull/193) [`9ec4b1d`](https://github.com/Effect-TS/platform/commit/9ec4b1d284caa1c4f19a58c46ed7c25fb10d39a5) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#191](https://github.com/Effect-TS/platform/pull/191) [`2711aea`](https://github.com/Effect-TS/platform/commit/2711aea855936c82c282e61fbc6d2f1a1ab6778a) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`2711aea`](https://github.com/Effect-TS/platform/commit/2711aea855936c82c282e61fbc6d2f1a1ab6778a), [`9ec4b1d`](https://github.com/Effect-TS/platform/commit/9ec4b1d284caa1c4f19a58c46ed7c25fb10d39a5)]:
  - @effect/platform@0.21.0

## 0.21.0

### Minor Changes

- [#189](https://github.com/Effect-TS/platform/pull/189) [`b07f8cd`](https://github.com/Effect-TS/platform/commit/b07f8cd50ef44d577aa981a532025aedb364df13) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- Updated dependencies [[`b07f8cd`](https://github.com/Effect-TS/platform/commit/b07f8cd50ef44d577aa981a532025aedb364df13)]:
  - @effect/platform@0.20.0

## 0.20.1

### Patch Changes

- [#187](https://github.com/Effect-TS/platform/pull/187) [`26e05da`](https://github.com/Effect-TS/platform/commit/26e05dad112fa43403b23ebc815a98f0c95e0558) Thanks [@tim-smart](https://github.com/tim-smart)! - fix order of pre response access

## 0.20.0

### Minor Changes

- [#184](https://github.com/Effect-TS/platform/pull/184) [`903b599`](https://github.com/Effect-TS/platform/commit/903b5995bb407c399846e6b75e47e53098b2c80d) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

### Patch Changes

- [#186](https://github.com/Effect-TS/platform/pull/186) [`a3bcda4`](https://github.com/Effect-TS/platform/commit/a3bcda4c2c6655ab86769cca60bece5eb64f866e) Thanks [@tim-smart](https://github.com/tim-smart)! - add pre response handlers to http

- Updated dependencies [[`903b599`](https://github.com/Effect-TS/platform/commit/903b5995bb407c399846e6b75e47e53098b2c80d), [`a3bcda4`](https://github.com/Effect-TS/platform/commit/a3bcda4c2c6655ab86769cca60bece5eb64f866e)]:
  - @effect/platform@0.19.0

## 0.19.9

### Patch Changes

- [#181](https://github.com/Effect-TS/platform/pull/181) [`d0d5458`](https://github.com/Effect-TS/platform/commit/d0d545869baeb91d594804ab759713f424eb7a11) Thanks [@tim-smart](https://github.com/tim-smart)! - fix error type exports

## 0.19.8

### Patch Changes

- [#179](https://github.com/Effect-TS/platform/pull/179) [`843488f`](https://github.com/Effect-TS/platform/commit/843488f79b253518f131693faf2955f5c795a1bc) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`843488f`](https://github.com/Effect-TS/platform/commit/843488f79b253518f131693faf2955f5c795a1bc)]:
  - @effect/platform@0.18.7

## 0.19.7

### Patch Changes

- [#174](https://github.com/Effect-TS/platform/pull/174) [`6116f8b`](https://github.com/Effect-TS/platform/commit/6116f8b39533c897445713c7dce531c0c60a1cbb) Thanks [@vecerek](https://github.com/vecerek)! - handle empty body when parsing responses as json

## 0.19.6

### Patch Changes

- [#175](https://github.com/Effect-TS/platform/pull/175) [`d1c2b38`](https://github.com/Effect-TS/platform/commit/d1c2b38cbb1189249c0bfd47582e00ff771428e3) Thanks [@tim-smart](https://github.com/tim-smart)! - make ServerResponse an Effect

- Updated dependencies [[`7e4e2a5`](https://github.com/Effect-TS/platform/commit/7e4e2a5d815c677e4eb6adb2c6e9369414a79384), [`d1c2b38`](https://github.com/Effect-TS/platform/commit/d1c2b38cbb1189249c0bfd47582e00ff771428e3)]:
  - @effect/platform@0.18.6

## 0.19.5

### Patch Changes

- [#171](https://github.com/Effect-TS/platform/pull/171) [`fbbcaa9`](https://github.com/Effect-TS/platform/commit/fbbcaa9b1d4f48f204072a802fb11bcb29813664) Thanks [@tim-smart](https://github.com/tim-smart)! - remove preserveModules patch for preconstruct

- Updated dependencies [[`fbbcaa9`](https://github.com/Effect-TS/platform/commit/fbbcaa9b1d4f48f204072a802fb11bcb29813664)]:
  - @effect/platform@0.18.5

## 0.19.4

### Patch Changes

- [#169](https://github.com/Effect-TS/platform/pull/169) [`bd8778d`](https://github.com/Effect-TS/platform/commit/bd8778d1a534f28cab4b326bb25c086fafed8101) Thanks [@tim-smart](https://github.com/tim-smart)! - fix nested modules

- Updated dependencies [[`bd8778d`](https://github.com/Effect-TS/platform/commit/bd8778d1a534f28cab4b326bb25c086fafed8101)]:
  - @effect/platform@0.18.4

## 0.19.3

### Patch Changes

- [#167](https://github.com/Effect-TS/platform/pull/167) [`7027589`](https://github.com/Effect-TS/platform/commit/7027589d6dde621065eb8834a2b1ba4d3adc943b) Thanks [@tim-smart](https://github.com/tim-smart)! - build with preconstruct

- Updated dependencies [[`7027589`](https://github.com/Effect-TS/platform/commit/7027589d6dde621065eb8834a2b1ba4d3adc943b)]:
  - @effect/platform@0.18.3

## 0.19.2

### Patch Changes

- [#165](https://github.com/Effect-TS/platform/pull/165) [`7e3a741`](https://github.com/Effect-TS/platform/commit/7e3a74197325566df47f9b4459e518eea0762d13) Thanks [@fubhy](https://github.com/fubhy)! - Fix peer deps version range

- Updated dependencies [[`7e3a741`](https://github.com/Effect-TS/platform/commit/7e3a74197325566df47f9b4459e518eea0762d13)]:
  - @effect/platform@0.18.2

## 0.19.1

### Patch Changes

- [#163](https://github.com/Effect-TS/platform/pull/163) [`c957232`](https://github.com/Effect-TS/platform/commit/c9572328ee37f44e93e933da622b21df414bf5c6) Thanks [@tim-smart](https://github.com/tim-smart)! - update effect

- Updated dependencies [[`c957232`](https://github.com/Effect-TS/platform/commit/c9572328ee37f44e93e933da622b21df414bf5c6)]:
  - @effect/platform@0.18.1

## 0.19.0

### Minor Changes

- [#160](https://github.com/Effect-TS/platform/pull/160) [`c2dc0ab`](https://github.com/Effect-TS/platform/commit/c2dc0abb20b073fd19e38b4e61a08b1edee0f37f) Thanks [@fubhy](https://github.com/fubhy)! - update to effect package

### Patch Changes

- Updated dependencies [[`c2dc0ab`](https://github.com/Effect-TS/platform/commit/c2dc0abb20b073fd19e38b4e61a08b1edee0f37f)]:
  - @effect/platform@0.18.0

## 0.18.1

### Patch Changes

- Updated dependencies [[`9b10bf3`](https://github.com/Effect-TS/platform/commit/9b10bf394106ba0bafd8440dc0b3fba30a5cc1ea)]:
  - @effect/platform@0.17.1

## 0.18.0

### Minor Changes

- [#156](https://github.com/Effect-TS/platform/pull/156) [`e6c4101`](https://github.com/Effect-TS/platform/commit/e6c41011e5420d90c543dd25d87036d4150f3e85) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`e6c4101`](https://github.com/Effect-TS/platform/commit/e6c41011e5420d90c543dd25d87036d4150f3e85)]:
  - @effect/platform@0.17.0

## 0.17.0

### Minor Changes

- [#153](https://github.com/Effect-TS/platform/pull/153) [`be1b6f0`](https://github.com/Effect-TS/platform/commit/be1b6f036246713a55462ec76e8d999eae654cd7) Thanks [@IMax153](https://github.com/IMax153)! - make platform-node an explicit dependency of platform-bun

- [#155](https://github.com/Effect-TS/platform/pull/155) [`937b9e5`](https://github.com/Effect-TS/platform/commit/937b9e5c00f80bea128f21c7f5bfa662ba1d45bd) Thanks [@tim-smart](https://github.com/tim-smart)! - use direct deps in sibling packages

## 0.16.2

### Patch Changes

- [#151](https://github.com/Effect-TS/platform/pull/151) [`ea877f8`](https://github.com/Effect-TS/platform/commit/ea877f8948a43a394658abf8b781a56a097624e9) Thanks [@tim-smart](https://github.com/tim-smart)! - fix exitCode for already exited processes

## 0.16.1

### Patch Changes

- [#148](https://github.com/Effect-TS/platform/pull/148) [`492f0e7`](https://github.com/Effect-TS/platform/commit/492f0e700e939ded6ff17eeca4d50a9e1ce59219) Thanks [@tim-smart](https://github.com/tim-smart)! - add IncomingMessage.remoteAddress

- Updated dependencies [[`492f0e7`](https://github.com/Effect-TS/platform/commit/492f0e700e939ded6ff17eeca4d50a9e1ce59219)]:
  - @effect/platform@0.16.1

## 0.16.0

### Minor Changes

- [#145](https://github.com/Effect-TS/platform/pull/145) [`d0522be`](https://github.com/Effect-TS/platform/commit/d0522be6f824571d83be8c6aa16a3d7caa1b3447) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#144](https://github.com/Effect-TS/platform/pull/144) [`6583ad4`](https://github.com/Effect-TS/platform/commit/6583ad4ef5b718620c873208bb11196d35733034) Thanks [@tim-smart](https://github.com/tim-smart)! - b3 header propagation in http client and server

- Updated dependencies [[`d0522be`](https://github.com/Effect-TS/platform/commit/d0522be6f824571d83be8c6aa16a3d7caa1b3447), [`6583ad4`](https://github.com/Effect-TS/platform/commit/6583ad4ef5b718620c873208bb11196d35733034)]:
  - @effect/platform@0.16.0

## 0.15.2

### Patch Changes

- [#142](https://github.com/Effect-TS/platform/pull/142) [`8571c36`](https://github.com/Effect-TS/platform/commit/8571c36f1f8a6ab36b23ee26922cf58def15196e) Thanks [@tim-smart](https://github.com/tim-smart)! - fix mime package import

- Updated dependencies [[`06e27ce`](https://github.com/Effect-TS/platform/commit/06e27ce29553ea8d0a234b941fa1de1a51996fbf)]:
  - @effect/platform@0.15.2

## 0.15.1

### Patch Changes

- Updated dependencies [[`2b2f658`](https://github.com/Effect-TS/platform/commit/2b2f6583a7e589a4c7ab8c22bec390ef755f54c3)]:
  - @effect/platform@0.15.1

## 0.15.0

### Minor Changes

- [#135](https://github.com/Effect-TS/platform/pull/135) [`99f2a49`](https://github.com/Effect-TS/platform/commit/99f2a49c614a5b80646f6600a170609fe7e38025) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`99f2a49`](https://github.com/Effect-TS/platform/commit/99f2a49c614a5b80646f6600a170609fe7e38025)]:
  - @effect/platform@0.15.0

## 0.14.1

### Patch Changes

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - add http platform abstraction

- [#133](https://github.com/Effect-TS/platform/pull/133) [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f) Thanks [@tim-smart](https://github.com/tim-smart)! - handle HEAD requests

- Updated dependencies [[`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f), [`1d2c403`](https://github.com/Effect-TS/platform/commit/1d2c4033af11f18ba09f53dcfdf8b3fc399bd22f)]:
  - @effect/platform@0.14.1

## 0.14.0

### Minor Changes

- [#130](https://github.com/Effect-TS/platform/pull/130) [`2713c4f`](https://github.com/Effect-TS/platform/commit/2713c4f766f5493303221772368710a09033658d) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`2713c4f`](https://github.com/Effect-TS/platform/commit/2713c4f766f5493303221772368710a09033658d)]:
  - @effect/platform@0.14.0

## 0.13.18

### Patch Changes

- [#127](https://github.com/Effect-TS/platform/pull/127) [`12fbbe9`](https://github.com/Effect-TS/platform/commit/12fbbe9366e3a07895326614ec911ff2601138b1) Thanks [@tim-smart](https://github.com/tim-smart)! - interrupt http app if request is aborted

## 0.13.17

### Patch Changes

- [#125](https://github.com/Effect-TS/platform/pull/125) [`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217) Thanks [@tim-smart](https://github.com/tim-smart)! - restruture platform-node for platform-bun reuse

- Updated dependencies [[`eb54e53`](https://github.com/Effect-TS/platform/commit/eb54e53d95e7b863d8ffdff9de12b0abd462b217)]:
  - @effect/platform@0.13.16

## 0.13.16

### Patch Changes

- Updated dependencies [[`07089a8`](https://github.com/Effect-TS/platform/commit/07089a877fd72b2c1b30016f92af162bbb6ff2c8)]:
  - @effect/platform@0.13.15

## 0.13.15

### Patch Changes

- [#121](https://github.com/Effect-TS/platform/pull/121) [`1b8498f`](https://github.com/Effect-TS/platform/commit/1b8498f9dee68f2a2e93ec10c62b632c65e0017a) Thanks [@tim-smart](https://github.com/tim-smart)! - export KeyValueStore in platform-node

## 0.13.14

### Patch Changes

- [#120](https://github.com/Effect-TS/platform/pull/120) [`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747) Thanks [@tim-smart](https://github.com/tim-smart)! - add KeyValueStore.SchemaStore

- [#111](https://github.com/Effect-TS/platform/pull/111) [`6e96703`](https://github.com/Effect-TS/platform/commit/6e96703186f38bd481bffa906e0f99dee89b8e7e) Thanks [@jessekelly881](https://github.com/jessekelly881)! - add KeyValueStore module

- [#120](https://github.com/Effect-TS/platform/pull/120) [`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747) Thanks [@tim-smart](https://github.com/tim-smart)! - add KeyValueStore.prefix

- Updated dependencies [[`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747), [`6e96703`](https://github.com/Effect-TS/platform/commit/6e96703186f38bd481bffa906e0f99dee89b8e7e), [`9cda8c9`](https://github.com/Effect-TS/platform/commit/9cda8c9ce78d5a9c841a828df20401a0dc07b747)]:
  - @effect/platform@0.13.14

## 0.13.13

### Patch Changes

- [#117](https://github.com/Effect-TS/platform/pull/117) [`ee7e365`](https://github.com/Effect-TS/platform/commit/ee7e365eafd8b62bab5bc32dd94e3f1190f6e7d6) Thanks [@tim-smart](https://github.com/tim-smart)! - add support for File web api to http

- Updated dependencies [[`ee7e365`](https://github.com/Effect-TS/platform/commit/ee7e365eafd8b62bab5bc32dd94e3f1190f6e7d6)]:
  - @effect/platform@0.13.13

## 0.13.12

### Patch Changes

- Updated dependencies [[`4cba795`](https://github.com/Effect-TS/platform/commit/4cba79529426483775782f2384b2194ff57f1279)]:
  - @effect/platform@0.13.12

## 0.13.11

### Patch Changes

- Updated dependencies [[`5945805`](https://github.com/Effect-TS/platform/commit/59458051ad3885d23c4657369a9a46015f4e569c)]:
  - @effect/platform@0.13.11

## 0.13.10

### Patch Changes

- [#109](https://github.com/Effect-TS/platform/pull/109) [`7031ec0`](https://github.com/Effect-TS/platform/commit/7031ec030a45a306f4fda4d3ed80796f98a7758e) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Body.EffectBody

- Updated dependencies [[`7031ec0`](https://github.com/Effect-TS/platform/commit/7031ec030a45a306f4fda4d3ed80796f98a7758e)]:
  - @effect/platform@0.13.10

## 0.13.9

### Patch Changes

- Updated dependencies [[`df3dbcf`](https://github.com/Effect-TS/platform/commit/df3dbcf468d10dca8cdb219478bb0a23bc66da0c)]:
  - @effect/platform@0.13.9

## 0.13.8

### Patch Changes

- [#105](https://github.com/Effect-TS/platform/pull/105) [`127c8f5`](https://github.com/Effect-TS/platform/commit/127c8f50f69d5cf7e4a50241fca70923f71f61a2) Thanks [@tim-smart](https://github.com/tim-smart)! - add more form data limit config

- Updated dependencies [[`e42c3f5`](https://github.com/Effect-TS/platform/commit/e42c3f5103b7361b5162a3e9280759ecd690295f), [`127c8f5`](https://github.com/Effect-TS/platform/commit/127c8f50f69d5cf7e4a50241fca70923f71f61a2)]:
  - @effect/platform@0.13.8

## 0.13.7

### Patch Changes

- [#97](https://github.com/Effect-TS/platform/pull/97) [`e5c91eb`](https://github.com/Effect-TS/platform/commit/e5c91eb541a6f97cb759ba39732cf08b0ae4c248) Thanks [@tim-smart](https://github.com/tim-smart)! - rename IncomingMessage.urlParams to urlParamsBody

- Updated dependencies [[`e5c91eb`](https://github.com/Effect-TS/platform/commit/e5c91eb541a6f97cb759ba39732cf08b0ae4c248)]:
  - @effect/platform@0.13.7

## 0.13.6

### Patch Changes

- Updated dependencies [[`cd3b15e`](https://github.com/Effect-TS/platform/commit/cd3b15e0cb223d2788d383caaa7c0dbc06073dc1)]:
  - @effect/platform@0.13.6

## 0.13.5

### Patch Changes

- Updated dependencies [[`a034383`](https://github.com/Effect-TS/platform/commit/a0343838bad8f37ab7fb6031084a6514103eba2b)]:
  - @effect/platform@0.13.5

## 0.13.4

### Patch Changes

- [#89](https://github.com/Effect-TS/platform/pull/89) [`30025cb`](https://github.com/Effect-TS/platform/commit/30025cbd773b4ded89ffdb20a523a4350eb0452e) Thanks [@tim-smart](https://github.com/tim-smart)! - add etag generation for http file responses

- Updated dependencies [[`05d1765`](https://github.com/Effect-TS/platform/commit/05d1765a0606abce8a3c3d026bdcd5d8b3c64936), [`30025cb`](https://github.com/Effect-TS/platform/commit/30025cbd773b4ded89ffdb20a523a4350eb0452e)]:
  - @effect/platform@0.13.4

## 0.13.3

### Patch Changes

- Updated dependencies [[`6dfc5b0`](https://github.com/Effect-TS/platform/commit/6dfc5b0fbec0e8a057a26c009f19c9951e4b3ba4), [`d7fffeb`](https://github.com/Effect-TS/platform/commit/d7fffeb38a1c40ad3847e4e5b966f58939d1ba83)]:
  - @effect/platform@0.13.3

## 0.13.2

### Patch Changes

- [#83](https://github.com/Effect-TS/platform/pull/83) [`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602) Thanks [@tim-smart](https://github.com/tim-smart)! - update deps

- [#81](https://github.com/Effect-TS/platform/pull/81) [`c1ec2ba`](https://github.com/Effect-TS/platform/commit/c1ec2bab2b1c134c49a82fd5dbb741b0df3d1cd9) Thanks [@tim-smart](https://github.com/tim-smart)! - use ReadonlyRecord for headers

- [#83](https://github.com/Effect-TS/platform/pull/83) [`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602) Thanks [@tim-smart](https://github.com/tim-smart)! - performance tweaks

- Updated dependencies [[`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602), [`c1ec2ba`](https://github.com/Effect-TS/platform/commit/c1ec2bab2b1c134c49a82fd5dbb741b0df3d1cd9), [`ce5e086`](https://github.com/Effect-TS/platform/commit/ce5e0869390d571d21f854b6c1073bf10136e602)]:
  - @effect/platform@0.13.2

## 0.13.1

### Patch Changes

- [#79](https://github.com/Effect-TS/platform/pull/79) [`3544c17`](https://github.com/Effect-TS/platform/commit/3544c17f5778ab47cb4019b6458b2543d572629a) Thanks [@TylorS](https://github.com/TylorS)! - Attempt to derive content-type from headers

- Updated dependencies [[`3544c17`](https://github.com/Effect-TS/platform/commit/3544c17f5778ab47cb4019b6458b2543d572629a)]:
  - @effect/platform@0.13.1

## 0.13.0

### Minor Changes

- [#77](https://github.com/Effect-TS/platform/pull/77) [`e97d80b`](https://github.com/Effect-TS/platform/commit/e97d80bd69646195a65ea6dfe13c6af19589d2cf) Thanks [@tim-smart](https://github.com/tim-smart)! - remove Console module

### Patch Changes

- Updated dependencies [[`e97d80b`](https://github.com/Effect-TS/platform/commit/e97d80bd69646195a65ea6dfe13c6af19589d2cf)]:
  - @effect/platform@0.13.0

## 0.12.1

### Patch Changes

- Updated dependencies [[`d23ff14`](https://github.com/Effect-TS/platform/commit/d23ff14756796e945307ccfdf65252d47f99b7aa)]:
  - @effect/platform@0.12.1

## 0.12.0

### Minor Changes

- [#71](https://github.com/Effect-TS/platform/pull/71) [`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9) Thanks [@tim-smart](https://github.com/tim-smart)! - add HttpServer module

### Patch Changes

- [#71](https://github.com/Effect-TS/platform/pull/71) [`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9) Thanks [@tim-smart](https://github.com/tim-smart)! - add SizeInput type

- Updated dependencies [[`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9), [`139de2e`](https://github.com/Effect-TS/platform/commit/139de2e18adcf6661609909ec6afd44abe4cb1a9)]:
  - @effect/platform@0.12.0

## 0.11.5

### Patch Changes

- [#69](https://github.com/Effect-TS/platform/pull/69) [`0eb7df0`](https://github.com/Effect-TS/platform/commit/0eb7df0e2cbfb96986c3bbee4650c4036a97b1d2) Thanks [@tim-smart](https://github.com/tim-smart)! - have Command & Client implement Pipeable

- Updated dependencies [[`0eb7df0`](https://github.com/Effect-TS/platform/commit/0eb7df0e2cbfb96986c3bbee4650c4036a97b1d2)]:
  - @effect/platform@0.11.5

## 0.11.4

### Patch Changes

- [#67](https://github.com/Effect-TS/platform/pull/67) [`c41a166`](https://github.com/Effect-TS/platform/commit/c41a16614bc4daff05956b84a6bcd01cbb5836dd) Thanks [@tim-smart](https://github.com/tim-smart)! - add node implementation of http client

- Updated dependencies [[`c41a166`](https://github.com/Effect-TS/platform/commit/c41a16614bc4daff05956b84a6bcd01cbb5836dd)]:
  - @effect/platform@0.11.4

## 0.11.3

### Patch Changes

- Updated dependencies [[`6f2d011`](https://github.com/Effect-TS/platform/commit/6f2d011ce917d74d14b0375525f5c9805f8e44fe)]:
  - @effect/platform@0.11.3

## 0.11.2

### Patch Changes

- [#62](https://github.com/Effect-TS/platform/pull/62) [`3d44256`](https://github.com/Effect-TS/platform/commit/3d442560fee94a0c8f01f936a3f7c5b5e1ac8fc2) Thanks [@tim-smart](https://github.com/tim-smart)! - improve http client options type

- Updated dependencies [[`3d44256`](https://github.com/Effect-TS/platform/commit/3d442560fee94a0c8f01f936a3f7c5b5e1ac8fc2)]:
  - @effect/platform@0.11.2

## 0.11.1

### Patch Changes

- [#38](https://github.com/Effect-TS/platform/pull/38) [`f70a121`](https://github.com/Effect-TS/platform/commit/f70a121b2fc9d1052434863c41657d353d21fb26) Thanks [@tim-smart](https://github.com/tim-smart)! - add HttpClient module

- Updated dependencies [[`f70a121`](https://github.com/Effect-TS/platform/commit/f70a121b2fc9d1052434863c41657d353d21fb26)]:
  - @effect/platform@0.11.1

## 0.11.0

### Minor Changes

- [#59](https://github.com/Effect-TS/platform/pull/59) [`b2f7bc0`](https://github.com/Effect-TS/platform/commit/b2f7bc0fe7310d861d52da03fefd9bc91852e5f9) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#58](https://github.com/Effect-TS/platform/pull/58) [`f61aa57`](https://github.com/Effect-TS/platform/commit/f61aa57a915ee221fdf5259cbaf1e4fe208e01b8) Thanks [@tim-smart](https://github.com/tim-smart)! - update build tools

- [#56](https://github.com/Effect-TS/platform/pull/56) [`efcf469`](https://github.com/Effect-TS/platform/commit/efcf469da368770b2f321043a8e0e33f079c169b) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to peerDependencies

- Updated dependencies [[`b2f7bc0`](https://github.com/Effect-TS/platform/commit/b2f7bc0fe7310d861d52da03fefd9bc91852e5f9), [`f61aa57`](https://github.com/Effect-TS/platform/commit/f61aa57a915ee221fdf5259cbaf1e4fe208e01b8), [`efcf469`](https://github.com/Effect-TS/platform/commit/efcf469da368770b2f321043a8e0e33f079c169b)]:
  - @effect/platform@0.11.0

## 0.10.5

### Patch Changes

- [#55](https://github.com/Effect-TS/platform/pull/55) [`67caeff`](https://github.com/Effect-TS/platform/commit/67caeffb5343b4ce428aa3c6b393feb383667fef) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Path tag in node package

- [#55](https://github.com/Effect-TS/platform/pull/55) [`67caeff`](https://github.com/Effect-TS/platform/commit/67caeffb5343b4ce428aa3c6b393feb383667fef) Thanks [@tim-smart](https://github.com/tim-smart)! - add labels to Tags

- [#46](https://github.com/Effect-TS/platform/pull/46) [`4a4d0af`](https://github.com/Effect-TS/platform/commit/4a4d0af4832f543fc53b2ba5c9fc9739bbc78f2e) Thanks [@fubhy](https://github.com/fubhy)! - add seek method to file handles

- Updated dependencies [[`67caeff`](https://github.com/Effect-TS/platform/commit/67caeffb5343b4ce428aa3c6b393feb383667fef), [`4a4d0af`](https://github.com/Effect-TS/platform/commit/4a4d0af4832f543fc53b2ba5c9fc9739bbc78f2e), [`b3950e1`](https://github.com/Effect-TS/platform/commit/b3950e1373673ae492106fe0cb76bcd32fbe5a2b)]:
  - @effect/platform@0.10.4

## 0.10.4

### Patch Changes

- Updated dependencies [[`9163d96`](https://github.com/Effect-TS/platform/commit/9163d96717a832e9dbf2bdd262d73034fcbe92e9)]:
  - @effect/platform@0.10.3

## 0.10.3

### Patch Changes

- Updated dependencies [[`44eaaf5`](https://github.com/Effect-TS/platform/commit/44eaaf5c182dc70c73b7da9687e9c0a81daea86c)]:
  - @effect/platform@0.10.2

## 0.10.2

### Patch Changes

- [#47](https://github.com/Effect-TS/platform/pull/47) [`24b56d5`](https://github.com/Effect-TS/platform/commit/24b56d5d6afa40df072e2db37ebd71df538e66ac) Thanks [@tim-smart](https://github.com/tim-smart)! - add exists and readFileString to FileSystem

- Updated dependencies [[`24b56d5`](https://github.com/Effect-TS/platform/commit/24b56d5d6afa40df072e2db37ebd71df538e66ac)]:
  - @effect/platform@0.10.1

## 0.10.1

### Patch Changes

- [#43](https://github.com/Effect-TS/platform/pull/43) [`b92639a`](https://github.com/Effect-TS/platform/commit/b92639aad9bb4c5cd91ed191a5a45d26d048ac9a) Thanks [@fubhy](https://github.com/fubhy)! - Fixed `truncate` to support `undefined` as size.

## 0.10.0

### Minor Changes

- [#41](https://github.com/Effect-TS/platform/pull/41) [`68cbdca`](https://github.com/Effect-TS/platform/commit/68cbdca7e9da509c212d44101ab61c3bcf1354ad) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data, /io and /stream

### Patch Changes

- Updated dependencies [[`68cbdca`](https://github.com/Effect-TS/platform/commit/68cbdca7e9da509c212d44101ab61c3bcf1354ad)]:
  - @effect/platform@0.10.0

## 0.9.0

### Minor Changes

- [#39](https://github.com/Effect-TS/platform/pull/39) [`3012e28`](https://github.com/Effect-TS/platform/commit/3012e289272d383fdae16af6b3ba396dec290b77) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`3012e28`](https://github.com/Effect-TS/platform/commit/3012e289272d383fdae16af6b3ba396dec290b77)]:
  - @effect/platform@0.9.0

## 0.8.0

### Minor Changes

- [#36](https://github.com/Effect-TS/platform/pull/36) [`b82cbcc`](https://github.com/Effect-TS/platform/commit/b82cbcc56789c014f0a50c505497239ec220f4fd) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- Updated dependencies [[`b82cbcc`](https://github.com/Effect-TS/platform/commit/b82cbcc56789c014f0a50c505497239ec220f4fd)]:
  - @effect/platform@0.8.0

## 0.7.0

### Minor Changes

- [#34](https://github.com/Effect-TS/platform/pull/34) [`601d045`](https://github.com/Effect-TS/platform/commit/601d04526ad0a2e3285de509fdf86c7b6809a547) Thanks [@tim-smart](https://github.com/tim-smart)! - update /stream

### Patch Changes

- Updated dependencies [[`601d045`](https://github.com/Effect-TS/platform/commit/601d04526ad0a2e3285de509fdf86c7b6809a547)]:
  - @effect/platform@0.7.0

## 0.6.0

### Minor Changes

- [#32](https://github.com/Effect-TS/platform/pull/32) [`ee94eae`](https://github.com/Effect-TS/platform/commit/ee94eae46aee327baf0c6960befa6c35154fa35b) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

### Patch Changes

- Updated dependencies [[`ee94eae`](https://github.com/Effect-TS/platform/commit/ee94eae46aee327baf0c6960befa6c35154fa35b)]:
  - @effect/platform@0.6.0

## 0.5.1

### Patch Changes

- [#30](https://github.com/Effect-TS/platform/pull/30) [`aee2977`](https://github.com/Effect-TS/platform/commit/aee29776d9291f2ff8cf3379d5c6251a55343b51) Thanks [@tim-smart](https://github.com/tim-smart)! - set fromReadable buffer to 1

## 0.5.0

### Minor Changes

- [#28](https://github.com/Effect-TS/platform/pull/28) [`f3d73f5`](https://github.com/Effect-TS/platform/commit/f3d73f587ad9b528bb1e37cf44e4928d913f56dd) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

### Patch Changes

- Updated dependencies [[`f3d73f5`](https://github.com/Effect-TS/platform/commit/f3d73f587ad9b528bb1e37cf44e4928d913f56dd)]:
  - @effect/platform@0.5.0

## 0.4.0

### Minor Changes

- [#26](https://github.com/Effect-TS/platform/pull/26) [`834e1a7`](https://github.com/Effect-TS/platform/commit/834e1a793365f4deb742814d9cd6df9faae9d0c2) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

### Patch Changes

- Updated dependencies [[`834e1a7`](https://github.com/Effect-TS/platform/commit/834e1a793365f4deb742814d9cd6df9faae9d0c2)]:
  - @effect/platform@0.4.0

## 0.3.1

### Patch Changes

- [#24](https://github.com/Effect-TS/platform/pull/24) [`8f29d2a`](https://github.com/Effect-TS/platform/commit/8f29d2a2c5681044e3a0fa13dd7d107f9fe9cfae) Thanks [@tim-smart](https://github.com/tim-smart)! - fix offset option in node file system

## 0.3.0

### Minor Changes

- [#22](https://github.com/Effect-TS/platform/pull/22) [`645f10f`](https://github.com/Effect-TS/platform/commit/645f10f6d6a8600e369f068b22f3c2ef5169e867) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

### Patch Changes

- Updated dependencies [[`645f10f`](https://github.com/Effect-TS/platform/commit/645f10f6d6a8600e369f068b22f3c2ef5169e867)]:
  - @effect/platform@0.3.0

## 0.2.0

### Minor Changes

- [#20](https://github.com/Effect-TS/platform/pull/20) [`756ccbe`](https://github.com/Effect-TS/platform/commit/756ccbe002f2e00c02b88aac126c2bc5b17a5769) Thanks [@IMax153](https://github.com/IMax153)! - upgrade to `@effect/data@0.13.5`, `@effect/io@0.31.3`, and `@effect/stream@0.25.1`

### Patch Changes

- Updated dependencies [[`756ccbe`](https://github.com/Effect-TS/platform/commit/756ccbe002f2e00c02b88aac126c2bc5b17a5769)]:
  - @effect/platform@0.2.0

## 0.1.1

### Patch Changes

- [#17](https://github.com/Effect-TS/platform/pull/17) [`1ea91bf`](https://github.com/Effect-TS/platform/commit/1ea91bf6ecf8778b7b063afb22041c3f75a90650) Thanks [@tim-smart](https://github.com/tim-smart)! - allow unsetting fromReadable chunkSize

## 0.1.0

### Minor Changes

- [#13](https://github.com/Effect-TS/platform/pull/13) [`b95c25f`](https://github.com/Effect-TS/platform/commit/b95c25f619b8e5ebf915f675f63de01accb1a8b8) Thanks [@tim-smart](https://github.com/tim-smart)! - initial release

### Patch Changes

- Updated dependencies [[`b95c25f`](https://github.com/Effect-TS/platform/commit/b95c25f619b8e5ebf915f675f63de01accb1a8b8)]:
  - @effect/platform@0.1.0
