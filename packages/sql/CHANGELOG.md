# @effect/sql

## 0.16.1

### Patch Changes

- Updated dependencies [[`b75ac5d`](https://github.com/Effect-TS/effect/commit/b75ac5d0909115507bedc90f18f2d34deb217769)]:
  - @effect/platform@0.68.1
  - @effect/experimental@0.29.1

## 0.16.0

### Patch Changes

- [#3720](https://github.com/Effect-TS/effect/pull/3720) [`e0a5dad`](https://github.com/Effect-TS/effect/commit/e0a5dadd786c1ec9cbfdd80e9a53f1cacb7ee2ed) Thanks @jkonowitch! - add SqlClient.makeWithTransaction api

- Updated dependencies [[`f02b354`](https://github.com/Effect-TS/effect/commit/f02b354ab5b0451143b82bb73dc866be29adec85), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363), [`90ceeab`](https://github.com/Effect-TS/effect/commit/90ceeab3a04051b740af18c8af8bd73ee8ec6363)]:
  - @effect/schema@0.75.2
  - @effect/platform@0.68.0
  - @effect/experimental@0.29.0

## 0.15.1

### Patch Changes

- Updated dependencies [[`3b2ad1d`](https://github.com/Effect-TS/effect/commit/3b2ad1d58a2e33dc1a72b7037396bd25ca1702a9)]:
  - @effect/platform@0.67.1
  - effect@3.9.1
  - @effect/schema@0.75.1
  - @effect/experimental@0.28.1

## 0.15.0

### Patch Changes

- Updated dependencies [[`ff3d1aa`](https://github.com/Effect-TS/effect/commit/ff3d1aab290b4d1173b2dfc7e4c76abb4babdc16), [`0ba66f2`](https://github.com/Effect-TS/effect/commit/0ba66f2451641fd6990e02ec1ed01c014db9dab0), [`bf77f51`](https://github.com/Effect-TS/effect/commit/bf77f51b323c383224ebf08adf77a7a6e8c9b3cd), [`016f9ad`](https://github.com/Effect-TS/effect/commit/016f9ad931a4b3d09a34e5caf13d87c5b8e9c984), [`0779681`](https://github.com/Effect-TS/effect/commit/07796813f07de035719728733096ba64ce333469), [`534129f`](https://github.com/Effect-TS/effect/commit/534129f8113ce1a8ec50828083e16da9c86326c6), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`9237ac6`](https://github.com/Effect-TS/effect/commit/9237ac69bc07de5b3b60076a0ad2921c21de7457), [`be0451c`](https://github.com/Effect-TS/effect/commit/be0451c149b6618af79cb839cdf04af2db1efb03), [`5b36494`](https://github.com/Effect-TS/effect/commit/5b364942e9a9003fdb8217324f8a2d8369c969da), [`c716adb`](https://github.com/Effect-TS/effect/commit/c716adb250ebbea1d1048d818ef7fed4f621d186), [`4986391`](https://github.com/Effect-TS/effect/commit/49863919cd8628c962a712fb1df30d2983820933), [`d75140c`](https://github.com/Effect-TS/effect/commit/d75140c7a664ceda43142d999f4ff8dcd36d6dda), [`d1387ae`](https://github.com/Effect-TS/effect/commit/d1387aebd1ff01bbebde26be46d488956e4daef6)]:
  - effect@3.9.0
  - @effect/platform@0.67.0
  - @effect/schema@0.75.0
  - @effect/experimental@0.28.0

## 0.14.1

### Patch Changes

- Updated dependencies [[`88e85db`](https://github.com/Effect-TS/effect/commit/88e85db34bd402526e27a323e950d053fa34d232), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`8e94585`](https://github.com/Effect-TS/effect/commit/8e94585abe62753bf3af28bfae77926a7c570ac3), [`83887ca`](https://github.com/Effect-TS/effect/commit/83887ca1b1793916913d8550a4db4450cd14a044), [`5266b6c`](https://github.com/Effect-TS/effect/commit/5266b6cd86d76c3886da041c8829bca04b1a3110), [`cdead5c`](https://github.com/Effect-TS/effect/commit/cdead5c9cfd54dc6c4f215d9732f654c4a12e991), [`f40da15`](https://github.com/Effect-TS/effect/commit/f40da15fbeb7c491840b8f409d47de79720891c3), [`766a8af`](https://github.com/Effect-TS/effect/commit/766a8af307b414aca3648d91c4eab7493a5ec862)]:
  - effect@3.8.5
  - @effect/platform@0.66.3
  - @effect/experimental@0.27.4
  - @effect/schema@0.74.2

## 0.14.0

### Minor Changes

- [#3683](https://github.com/Effect-TS/effect/pull/3683) [`f100e20`](https://github.com/Effect-TS/effect/commit/f100e2087172d7e4ab8c0d1ee9a5780b9712382a) Thanks @tim-smart! - use decoded ids in sql resolvers

## 0.13.4

### Patch Changes

- Updated dependencies []:
  - @effect/experimental@0.27.3

## 0.13.3

### Patch Changes

- [#3676](https://github.com/Effect-TS/effect/pull/3676) [`0a68746`](https://github.com/Effect-TS/effect/commit/0a68746c89651c364db2ee8c72dcfe552e1782ea) Thanks @tomglaize! - Add VariantSchema fieldFromKey utility to rename the encoded side of a field by variant.

  Example usage:

  ```ts
  import { Schema } from "@effect/schema"
  import { VariantSchema } from "@effect/experimental"

  const { Class, fieldFromKey } = VariantSchema.make({
    variants: ["domain", "json"],
    defaultVariant: "domain"
  })

  class User extends Class<User>("User")({
    id: Schema.Int,
    firstName: Schema.String.pipe(fieldFromKey({ json: "first_name" }))
  }) {}

  console.log(
    Schema.encodeSync(User.json)({
      id: 1,
      firstName: "Bob"
    })
  )
  /*
  { id: 1, first_name: 'Bob' }
  */
  ```

- Updated dependencies [[`0a68746`](https://github.com/Effect-TS/effect/commit/0a68746c89651c364db2ee8c72dcfe552e1782ea), [`734eae6`](https://github.com/Effect-TS/effect/commit/734eae654f215e4adca457d04d2a1728b1a55c83), [`fd83d0e`](https://github.com/Effect-TS/effect/commit/fd83d0e548feff9ea2d53d370a0b626c4a1d940e), [`4509656`](https://github.com/Effect-TS/effect/commit/45096569d50262275ee984f44c456f5c83b62683), [`ad7e1de`](https://github.com/Effect-TS/effect/commit/ad7e1de948745c0751bfdac96671028ff4b7a727), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382), [`090e41c`](https://github.com/Effect-TS/effect/commit/090e41c636d720b1c7d89684a739855765ed4382)]:
  - @effect/experimental@0.27.2
  - @effect/schema@0.74.1
  - @effect/platform@0.66.2
  - effect@3.8.4

## 0.13.2

### Patch Changes

- Updated dependencies [[`3812788`](https://github.com/Effect-TS/effect/commit/3812788d79caaab8f559a62fd443018a04ac5647)]:
  - @effect/platform@0.66.1
  - @effect/experimental@0.27.1

## 0.13.1

### Patch Changes

- [#3657](https://github.com/Effect-TS/effect/pull/3657) [`d5c8e7e`](https://github.com/Effect-TS/effect/commit/d5c8e7e47373f9fd78637f24e36d6fb61ee35eb4) Thanks @jamiehodge! - fix Model findById data loader

## 0.13.0

### Patch Changes

- Updated dependencies [[`de48aa5`](https://github.com/Effect-TS/effect/commit/de48aa54e98d97722a8a4c2c8f9e1fe1d4560ea2)]:
  - @effect/schema@0.74.0
  - @effect/experimental@0.27.0
  - @effect/platform@0.66.0

## 0.12.6

### Patch Changes

- Updated dependencies [[`321b201`](https://github.com/Effect-TS/effect/commit/321b201adcb6bbbeb806b3467dd0b4cf063ccda8), [`bb5ec6b`](https://github.com/Effect-TS/effect/commit/bb5ec6b4b6a6f537394596c5a596faf52cb2aef4)]:
  - @effect/platform@0.65.5
  - effect@3.8.3
  - @effect/experimental@0.26.6
  - @effect/schema@0.73.4

## 0.12.5

### Patch Changes

- Updated dependencies [[`e6440a7`](https://github.com/Effect-TS/effect/commit/e6440a74fb3f12f6422ed794c07cb44af91cbacc)]:
  - @effect/schema@0.73.3
  - @effect/experimental@0.26.5
  - @effect/platform@0.65.4

## 0.12.4

### Patch Changes

- Updated dependencies [[`b86b47d`](https://github.com/Effect-TS/effect/commit/b86b47d57ca30e1c3587a134a4c79aaf7bfa8980)]:
  - @effect/experimental@0.26.4

## 0.12.3

### Patch Changes

- Updated dependencies [[`f0d8ef1`](https://github.com/Effect-TS/effect/commit/f0d8ef1ce97ec2a87b09b3e24150cfeab85d6e2f)]:
  - effect@3.8.2
  - @effect/experimental@0.26.3
  - @effect/platform@0.65.3
  - @effect/schema@0.73.2

## 0.12.2

### Patch Changes

- Updated dependencies [[`10bf621`](https://github.com/Effect-TS/effect/commit/10bf6213f36d8ddb00f058a4609b85220f3d8334), [`f56ab78`](https://github.com/Effect-TS/effect/commit/f56ab785cbee0c1c43bd2c182c35602f486f61f0), [`ae36fa6`](https://github.com/Effect-TS/effect/commit/ae36fa68f754eeab9a54b6dc0f8b44db513aa2b6)]:
  - effect@3.8.1
  - @effect/schema@0.73.1
  - @effect/experimental@0.26.2
  - @effect/platform@0.65.2

## 0.12.1

### Patch Changes

- Updated dependencies [[`e44c5f2`](https://github.com/Effect-TS/effect/commit/e44c5f228215738fe4e75023c7461bf9521249cb)]:
  - @effect/platform@0.65.1
  - @effect/experimental@0.26.1

## 0.12.0

### Patch Changes

- Updated dependencies [[`fcfa6ee`](https://github.com/Effect-TS/effect/commit/fcfa6ee30ffd07d998bf22799357bf58580a116f), [`bb9931b`](https://github.com/Effect-TS/effect/commit/bb9931b62e249a3b801f2cb9d097aec0c8511af7), [`5798f76`](https://github.com/Effect-TS/effect/commit/5798f7619529de33e5ba06f551806f68fedc19db), [`5f0bfa1`](https://github.com/Effect-TS/effect/commit/5f0bfa17205398d4e4818bfbcf9e1b505b3b1fc5), [`7fdf9d9`](https://github.com/Effect-TS/effect/commit/7fdf9d9aa1e2c1c125cbf87991e6efbf4abb7b07), [`812a4e8`](https://github.com/Effect-TS/effect/commit/812a4e86e2d1aa23b477ef5829aa0e5c07784936), [`6a128f6`](https://github.com/Effect-TS/effect/commit/6a128f63f9b41fec2db70790b3bbb96cb9afa1ab), [`273565e`](https://github.com/Effect-TS/effect/commit/273565e7901639e8d0541930ab715aea9c80fbaa), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`569a801`](https://github.com/Effect-TS/effect/commit/569a8017ef0a0bc203e4312867cbdd37b0effbd7), [`aa1fa53`](https://github.com/Effect-TS/effect/commit/aa1fa5301e886b9657c8eb0d38cb87cef92a8305), [`02f6b06`](https://github.com/Effect-TS/effect/commit/02f6b0660e12bee1069532a9cc18d3ab855257be), [`12b893e`](https://github.com/Effect-TS/effect/commit/12b893e63cc6dfada4aca7773b4783940e2edf25), [`bbad27e`](https://github.com/Effect-TS/effect/commit/bbad27ec0a90860593f759405caa877e7f4a655f), [`7041393`](https://github.com/Effect-TS/effect/commit/7041393cff132e96566d3f36da0483a6ff6195e4), [`e0d21a5`](https://github.com/Effect-TS/effect/commit/e0d21a54c8323728fbb75a32f4820a9996257809), [`adf7d7a`](https://github.com/Effect-TS/effect/commit/adf7d7a7dfce3a7021e9f3b0d847dc85be89d754), [`007289a`](https://github.com/Effect-TS/effect/commit/007289a52d5877f8e90e2dacf38171ff9bf603fd), [`42a8f99`](https://github.com/Effect-TS/effect/commit/42a8f99740eefdaf2c4544d2c345313f97547a36), [`eebfd29`](https://github.com/Effect-TS/effect/commit/eebfd29633fd5d38b505c5c0842036f61f05e913), [`040703d`](https://github.com/Effect-TS/effect/commit/040703d0e100cd5511e52d812c15492414262b5e)]:
  - effect@3.8.0
  - @effect/experimental@0.26.0
  - @effect/schema@0.73.0
  - @effect/platform@0.65.0

## 0.11.3

### Patch Changes

- [#3600](https://github.com/Effect-TS/effect/pull/3600) [`ccd67df`](https://github.com/Effect-TS/effect/commit/ccd67df6b44ae7075a03759bc7866f6bc9ebb03e) Thanks @tim-smart! - remove network roundtrip from mysql update in Model repository

## 0.11.2

### Patch Changes

- [#3599](https://github.com/Effect-TS/effect/pull/3599) [`d8aff79`](https://github.com/Effect-TS/effect/commit/d8aff79d4cbedee33d0552ec43fdced007cae358) Thanks @tim-smart! - fix mysql support for Model.makeRepository

- [#3599](https://github.com/Effect-TS/effect/pull/3599) [`d8aff79`](https://github.com/Effect-TS/effect/commit/d8aff79d4cbedee33d0552ec43fdced007cae358) Thanks @tim-smart! - add insertVoid & updateVoid to Model repository

- Updated dependencies [[`35a0f81`](https://github.com/Effect-TS/effect/commit/35a0f813141652d696461cd5d19fd146adaf85be), [`8261c5a`](https://github.com/Effect-TS/effect/commit/8261c5ae6fe86872292ec1fc1a58ab9cea2f5f51)]:
  - effect@3.7.3
  - @effect/platform@0.64.1
  - @effect/experimental@0.25.2
  - @effect/schema@0.72.4

## 0.11.1

### Patch Changes

- Updated dependencies [[`ce86193`](https://github.com/Effect-TS/effect/commit/ce86193546fd4cf5682df6cef0ab1d486136cc15)]:
  - @effect/experimental@0.25.1

## 0.11.0

### Patch Changes

- Updated dependencies [[`f6acb71`](https://github.com/Effect-TS/effect/commit/f6acb71b17a0e6b0d449e7f661c9e2c3d335fcac), [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`90ac8f6`](https://github.com/Effect-TS/effect/commit/90ac8f6f6053a2e4498f8b0cc56fe12777d02e1a), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9), [`3791e24`](https://github.com/Effect-TS/effect/commit/3791e241636b1dfe924a56f380ebc9a7ff0827a9)]:
  - @effect/schema@0.72.3
  - @effect/platform@0.64.0
  - @effect/experimental@0.25.0

## 0.10.4

### Patch Changes

- Updated dependencies [[`c969f74`](https://github.com/Effect-TS/effect/commit/c969f74f6111e852fc55c126d2ee384cba718878)]:
  - @effect/experimental@0.24.4

## 0.10.3

### Patch Changes

- Updated dependencies [[`4a701c4`](https://github.com/Effect-TS/effect/commit/4a701c406da032563fedae459536c00ae5cfe3c7)]:
  - @effect/platform@0.63.3
  - @effect/experimental@0.24.3

## 0.10.2

### Patch Changes

- Updated dependencies [[`8a601d7`](https://github.com/Effect-TS/effect/commit/8a601d7a1f8ffe52ac9e6d67e9282a1495fe59c9), [`353ba19`](https://github.com/Effect-TS/effect/commit/353ba19f9b2b9e959f0a00d058c6d40a4bc02db7)]:
  - effect@3.7.2
  - @effect/experimental@0.24.2
  - @effect/platform@0.63.2
  - @effect/schema@0.72.2

## 0.10.1

### Patch Changes

- Updated dependencies [[`79859e7`](https://github.com/Effect-TS/effect/commit/79859e71040d8edf1868b8530b90c650f4321eff), [`f6a469c`](https://github.com/Effect-TS/effect/commit/f6a469c190b9f00eee5ea0cd4d5912a0ef8b46f5), [`dcb9ec0`](https://github.com/Effect-TS/effect/commit/dcb9ec0db443894dd204d87450f779c44b9ad7f1), [`79aa6b1`](https://github.com/Effect-TS/effect/commit/79aa6b136e1f29b36f34e88cb2ff162bff2bb4ed)]:
  - effect@3.7.1
  - @effect/experimental@0.24.1
  - @effect/platform@0.63.1
  - @effect/schema@0.72.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`db89601`](https://github.com/Effect-TS/effect/commit/db89601ee9c1050c4e762b7bd7ec65a6a2799dfe), [`2f456cc`](https://github.com/Effect-TS/effect/commit/2f456cce5012b9fcb6b4e039190d527813b75b92), [`8745e41`](https://github.com/Effect-TS/effect/commit/8745e41ed96e3765dc6048efc2a9afbe05c8a1e9), [`e557838`](https://github.com/Effect-TS/effect/commit/e55783886b046d3c5f33447f455f9ccf2fa75922), [`d6e7e40`](https://github.com/Effect-TS/effect/commit/d6e7e40b1e2ad0c59aa02f07344d28601b14ebdc), [`8356321`](https://github.com/Effect-TS/effect/commit/8356321598da04bd77c1001f45a4e447bec5591d), [`192f2eb`](https://github.com/Effect-TS/effect/commit/192f2ebb2c4ddbf4bfd8baedd32140b2376868f4), [`718cb70`](https://github.com/Effect-TS/effect/commit/718cb70038629a6d58d02e407760e341f7c94474), [`e9d0310`](https://github.com/Effect-TS/effect/commit/e9d03107acbf204d9304f3e8aea0816b7d3c7dfb), [`6bf28f7`](https://github.com/Effect-TS/effect/commit/6bf28f7e3b1e5e0608ff567205fea0581d11666f)]:
  - effect@3.7.0
  - @effect/platform@0.63.0
  - @effect/experimental@0.24.0
  - @effect/schema@0.72.0

## 0.9.7

### Patch Changes

- Updated dependencies [[`e809286`](https://github.com/Effect-TS/effect/commit/e8092865900608c4df7a6b7991b1c13cc1e4ca2d)]:
  - effect@3.6.8
  - @effect/experimental@0.23.7
  - @effect/platform@0.62.5
  - @effect/schema@0.71.4

## 0.9.6

### Patch Changes

- Updated dependencies [[`e7a65e3`](https://github.com/Effect-TS/effect/commit/e7a65e3c6a08636bbfce3d3af3098bf28474364d), [`50ec889`](https://github.com/Effect-TS/effect/commit/50ec8897a49b7d1fe84f63107f89d543c52f3dfc)]:
  - @effect/platform@0.62.4
  - effect@3.6.7
  - @effect/experimental@0.23.6
  - @effect/schema@0.71.3

## 0.9.5

### Patch Changes

- Updated dependencies [[`f960bf4`](https://github.com/Effect-TS/effect/commit/f960bf45239e9badac6e0ad3a602f4174cd7bbdf), [`46a575f`](https://github.com/Effect-TS/effect/commit/46a575f48a05457b782fb21f7827d338c9b59320)]:
  - effect@3.6.6
  - @effect/experimental@0.23.5
  - @effect/platform@0.62.3
  - @effect/schema@0.71.2

## 0.9.4

### Patch Changes

- [#3483](https://github.com/Effect-TS/effect/pull/3483) [`35be739`](https://github.com/Effect-TS/effect/commit/35be739a413e32ed251f775714af2f87355e8664) Thanks @tim-smart! - infer Model repository id schema from id column name

- [#3480](https://github.com/Effect-TS/effect/pull/3480) [`f8326cc`](https://github.com/Effect-TS/effect/commit/f8326cc1095630a3fbee3f25d6b4e74edb905903) Thanks @tim-smart! - add Model.makeDataLoaders, for deriving CRUD data loaders

- [#3488](https://github.com/Effect-TS/effect/pull/3488) [`8dd3959`](https://github.com/Effect-TS/effect/commit/8dd3959e967ca2b38ba601d94a80f1c50e9445e0) Thanks @tim-smart! - move VariantSchema.extract to factory, and copy type level behaviour

- [#3477](https://github.com/Effect-TS/effect/pull/3477) [`2cb6ebb`](https://github.com/Effect-TS/effect/commit/2cb6ebbf782b79643befa061c6adcf0366a7b8b3) Thanks @tim-smart! - update Model docs categories

- [#3476](https://github.com/Effect-TS/effect/pull/3476) [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794) Thanks @tim-smart! - add Model.FieldOption, for optional fields that are nullable for the db

- [#3479](https://github.com/Effect-TS/effect/pull/3479) [`83a108a`](https://github.com/Effect-TS/effect/commit/83a108a254341721d20a82633b1e1d406d2368a3) Thanks @tim-smart! - add Model.makeRepository, for deriving a simple CRUD repo

- [#3493](https://github.com/Effect-TS/effect/pull/3493) [`f2c8dbb`](https://github.com/Effect-TS/effect/commit/f2c8dbb77e196c9a36cb3bf2ae3b82ce68e9874d) Thanks @tim-smart! - add VariantSchema.Union constructor

- [#3476](https://github.com/Effect-TS/effect/pull/3476) [`5e9f51e`](https://github.com/Effect-TS/effect/commit/5e9f51e4a1169018d7f59a0db444c783cc1d5794) Thanks @tim-smart! - add Model.Date, a schema which represents a DateTime.Utc without time

- Updated dependencies [[`00670d0`](https://github.com/Effect-TS/effect/commit/00670d0f8dfda42150c640e3e949e1f8ad3bdaed), [`413994c`](https://github.com/Effect-TS/effect/commit/413994c9792f16d9d57cca3ae6eb254bf93bd261), [`14a47a8`](https://github.com/Effect-TS/effect/commit/14a47a8c1f3cff2186b8fe7a919a1d773888fb5b), [`0c09841`](https://github.com/Effect-TS/effect/commit/0c0984173be3d58f050b300a1a8aa89d76ba49ae), [`8dd3959`](https://github.com/Effect-TS/effect/commit/8dd3959e967ca2b38ba601d94a80f1c50e9445e0), [`dba570a`](https://github.com/Effect-TS/effect/commit/dba570a8e9554958626e5a8ec9ca556345b1bfd2), [`f2c8dbb`](https://github.com/Effect-TS/effect/commit/f2c8dbb77e196c9a36cb3bf2ae3b82ce68e9874d), [`da52556`](https://github.com/Effect-TS/effect/commit/da52556cfe5a3b35d21563dfdbdde2146d74d3e1)]:
  - @effect/experimental@0.23.4
  - @effect/platform@0.62.2
  - effect@3.6.5
  - @effect/schema@0.71.1

## 0.9.3

### Patch Changes

- [#3471](https://github.com/Effect-TS/effect/pull/3471) [`c3446d3`](https://github.com/Effect-TS/effect/commit/c3446d3e57b0cbfe9341d6f2aebf5f5d6fefefe3) Thanks @tim-smart! - guard against stale values in Model.DateTime fields

- Updated dependencies [[`c3446d3`](https://github.com/Effect-TS/effect/commit/c3446d3e57b0cbfe9341d6f2aebf5f5d6fefefe3), [`9efe0e5`](https://github.com/Effect-TS/effect/commit/9efe0e5b57ac557399be620822c21cc6e9add285)]:
  - @effect/experimental@0.23.3
  - @effect/platform@0.62.1

## 0.9.2

### Patch Changes

- [#3467](https://github.com/Effect-TS/effect/pull/3467) [`cfcfbdf`](https://github.com/Effect-TS/effect/commit/cfcfbdfe586b011a5edc28083fd5391edeee0023) Thanks @tim-smart! - add VariantSchema.fields for accessing the fields

- Updated dependencies [[`cfcfbdf`](https://github.com/Effect-TS/effect/commit/cfcfbdfe586b011a5edc28083fd5391edeee0023)]:
  - @effect/experimental@0.23.2

## 0.9.1

### Patch Changes

- [#3455](https://github.com/Effect-TS/effect/pull/3455) [`e9da539`](https://github.com/Effect-TS/effect/commit/e9da5396bba99b2ddc20c97c7955154e6da4cab5) Thanks @tim-smart! - add Model module to /sql

  The `Model` module can be used to create domain schemas with common variants for
  the database and serializing to JSON.

  ```ts
  import { Schema } from "@effect/schema"
  import { Model } from "@effect/sql"

  export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"))

  export class Group extends Model.Class<Group>("Group")({
    id: Model.Generated(GroupId),
    name: Schema.NonEmptyTrimmedString,
    createdAt: Model.DateTimeInsertFromDate,
    updatedAt: Model.DateTimeUpdateFromDate
  }) {}

  // schema used for selects
  Group

  // schema used for inserts
  Group.insert

  // schema used for updates
  Group.update

  // schema used for json api
  Group.json
  Group.jsonCreate
  Group.jsonUpdate

  // you can also turn them into classes
  class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
    get upperName() {
      return this.name.toUpperCase()
    }
  }
  ```

- [#3460](https://github.com/Effect-TS/effect/pull/3460) [`4fabf75`](https://github.com/Effect-TS/effect/commit/4fabf75b44ea98b1773059bd589167d5d8f64f06) Thanks @tim-smart! - support partial objects in sql helpers

- Updated dependencies [[`e9da539`](https://github.com/Effect-TS/effect/commit/e9da5396bba99b2ddc20c97c7955154e6da4cab5)]:
  - @effect/experimental@0.23.1

## 0.9.0

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
  import * as Effect from "effect/Effect"
  import * as SqlClient from "@effect/sql/SqlClient"
  import * as MysqlClient from "@effect/sql/MysqlClient"

  const DatabaseLive = MysqlClient.layer({
    database: Config.succeed("database"),
    username: Config.succeed("root"),
    password: Config.succeed(Redacted.make("password"))
  })

  const program = Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const result = yield* sql`INSERT INTO usernames VALUES ("Bob")`.raw

    console.log(result)
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
  })

  program.pipe(Effect.provide(DatabaseLive), Effect.runPromise)
  ```

### Patch Changes

- Updated dependencies [[`c1987e2`](https://github.com/Effect-TS/effect/commit/c1987e25c8f5c48bdc9ad223d7a6f2c32f93f5a1), [`8295281`](https://github.com/Effect-TS/effect/commit/8295281ae9bd7441e680402540bf3c8682ec417b), [`c940df6`](https://github.com/Effect-TS/effect/commit/c940df63800bf3c4396d91cf28ec34938642fd2c), [`00b6c6d`](https://github.com/Effect-TS/effect/commit/00b6c6d4001f5de728b7d990a1b14560b4961a63), [`1ceed14`](https://github.com/Effect-TS/effect/commit/1ceed149dc64f4874e64b5cf2f954eba0a5a1f12), [`f8d95a6`](https://github.com/Effect-TS/effect/commit/f8d95a61ad0762147933c5c32bb6d7237e18eef4), [`0e42a8f`](https://github.com/Effect-TS/effect/commit/0e42a8f045ecb1fd3d080edf3d49fef16a9b0ca1)]:
  - @effect/schema@0.71.0
  - effect@3.6.4
  - @effect/platform@0.62.0

## 0.8.7

### Patch Changes

- Updated dependencies [[`04adcac`](https://github.com/Effect-TS/effect/commit/04adcace913e6fc483df266874a68005e9e04ccf)]:
  - effect@3.6.3
  - @effect/platform@0.61.8
  - @effect/schema@0.70.4

## 0.8.6

### Patch Changes

- Updated dependencies [[`17245a4`](https://github.com/Effect-TS/effect/commit/17245a4e783c19dee51529600b3b40f164fa59bc), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09), [`630d40e`](https://github.com/Effect-TS/effect/commit/630d40eaa7eb4d2f8b6705b16d4f426bc28a7d09)]:
  - @effect/platform@0.61.7

## 0.8.5

### Patch Changes

- Updated dependencies [[`99ad841`](https://github.com/Effect-TS/effect/commit/99ad8415293a82d08bd7043c563b29e2b468ca74), [`d829b57`](https://github.com/Effect-TS/effect/commit/d829b576357f2e3b203ab7e107a1492de903a106), [`fd4b2f6`](https://github.com/Effect-TS/effect/commit/fd4b2f6516b325740dde615f1cf0229edf13ca0c)]:
  - @effect/schema@0.70.3
  - @effect/platform@0.61.6
  - effect@3.6.2

## 0.8.4

### Patch Changes

- Updated dependencies [[`056b710`](https://github.com/Effect-TS/effect/commit/056b7108978e70612176c23991916f678d947f38)]:
  - @effect/platform@0.61.5

## 0.8.3

### Patch Changes

- Updated dependencies [[`e7cb109`](https://github.com/Effect-TS/effect/commit/e7cb109d0754207024a64d55b6bd2a674dd8ed7d)]:
  - @effect/platform@0.61.4

## 0.8.2

### Patch Changes

- Updated dependencies [[`510a34d`](https://github.com/Effect-TS/effect/commit/510a34d4cc5d2f51347a53847f6c7db84d2b17c6), [`fb9f786`](https://github.com/Effect-TS/effect/commit/fb9f7867f0c895e63f9ef23e8d0941248c42179d), [`45dbb9f`](https://github.com/Effect-TS/effect/commit/45dbb9ffeaf93d9e4df99d0cd4920e41ba9a3978)]:
  - effect@3.6.1
  - @effect/platform@0.61.3
  - @effect/schema@0.70.2

## 0.8.1

### Patch Changes

- Updated dependencies [[`3dce357`](https://github.com/Effect-TS/effect/commit/3dce357efe4a4451d7d29859d08ac11713999b1a), [`657fc48`](https://github.com/Effect-TS/effect/commit/657fc48bb32daf2dc09c9335b3cbc3152bcbdd3b)]:
  - @effect/schema@0.70.1
  - @effect/platform@0.61.2

## 0.8.0

### Minor Changes

- [#3387](https://github.com/Effect-TS/effect/pull/3387) [`42d0706`](https://github.com/Effect-TS/effect/commit/42d07067e9823ceb8977eff9672d9a290941dad5) Thanks @tim-smart! - allow sql Statement transformers to be effectful

### Patch Changes

- Updated dependencies [[`11223bf`](https://github.com/Effect-TS/effect/commit/11223bf9cbf5b822e0bf9a9fb2b35b2ad88af692)]:
  - @effect/platform@0.61.1

## 0.7.0

### Patch Changes

- Updated dependencies [[`1e0fe80`](https://github.com/Effect-TS/effect/commit/1e0fe802b36c257971296617473ce0abe730e8dc), [`8135294`](https://github.com/Effect-TS/effect/commit/8135294b591ea94fde7e6f94a504608f0e630520), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`3845646`](https://github.com/Effect-TS/effect/commit/3845646828e98f3c7cda1217f6cfe5f642ac0603), [`2d09078`](https://github.com/Effect-TS/effect/commit/2d09078c5948b37fc2f79ef858fe4ca3e4814085), [`4bce5a0`](https://github.com/Effect-TS/effect/commit/4bce5a0274203550ccf117d830721891b0a3d182), [`4ddbff0`](https://github.com/Effect-TS/effect/commit/4ddbff0bb4e3ffddfeb509c59835b83245fb975e), [`e74cc38`](https://github.com/Effect-TS/effect/commit/e74cc38cb420a320c4d7ef98180f19d452a8b316), [`bb069b4`](https://github.com/Effect-TS/effect/commit/bb069b49ef291c532a02c1e8e74271f6d1bb32ec), [`cd255a4`](https://github.com/Effect-TS/effect/commit/cd255a48872d8fb924cf713ef73f0883a9cc6987), [`7d02174`](https://github.com/Effect-TS/effect/commit/7d02174af3bcbf054e5cdddb821c91d0f47e8285)]:
  - effect@3.6.0
  - @effect/schema@0.70.0
  - @effect/platform@0.61.0

## 0.6.3

### Patch Changes

- Updated dependencies [[`7c0da50`](https://github.com/Effect-TS/effect/commit/7c0da5050d30cb804f4eacb15995d0fb7f3a28d2), [`2fc0ff4`](https://github.com/Effect-TS/effect/commit/2fc0ff4c59c25977018f6ac70ced99b04a8c7b2b), [`6359644`](https://github.com/Effect-TS/effect/commit/635964446323cf55d4060559337e710e4a24496e), [`f262665`](https://github.com/Effect-TS/effect/commit/f262665c2773492c01e5dd0e8d6db235aafaaad8), [`7f41e42`](https://github.com/Effect-TS/effect/commit/7f41e428830bf3043b8be0d28dcd235d5747c942), [`9bbe7a6`](https://github.com/Effect-TS/effect/commit/9bbe7a681430ebf5c10167bb7140ba3742e46bb7), [`f566fd1`](https://github.com/Effect-TS/effect/commit/f566fd1d7eea531a0d981dd24037f14a603a1273)]:
  - @effect/schema@0.69.3
  - effect@3.5.9
  - @effect/platform@0.60.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`eb4d014`](https://github.com/Effect-TS/effect/commit/eb4d014c559e1b4c95b3fb9295fe77593c17ed7a), [`1ba640c`](https://github.com/Effect-TS/effect/commit/1ba640c702f187a866023bf043c26e25cce941ef), [`c8c71bd`](https://github.com/Effect-TS/effect/commit/c8c71bd20eb87d23133dac6156b83bb08941597c), [`a26ce58`](https://github.com/Effect-TS/effect/commit/a26ce581ca7d407e1e81439b58c8045b3fa65231), [`fc20f73`](https://github.com/Effect-TS/effect/commit/fc20f73c69e577981cb64714de2adc97e1004dae)]:
  - @effect/platform@0.60.2
  - effect@3.5.8
  - @effect/schema@0.69.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`f241154`](https://github.com/Effect-TS/effect/commit/f241154added5d91e95866c39481f09cdb13bd4d)]:
  - @effect/schema@0.69.1
  - @effect/platform@0.60.1

## 0.6.0

### Patch Changes

- Updated dependencies [[`20807a4`](https://github.com/Effect-TS/effect/commit/20807a45edeb4334e903dca5d708cd62a71702d8)]:
  - @effect/schema@0.69.0
  - @effect/platform@0.60.0

## 0.5.3

### Patch Changes

- [#3310](https://github.com/Effect-TS/effect/pull/3310) [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc) Thanks @fubhy! - Added additional pure annotations to improve tree-shakeability

- Updated dependencies [[`3afcc93`](https://github.com/Effect-TS/effect/commit/3afcc93413a3d910beb69e4ce9ae120e4adaffd5), [`99bddcf`](https://github.com/Effect-TS/effect/commit/99bddcfb3d6eab4d489d055404e26ad81afe52fc), [`6921c4f`](https://github.com/Effect-TS/effect/commit/6921c4fb8c45badff09b493043b85ca71302b560)]:
  - effect@3.5.7
  - @effect/platform@0.59.3
  - @effect/schema@0.68.27

## 0.5.2

### Patch Changes

- Updated dependencies [[`f0285d3`](https://github.com/Effect-TS/effect/commit/f0285d3af6a18829123bc1818331c67206becbc4), [`8ec4955`](https://github.com/Effect-TS/effect/commit/8ec49555ed3b3c98093fa4d135a4c57a3f16ebd1), [`3ac2d76`](https://github.com/Effect-TS/effect/commit/3ac2d76048da09e876cf6c3aee3397febd843fe9), [`cc327a1`](https://github.com/Effect-TS/effect/commit/cc327a1bccd22a4ee27ec7e58b53205e93b23e2c), [`4bfe4fb`](https://github.com/Effect-TS/effect/commit/4bfe4fb5c82f597c9beea9baa92e772593598b60), [`2b14d18`](https://github.com/Effect-TS/effect/commit/2b14d181462cad8359da4fa6bc6dfda0f742c398)]:
  - @effect/schema@0.68.26
  - effect@3.5.6
  - @effect/platform@0.59.2

## 0.5.1

### Patch Changes

- Updated dependencies [[`a9d7800`](https://github.com/Effect-TS/effect/commit/a9d7800f6a253192b653d77778b0674f39b1ca39), [`fcecff7`](https://github.com/Effect-TS/effect/commit/fcecff7f7e12b295a252f124861b801c73072151), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65), [`adbf753`](https://github.com/Effect-TS/effect/commit/adbf75340a9db15dc5cadc66e911a8978a195a65)]:
  - effect@3.5.5
  - @effect/platform@0.59.1
  - @effect/schema@0.68.25

## 0.5.0

### Minor Changes

- [#3260](https://github.com/Effect-TS/effect/pull/3260) [`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c) Thanks @tim-smart! - replace /platform RefailError with use of the "cause" property

### Patch Changes

- Updated dependencies [[`53c0db0`](https://github.com/Effect-TS/effect/commit/53c0db06872d5b5edea2a706e83249908385325c), [`ed0dde4`](https://github.com/Effect-TS/effect/commit/ed0dde4888e6f1a97ad5bba06b755d26a6a1c52e), [`ada68b3`](https://github.com/Effect-TS/effect/commit/ada68b3e61c67907c2a281c024c84d818186ca4c), [`ca775ce`](https://github.com/Effect-TS/effect/commit/ca775cec53baebc1a43d9b8852a3ac6726178498), [`5be9cc0`](https://github.com/Effect-TS/effect/commit/5be9cc044025a9541b9b7acefa2d3fc05fa1301b), [`203658f`](https://github.com/Effect-TS/effect/commit/203658f8001c132b25764ab70344b171683b554c), [`eb1c4d4`](https://github.com/Effect-TS/effect/commit/eb1c4d44e54b9d8d201a366d1ff94face2a6dcd3)]:
  - @effect/platform@0.59.0
  - effect@3.5.4
  - @effect/schema@0.68.24

## 0.4.27

### Patch Changes

- Updated dependencies [[`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`edb0da3`](https://github.com/Effect-TS/effect/commit/edb0da383746d760f35d8582f5fb0cc0eeca9217), [`a1db40a`](https://github.com/Effect-TS/effect/commit/a1db40a650ab842e778654f0d88e80f2ef4fd6f3), [`c8d3fb0`](https://github.com/Effect-TS/effect/commit/c8d3fb0fe23585f6efb724af51fbab3ba1ad6e83), [`dabd028`](https://github.com/Effect-TS/effect/commit/dabd028decf9b7983ca16ebe0f48c05c11a84b68), [`786b2ab`](https://github.com/Effect-TS/effect/commit/786b2ab29d525c877bb84035dac9e2d6499339d1), [`fc57354`](https://github.com/Effect-TS/effect/commit/fc573547d41667016fce05eaee75960fcc6dce4d)]:
  - effect@3.5.3
  - @effect/schema@0.68.23
  - @effect/platform@0.58.27

## 0.4.26

### Patch Changes

- Updated dependencies [[`639208e`](https://github.com/Effect-TS/effect/commit/639208eeb8a44622994f832bc2d45d06ab636bc8), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5), [`6684b4c`](https://github.com/Effect-TS/effect/commit/6684b4c27d77a7fcc7af2e261a450edf971b62b5)]:
  - effect@3.5.2
  - @effect/platform@0.58.26
  - @effect/schema@0.68.22

## 0.4.25

### Patch Changes

- Updated dependencies [[`0623fca`](https://github.com/Effect-TS/effect/commit/0623fca41679b0e3c5a10dd0f8985f91670bd721)]:
  - @effect/platform@0.58.25

## 0.4.24

### Patch Changes

- Updated dependencies [[`55fdd76`](https://github.com/Effect-TS/effect/commit/55fdd761ee95afd73b6a892c13fee92b36c02837)]:
  - effect@3.5.1
  - @effect/platform@0.58.24
  - @effect/schema@0.68.21

## 0.4.23

### Patch Changes

- Updated dependencies [[`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`5ab348f`](https://github.com/Effect-TS/effect/commit/5ab348f265db3d283aa091ddca6d2d49137c16f2), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`3e04bf8`](https://github.com/Effect-TS/effect/commit/3e04bf8a7127e956cadb7684a8f4c661df57663b), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`a1f5b83`](https://github.com/Effect-TS/effect/commit/a1f5b831a1bc7535988b370d68d0b3eb1123e0ce), [`4626de5`](https://github.com/Effect-TS/effect/commit/4626de59c25b384216faa0be87bf0b8cd36357d0), [`f01e7db`](https://github.com/Effect-TS/effect/commit/f01e7db317827255d7901f523f2e28b43298e8df), [`60bc3d0`](https://github.com/Effect-TS/effect/commit/60bc3d0867b13e48b24dc22604b4dd2e7b2c1ca4), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`ac71f37`](https://github.com/Effect-TS/effect/commit/ac71f378f2413e5aa91c95f649ffe898d6a26114), [`8432360`](https://github.com/Effect-TS/effect/commit/8432360ce68614a419bb328083a4109d0fc8aa93), [`e4bf1bf`](https://github.com/Effect-TS/effect/commit/e4bf1bf2b4a970eacd77c9b77b5ea8c68bc84498), [`13cb861`](https://github.com/Effect-TS/effect/commit/13cb861a5eded15c55c6cdcf6a8acde8320367a6), [`79d2d91`](https://github.com/Effect-TS/effect/commit/79d2d91464d95dde0e9444d43e7a7f309f05d6e6), [`e7fc45f`](https://github.com/Effect-TS/effect/commit/e7fc45f0c7002aafdaec7878149ac064cd104ea3), [`9f66825`](https://github.com/Effect-TS/effect/commit/9f66825f1fce0fe8d10420c285f7dc4c71e8af8d)]:
  - effect@3.5.0
  - @effect/platform@0.58.23
  - @effect/schema@0.68.20

## 0.4.22

### Patch Changes

- Updated dependencies [[`7af137c`](https://github.com/Effect-TS/effect/commit/7af137c9433f6e74959b3887561ec1e6f12e10ee), [`ee4b3dc`](https://github.com/Effect-TS/effect/commit/ee4b3dc5f68d19dc3ae1c2d12901c5b8ffbebabb), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`366f2ee`](https://github.com/Effect-TS/effect/commit/366f2ee3fb6f712a44e8f84fc188612e5ecc016d), [`097d25c`](https://github.com/Effect-TS/effect/commit/097d25cb5d13c049e01789651be56b09620186ef)]:
  - effect@3.4.9
  - @effect/platform@0.58.22
  - @effect/schema@0.68.19

## 0.4.21

### Patch Changes

- Updated dependencies [[`5d5cc6c`](https://github.com/Effect-TS/effect/commit/5d5cc6cfd7d63b07081290fb189b364999201fc5), [`a435e0f`](https://github.com/Effect-TS/effect/commit/a435e0fc5378b33a49bcec92ee235df6f16a2419), [`b5554db`](https://github.com/Effect-TS/effect/commit/b5554db36c4dd6f64fa5e6a62a29b2759c54217a), [`359ff8a`](https://github.com/Effect-TS/effect/commit/359ff8aa2e4e6389bf56d759baa804e2a7674a16), [`a9c4fb3`](https://github.com/Effect-TS/effect/commit/a9c4fb3bf3c6e92cd1c142b0605fddf7eb3c697c), [`f7534b9`](https://github.com/Effect-TS/effect/commit/f7534b94cba06b143a3d4f29275d92874a939559)]:
  - @effect/schema@0.68.18
  - effect@3.4.8
  - @effect/platform@0.58.21

## 0.4.20

### Patch Changes

- Updated dependencies [[`15967cf`](https://github.com/Effect-TS/effect/commit/15967cf18931fb6ede3083eb687a8dfff371cc56), [`2328e17`](https://github.com/Effect-TS/effect/commit/2328e17577112db17c29b7756942a0ff64a70ee0), [`a5737d6`](https://github.com/Effect-TS/effect/commit/a5737d6db2b921605c332eabbc5402ee3d17357b)]:
  - @effect/schema@0.68.17
  - effect@3.4.7
  - @effect/platform@0.58.20

## 0.4.19

### Patch Changes

- Updated dependencies [[`d006cec`](https://github.com/Effect-TS/effect/commit/d006cec022e8524dbfd6dc6df751fe4c86b10042), [`cb22726`](https://github.com/Effect-TS/effect/commit/cb2272656881aa5878a1c3fc0b12d8fbc66eb63c), [`e911cfd`](https://github.com/Effect-TS/effect/commit/e911cfdc79418462d7e9000976fded15ea6b738d)]:
  - @effect/schema@0.68.16
  - @effect/platform@0.58.19

## 0.4.18

### Patch Changes

- Updated dependencies [[`7f8900a`](https://github.com/Effect-TS/effect/commit/7f8900a1de9addeb0d371103a2c5c2aa3e4ff95e)]:
  - @effect/platform@0.58.18

## 0.4.17

### Patch Changes

- Updated dependencies [[`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`34faeb6`](https://github.com/Effect-TS/effect/commit/34faeb6305ba52af4d6f8bdd2e633bb6a5a7a35b), [`33735b1`](https://github.com/Effect-TS/effect/commit/33735b16b41bd26929d8f4754c190925db6323b7), [`5c0ceb0`](https://github.com/Effect-TS/effect/commit/5c0ceb00826cce9e50bf9d41d83e191d5352c030), [`139d4b3`](https://github.com/Effect-TS/effect/commit/139d4b39fb3bff2eeaa7c0c809c581da42425a83)]:
  - effect@3.4.6
  - @effect/schema@0.68.15
  - @effect/platform@0.58.17

## 0.4.16

### Patch Changes

- Updated dependencies [[`61e5964`](https://github.com/Effect-TS/effect/commit/61e59640fd993216cca8ace0ac8abd9104e213ce)]:
  - @effect/schema@0.68.14
  - @effect/platform@0.58.16

## 0.4.15

### Patch Changes

- Updated dependencies [[`cb76bcb`](https://github.com/Effect-TS/effect/commit/cb76bcb2f8858a90db4f785efee262cea1b9844e), [`baa90df`](https://github.com/Effect-TS/effect/commit/baa90df9663f5f37d7b6814dad25142d53dbc720)]:
  - @effect/schema@0.68.13
  - @effect/platform@0.58.15

## 0.4.14

### Patch Changes

- Updated dependencies [[`52a87c7`](https://github.com/Effect-TS/effect/commit/52a87c7a0b9536398deaf8ec507e53a82c607219), [`6d2280e`](https://github.com/Effect-TS/effect/commit/6d2280e9497c95cb0e965ca462c825345074eedf)]:
  - @effect/platform@0.58.14

## 0.4.13

### Patch Changes

- Updated dependencies [[`a047af9`](https://github.com/Effect-TS/effect/commit/a047af99447dfffc729e9c8ef0ca143537927e91), [`dbd53ea`](https://github.com/Effect-TS/effect/commit/dbd53ea363c71a24449cb068251054c3a1acf864), [`d990544`](https://github.com/Effect-TS/effect/commit/d9905444b9e800850cb65899114ca0e502e68fe8)]:
  - effect@3.4.5
  - @effect/platform@0.58.13
  - @effect/schema@0.68.12

## 0.4.12

### Patch Changes

- Updated dependencies [[`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`74e0ad2`](https://github.com/Effect-TS/effect/commit/74e0ad23b4c36f41b7fd10856b20f8b701bc4044), [`72638e3`](https://github.com/Effect-TS/effect/commit/72638e3d99f0e93a24febf6c225256ce92d4a20b), [`d7dde2b`](https://github.com/Effect-TS/effect/commit/d7dde2b4af08b37af859d4c327c1f5c6f00cf9d9), [`9b2fc3b`](https://github.com/Effect-TS/effect/commit/9b2fc3b9dfd304a2bd0508ef2313cfc54357be0c), [`d71c192`](https://github.com/Effect-TS/effect/commit/d71c192b89fd1162423acddc5fd3d6270fbf2ef6)]:
  - @effect/platform@0.58.12
  - effect@3.4.4
  - @effect/schema@0.68.11

## 0.4.11

### Patch Changes

- Updated dependencies [[`a5b95b5`](https://github.com/Effect-TS/effect/commit/a5b95b548284e4798654ae7ce6883fa49108f0ea), [`5e29579`](https://github.com/Effect-TS/effect/commit/5e29579187cb8420ea4930b3999fec984f8999f4)]:
  - @effect/platform@0.58.11

## 0.4.10

### Patch Changes

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update dependencies

- [#3079](https://github.com/Effect-TS/effect/pull/3079) [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd) Thanks @tim-smart! - update to typescript 5.5

- Updated dependencies [[`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`c342739`](https://github.com/Effect-TS/effect/commit/c3427396226e1ad7b95b40595a23f9bdff3e3365), [`8898e5e`](https://github.com/Effect-TS/effect/commit/8898e5e238622f6337583d91ee23609c1f5ccdf7), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`a48ee84`](https://github.com/Effect-TS/effect/commit/a48ee845ac21bbde9baf938af9e97a98322211c9), [`ff78636`](https://github.com/Effect-TS/effect/commit/ff786367c522975f40f0f179a0ecdfcfab7ecbdb), [`c86bd4e`](https://github.com/Effect-TS/effect/commit/c86bd4e134c23146c216f9ff97e03781d55991b6), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd), [`ab3180f`](https://github.com/Effect-TS/effect/commit/ab3180f827041d0ea3b2d72254a1a8683e99e056), [`bbdd365`](https://github.com/Effect-TS/effect/commit/bbdd36567706c94cdec45bacea825941c347b6cd)]:
  - @effect/platform@0.58.10
  - effect@3.4.3
  - @effect/schema@0.68.10

## 0.4.9

### Patch Changes

- Updated dependencies [[`0b47fdf`](https://github.com/Effect-TS/effect/commit/0b47fdfe449f42de89e0e88b61ae5140f629e5c4)]:
  - @effect/schema@0.68.9
  - @effect/platform@0.58.9

## 0.4.8

### Patch Changes

- Updated dependencies [[`192261b`](https://github.com/Effect-TS/effect/commit/192261b2aec94e9913ceed83683fdcfbc9fca66f), [`3da1497`](https://github.com/Effect-TS/effect/commit/3da1497b5c9cc886d300258bc928fd68a4fefe6f)]:
  - @effect/schema@0.68.8
  - effect@3.4.2
  - @effect/platform@0.58.8

## 0.4.7

### Patch Changes

- Updated dependencies [[`027004a`](https://github.com/Effect-TS/effect/commit/027004a897f654791e75faa28eefb50dd0244b6e)]:
  - @effect/platform@0.58.7

## 0.4.6

### Patch Changes

- Updated dependencies [[`66a1910`](https://github.com/Effect-TS/effect/commit/66a19109ff90c4252123b8809b8c8a74681dba6a), [`2e8e252`](https://github.com/Effect-TS/effect/commit/2e8e2520cac712f0eb644553bd476429ebd674e4)]:
  - effect@3.4.1
  - @effect/platform@0.58.6
  - @effect/schema@0.68.7

## 0.4.5

### Patch Changes

- Updated dependencies [[`37a07a2`](https://github.com/Effect-TS/effect/commit/37a07a2d8d1ce09ab965c0ada84a3fae9a6aba05)]:
  - @effect/platform@0.58.5

## 0.4.4

### Patch Changes

- Updated dependencies [[`b77fb0a`](https://github.com/Effect-TS/effect/commit/b77fb0a811ec1ad0e794917077c9a90824515db8)]:
  - @effect/platform@0.58.4

## 0.4.3

### Patch Changes

- Updated dependencies [[`530fa9e`](https://github.com/Effect-TS/effect/commit/530fa9e36b8532589b948fc4faa37593f36b7f42)]:
  - @effect/schema@0.68.6
  - @effect/platform@0.58.3

## 0.4.2

### Patch Changes

- Updated dependencies [[`1d62815`](https://github.com/Effect-TS/effect/commit/1d62815a50f34115606940ffa397442d75a20c81)]:
  - @effect/schema@0.68.5
  - @effect/platform@0.58.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`5a248aa`](https://github.com/Effect-TS/effect/commit/5a248aa5ab2db3f7131ebc79bb9871a76de57973)]:
  - @effect/platform@0.58.1

## 0.4.0

### Minor Changes

- [#3035](https://github.com/Effect-TS/effect/pull/3035) [`d33d8b0`](https://github.com/Effect-TS/effect/commit/d33d8b050b8e3c87dcde9587083e6c1cf733f72b) Thanks @tim-smart! - restructure sql modules to have flat imports

### Patch Changes

- Updated dependencies [[`c0ce180`](https://github.com/Effect-TS/effect/commit/c0ce180861ad0938053c0e6145e813fa6404df3b), [`63dd0c3`](https://github.com/Effect-TS/effect/commit/63dd0c3af45876c1caad7d03356c74daf551c628), [`61707b6`](https://github.com/Effect-TS/effect/commit/61707b6ffc7397c2ba0dce22512b44955724f60f), [`9c1b5b3`](https://github.com/Effect-TS/effect/commit/9c1b5b39e6c19604ce834f072a114ad392c50a06), [`a35faf8`](https://github.com/Effect-TS/effect/commit/a35faf8d116f94899bfc03feab33b004c8ddfdf7), [`ff73c0c`](https://github.com/Effect-TS/effect/commit/ff73c0cacd66132bfad2e5211b3eae347729c667), [`984d516`](https://github.com/Effect-TS/effect/commit/984d516ccd9412dc41188f6a46b748dd20dd5848), [`8c3b8a2`](https://github.com/Effect-TS/effect/commit/8c3b8a2ce208eab753b6206a51605a424f104e98), [`017e2f9`](https://github.com/Effect-TS/effect/commit/017e2f9b371ce24ea4945e5d7390c934ad3c39cf), [`91bf8a2`](https://github.com/Effect-TS/effect/commit/91bf8a2e9d1959393b3cf7366cc1d584d3e666b7), [`c6a4a26`](https://github.com/Effect-TS/effect/commit/c6a4a266606575fd2c7165940c4072ad4c57d01f)]:
  - effect@3.4.0
  - @effect/platform@0.58.0
  - @effect/schema@0.68.4

## 0.3.18

### Patch Changes

- Updated dependencies [[`3ba7ea1`](https://github.com/Effect-TS/effect/commit/3ba7ea1c3c2923e85bf2f17e41176f8f8796d203)]:
  - @effect/platform@0.57.8

## 0.3.17

### Patch Changes

- Updated dependencies [[`d473800`](https://github.com/Effect-TS/effect/commit/d47380012c3241d7287b66968d33a2414275ce7b)]:
  - @effect/schema@0.68.3
  - @effect/platform@0.57.7

## 0.3.16

### Patch Changes

- Updated dependencies [[`eb341b3`](https://github.com/Effect-TS/effect/commit/eb341b3eb34ad64499371bc08b7f59e429979d8a)]:
  - @effect/schema@0.68.2
  - @effect/platform@0.57.6

## 0.3.15

### Patch Changes

- Updated dependencies [[`b8ea6aa`](https://github.com/Effect-TS/effect/commit/b8ea6aa479006358042b4256ee0a1c5cfbe57acb)]:
  - @effect/platform@0.57.5

## 0.3.14

### Patch Changes

- Updated dependencies [[`b51e266`](https://github.com/Effect-TS/effect/commit/b51e26662b879b55d2c5164b7c97742739aa9446), [`6c89408`](https://github.com/Effect-TS/effect/commit/6c89408cd7b9204ec4c5828a46cd5312d8afb5e7)]:
  - @effect/schema@0.68.1
  - effect@3.3.5
  - @effect/platform@0.57.4

## 0.3.13

### Patch Changes

- Updated dependencies [[`f6c7977`](https://github.com/Effect-TS/effect/commit/f6c79772e632c440b7e5221bb75f0ef9d3c3b005), [`a67b8fe`](https://github.com/Effect-TS/effect/commit/a67b8fe2ace08419424811b5f0d9a5378eaea352)]:
  - @effect/schema@0.68.0
  - effect@3.3.4
  - @effect/platform@0.57.3

## 0.3.12

### Patch Changes

- Updated dependencies [[`3b15e1b`](https://github.com/Effect-TS/effect/commit/3b15e1b505c0b0e62a03b4a3605d42a9932cc99c), [`06ede85`](https://github.com/Effect-TS/effect/commit/06ede85d6e84710e6622463be95ff3927fb30dad), [`3a750b2`](https://github.com/Effect-TS/effect/commit/3a750b25b1ed92094a7f7ebc332a6bcfb212871b), [`7204ca5`](https://github.com/Effect-TS/effect/commit/7204ca5761c2b1d27999a624db23aa10b6e0504d)]:
  - @effect/schema@0.67.24
  - effect@3.3.3
  - @effect/platform@0.57.2

## 0.3.11

### Patch Changes

- Updated dependencies [[`2ee4f2b`](https://github.com/Effect-TS/effect/commit/2ee4f2be7fd63074a9cbac6dcdfb533b6683533a), [`07e12ec`](https://github.com/Effect-TS/effect/commit/07e12ecdb0e20b9763bd9e9058e567a7c8862efc), [`3572646`](https://github.com/Effect-TS/effect/commit/3572646d5e0804f85bc7f64633fb95722533f9dd), [`1aed347`](https://github.com/Effect-TS/effect/commit/1aed347a125ed3847ec90863424810d6759cbc85), [`df4bf4b`](https://github.com/Effect-TS/effect/commit/df4bf4b62e7b316c6647da0271fc5544a84e7ba2), [`f085f92`](https://github.com/Effect-TS/effect/commit/f085f92dfa204afb41823ffc27d437225137643d), [`9b3b4ac`](https://github.com/Effect-TS/effect/commit/9b3b4ac639d98aae33883926bece1e31fa280d22)]:
  - @effect/schema@0.67.23
  - @effect/platform@0.57.1
  - effect@3.3.2

## 0.3.10

### Patch Changes

- Updated dependencies [[`eb98c5b`](https://github.com/Effect-TS/effect/commit/eb98c5b79ab50aa0cde239bd4e660dd19dbab612), [`184fed8`](https://github.com/Effect-TS/effect/commit/184fed83ac36cba05a75a5a8013f740f9f696e3b), [`4d3fbe8`](https://github.com/Effect-TS/effect/commit/4d3fbe82e8cec13ccd0cd0b2096deac6818fb59a), [`6068e07`](https://github.com/Effect-TS/effect/commit/6068e073d4cc8b3c8583583fd5eb3efe43f7d5ba), [`3a77e20`](https://github.com/Effect-TS/effect/commit/3a77e209783933bac3aaddba1b05ff6a9ac72b36), [`d79ca17`](https://github.com/Effect-TS/effect/commit/d79ca17d9fa432571c69714776cab5cf8fef9c34)]:
  - effect@3.3.1
  - @effect/platform@0.57.0
  - @effect/schema@0.67.22

## 0.3.9

### Patch Changes

- Updated dependencies [[`2b9ddfc`](https://github.com/Effect-TS/effect/commit/2b9ddfcbac505d98551e764a43923854907ca5c1), [`1f4ac00`](https://github.com/Effect-TS/effect/commit/1f4ac00a91c336c9c9c9b8c3ed9ceb9920ebc9bd), [`9305b76`](https://github.com/Effect-TS/effect/commit/9305b764cceeae4f16564435ae7172f79c2bf822), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`188f0a5`](https://github.com/Effect-TS/effect/commit/188f0a5c57ed0d7c9e5852e0c1c998f1b95810a1), [`b761ef0`](https://github.com/Effect-TS/effect/commit/b761ef00eaf6c67b7ffe34798b98aae5347ab376), [`b53f69b`](https://github.com/Effect-TS/effect/commit/b53f69bff1452a487b21198cd83961f844e02d36), [`0f40d98`](https://github.com/Effect-TS/effect/commit/0f40d989da10f68df3ecd72b36849401ad679bfb), [`5bd549e`](https://github.com/Effect-TS/effect/commit/5bd549e4bd7144727db438ecca6b8dc9b3ef7e22), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f), [`67f160a`](https://github.com/Effect-TS/effect/commit/67f160a213de0219a565d4bf653b3cbf24f58e8f)]:
  - @effect/platform@0.56.0
  - effect@3.3.0
  - @effect/schema@0.67.21

## 0.3.8

### Patch Changes

- Updated dependencies [[`4c6bc7f`](https://github.com/Effect-TS/effect/commit/4c6bc7f190c142dc9db70b365a2bf30715a98e62), [`a67d602`](https://github.com/Effect-TS/effect/commit/a67d60276f96cd20b76145b4cee13efca6c6158a)]:
  - @effect/schema@0.67.20
  - @effect/platform@0.55.7

## 0.3.7

### Patch Changes

- Updated dependencies [[`8c5d280`](https://github.com/Effect-TS/effect/commit/8c5d280c0402284a4e58372867a15a431cb99461), [`6ba6d26`](https://github.com/Effect-TS/effect/commit/6ba6d269f5891e6b11aa35c5281dde4bf3273004), [`cd7496b`](https://github.com/Effect-TS/effect/commit/cd7496ba214eabac2e3c297f513fcbd5b11f0e91), [`3f28bf2`](https://github.com/Effect-TS/effect/commit/3f28bf274333611906175446b772243f34f1b6d5), [`5817820`](https://github.com/Effect-TS/effect/commit/58178204a770d1a78c06945ef438f9fffbb50afa), [`349a036`](https://github.com/Effect-TS/effect/commit/349a036ffb08351481c060655660a6ccf26473de), [`799aa20`](https://github.com/Effect-TS/effect/commit/799aa20b4f618736ba33a5297fda90a75d4c26c6)]:
  - effect@3.2.9
  - @effect/schema@0.67.19
  - @effect/platform@0.55.6

## 0.3.6

### Patch Changes

- Updated dependencies [[`a0dd1c1`](https://github.com/Effect-TS/effect/commit/a0dd1c1ede2a1e856ecb0e67826ec992016fef97)]:
  - @effect/schema@0.67.18
  - @effect/platform@0.55.5

## 0.3.5

### Patch Changes

- Updated dependencies [[`d9d22e7`](https://github.com/Effect-TS/effect/commit/d9d22e7c4d5e31d5b46644c729b027796e467c16), [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a), [`3c080f7`](https://github.com/Effect-TS/effect/commit/3c080f74b2e2290edb6143c3aa01026e57f87a2a), [`7d6d875`](https://github.com/Effect-TS/effect/commit/7d6d8750077d9c8379f37240745240d7f3b7a4f8), [`70cda70`](https://github.com/Effect-TS/effect/commit/70cda704e8e31c80737b95121c8199e726ea132f), [`fb91f17`](https://github.com/Effect-TS/effect/commit/fb91f17098b48497feca9ec976feb87e4a82451b)]:
  - @effect/schema@0.67.17
  - effect@3.2.8
  - @effect/platform@0.55.4

## 0.3.4

### Patch Changes

- Updated dependencies [[`5745886`](https://github.com/Effect-TS/effect/commit/57458869859943410221ccc87f8cecfba7c79d92), [`6801fca`](https://github.com/Effect-TS/effect/commit/6801fca44366be3ee1b6b99f54bd4f38a1b5e4f4)]:
  - @effect/schema@0.67.16
  - effect@3.2.7
  - @effect/platform@0.55.3

## 0.3.3

### Patch Changes

- Updated dependencies [[`2c2280b`](https://github.com/Effect-TS/effect/commit/2c2280b98a11fc002663c55792a4fa5781cd5fb6), [`e2740fc`](https://github.com/Effect-TS/effect/commit/e2740fc4e212ba85a90541e8c8d85b0bcd5c2e7c), [`cc8ac50`](https://github.com/Effect-TS/effect/commit/cc8ac5080daba8622ca2ff5dab5c37ddfab732ba), [`60fe3d5`](https://github.com/Effect-TS/effect/commit/60fe3d5fb2be168dd35c6d0cb8ac8f55deb30fc0)]:
  - @effect/platform@0.55.2
  - @effect/schema@0.67.15
  - effect@3.2.6

## 0.3.2

### Patch Changes

- [#2867](https://github.com/Effect-TS/effect/pull/2867) [`3e86ced`](https://github.com/Effect-TS/effect/commit/3e86cedfa2507dbf5475c1cb10e0018d00e5593d) Thanks @jamiehodge! - fix sql mysql migrator

## 0.3.1

### Patch Changes

- Updated dependencies [[`c5846e9`](https://github.com/Effect-TS/effect/commit/c5846e99137e9eb02efd31865e26f49f0d2c7c03)]:
  - @effect/schema@0.67.14
  - @effect/platform@0.55.1

## 0.3.0

### Minor Changes

- [#2833](https://github.com/Effect-TS/effect/pull/2833) [`af0543c`](https://github.com/Effect-TS/effect/commit/af0543cbe62e9b9c0bd0ecb1ce2e5814b2c3caaa) Thanks @tim-smart! - remove file system migrator from web sql implementations

### Patch Changes

- Updated dependencies [[`608b01f`](https://github.com/Effect-TS/effect/commit/608b01fc342dbae2a642b308a67b84ead530ecea), [`031c712`](https://github.com/Effect-TS/effect/commit/031c7122a24ac42e48d6a434646b4f5d279d7442), [`a44e532`](https://github.com/Effect-TS/effect/commit/a44e532cf3a6a498b12a5aacf8124aa267e24ba0), [`5133ca9`](https://github.com/Effect-TS/effect/commit/5133ca9dc4b8da0e28951316da9ab55dfbe0fbb9)]:
  - effect@3.2.5
  - @effect/platform@0.55.0
  - @effect/schema@0.67.13

## 0.2.17

### Patch Changes

- Updated dependencies [[`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3), [`f8038ca`](https://github.com/Effect-TS/effect/commit/f8038cadd5f50d397469e5fdbc70dd8f69671f50), [`e376641`](https://github.com/Effect-TS/effect/commit/e3766411b60ebb45d31e9c9d94efa099121d4d58), [`c07e0ce`](https://github.com/Effect-TS/effect/commit/c07e0cea8ce165887e2c9dfa5d669eba9b2fb798), [`e313a01`](https://github.com/Effect-TS/effect/commit/e313a01b7e80f6cb7704055a190e5623c9d22c6d), [`1af94df`](https://github.com/Effect-TS/effect/commit/1af94df6b74aeb4f6ebcbe80e074b4cb252e62e3)]:
  - effect@3.2.4
  - @effect/platform@0.54.0
  - @effect/schema@0.67.12

## 0.2.16

### Patch Changes

- Updated dependencies [[`5af633e`](https://github.com/Effect-TS/effect/commit/5af633eb5ff6560a64d87263d1692bb9c75f7b3c), [`45578e8`](https://github.com/Effect-TS/effect/commit/45578e8faa80ae33d23e08f6f19467f818b7788f)]:
  - @effect/schema@0.67.11
  - effect@3.2.3
  - @effect/platform@0.53.14

## 0.2.15

### Patch Changes

- Updated dependencies [[`5d9266e`](https://github.com/Effect-TS/effect/commit/5d9266e8c740746ac9e186c3df6090a1b57fbe2a), [`9f8122e`](https://github.com/Effect-TS/effect/commit/9f8122e78884ab47c5e5f364d86eee1d1543cc61), [`6a6f670`](https://github.com/Effect-TS/effect/commit/6a6f6706b8613c8c7c10971b8d81a0f9e440a6f2), [`c1eaef9`](https://github.com/Effect-TS/effect/commit/c1eaef910420dae416923d172ee58d219e921d0f), [`78ffc27`](https://github.com/Effect-TS/effect/commit/78ffc27ee3fa708433c25fa118c53d38d90d08bc)]:
  - effect@3.2.2
  - @effect/platform@0.53.13
  - @effect/schema@0.67.10

## 0.2.14

### Patch Changes

- Updated dependencies [[`5432fff`](https://github.com/Effect-TS/effect/commit/5432fff7c9a69d43910426c1053ebfc3b73ebed6)]:
  - @effect/schema@0.67.9
  - @effect/platform@0.53.12

## 0.2.13

### Patch Changes

- Updated dependencies [[`c1e991d`](https://github.com/Effect-TS/effect/commit/c1e991dd5ba87901cd0e05697a8b4a267e7e954a)]:
  - effect@3.2.1
  - @effect/platform@0.53.11
  - @effect/schema@0.67.8

## 0.2.12

### Patch Changes

- [#2778](https://github.com/Effect-TS/effect/pull/2778) [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e) Thanks [@tim-smart](https://github.com/tim-smart)! - capture stack trace for tracing spans

- Updated dependencies [[`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`963b4e7`](https://github.com/Effect-TS/effect/commit/963b4e7ac87e2468feb6a344f7ab4ee4ad711198), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`2cbb76b`](https://github.com/Effect-TS/effect/commit/2cbb76bb52500a3f4bf27d1c91482518cbea56d7), [`870c5fa`](https://github.com/Effect-TS/effect/commit/870c5fa52cd61e745e8e828d38c3f09f00737553), [`146cadd`](https://github.com/Effect-TS/effect/commit/146cadd9d004634a3ff85c480bf92cf975c853e2), [`7135748`](https://github.com/Effect-TS/effect/commit/713574813a0f64085db0b5240ba39e7a0a7c137e), [`64c9414`](https://github.com/Effect-TS/effect/commit/64c9414e960e82058ca09bbb3976d6fbef303a8e)]:
  - effect@3.2.0
  - @effect/platform@0.53.10
  - @effect/schema@0.67.7

## 0.2.11

### Patch Changes

- Updated dependencies [[`17da864`](https://github.com/Effect-TS/effect/commit/17da864e4a6f80becdb82db7dece2ba583bfdda3), [`17fc22e`](https://github.com/Effect-TS/effect/commit/17fc22e132593c5caa563705a4748ba0f04a853c), [`810f222`](https://github.com/Effect-TS/effect/commit/810f222268792b13067c7a7bf317b93a9bb8917b), [`596aaea`](https://github.com/Effect-TS/effect/commit/596aaea022648b2e06fb1ec22f1652043d6fe64e), [`ff0efa0`](https://github.com/Effect-TS/effect/commit/ff0efa0a1415a41d4a4312a16cf7a63def86db3f)]:
  - @effect/schema@0.67.6
  - @effect/platform@0.53.9
  - effect@3.1.6

## 0.2.10

### Patch Changes

- Updated dependencies [[`9c514de`](https://github.com/Effect-TS/effect/commit/9c514de28152696edff008324d2d7e67d55afd56)]:
  - @effect/schema@0.67.5
  - @effect/platform@0.53.8

## 0.2.9

### Patch Changes

- [#2712](https://github.com/Effect-TS/effect/pull/2712) [`01b4553`](https://github.com/Effect-TS/effect/commit/01b4553df4d2a7c5824a112f405a49f8fcfebbf4) Thanks [@vecerek](https://github.com/vecerek)! - Use constants from `@opentelemetry/semantic-conventions` as span attribute names instead of hard-coded values

- Updated dependencies [[`ee08593`](https://github.com/Effect-TS/effect/commit/ee0859398ecc2589cab0d017bef6a17e00c34dfd), [`da6d7d8`](https://github.com/Effect-TS/effect/commit/da6d7d845246e9d04631d64fa7694944b6010d09)]:
  - @effect/schema@0.67.4
  - @effect/platform@0.53.7

## 0.2.8

### Patch Changes

- Updated dependencies [[`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610), [`6ac4847`](https://github.com/Effect-TS/effect/commit/6ac48479447c01a4f35d655552af93e47e562610)]:
  - @effect/platform@0.53.6
  - effect@3.1.5
  - @effect/schema@0.67.3

## 0.2.7

### Patch Changes

- Updated dependencies [[`89a3afb`](https://github.com/Effect-TS/effect/commit/89a3afbe191c83b84b17bfaa95519aff0749afbe), [`992c8e2`](https://github.com/Effect-TS/effect/commit/992c8e21535db9f0c66e81d32fee8af56a96274f)]:
  - @effect/schema@0.67.2
  - @effect/platform@0.53.5

## 0.2.6

### Patch Changes

- Updated dependencies [[`e41e911`](https://github.com/Effect-TS/effect/commit/e41e91122fa6dd12fc81e50dcad0db891be67146)]:
  - effect@3.1.4
  - @effect/platform@0.53.4
  - @effect/schema@0.67.1

## 0.2.5

### Patch Changes

- Updated dependencies [[`d7e4997`](https://github.com/Effect-TS/effect/commit/d7e49971fe97b7ee5fb7991f3f5ac4d627a26338)]:
  - @effect/schema@0.67.0
  - @effect/platform@0.53.3

## 0.2.4

### Patch Changes

- Updated dependencies [[`1f6dc96`](https://github.com/Effect-TS/effect/commit/1f6dc96f51c7bb9c8d11415358308604ba7c7c8e)]:
  - effect@3.1.3
  - @effect/platform@0.53.2
  - @effect/schema@0.66.16

## 0.2.3

### Patch Changes

- Updated dependencies [[`121d6d9`](https://github.com/Effect-TS/effect/commit/121d6d93755138c7510ba3ab4f0019ec0cb91890)]:
  - @effect/schema@0.66.15
  - @effect/platform@0.53.1

## 0.2.2

### Patch Changes

- Updated dependencies [[`d57fbbb`](https://github.com/Effect-TS/effect/commit/d57fbbbd6c466936213a671fc3cd2390064f864e)]:
  - @effect/platform@0.53.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`5866c62`](https://github.com/Effect-TS/effect/commit/5866c621d7eb4cc84e4ba972bfdfd219734cd45d)]:
  - @effect/platform@0.52.3

## 0.2.0

### Minor Changes

- [#2693](https://github.com/Effect-TS/effect/pull/2693) [`0724274`](https://github.com/Effect-TS/effect/commit/07242746ed8a3b0383631108360a0ad4f6e062f0) Thanks [@tim-smart](https://github.com/tim-smart)! - make @effect/sql dialect agnostic

  All of the client implementations now share the same Context.Tag. This means you can create
  services that support multiple SQL flavors.

  You can now use the `@effect/sql` package to access the client apis:

  ```ts
  import * as Sql from "@effect/sql"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const sql = yield* Sql.client.Client
    yield* sql`SELECT * FROM users`
  })
  ```

  If you need a functionality that is specific to a implementation, you can use the tag from the
  implementation package:

  ```ts
  import * as Sqlite from "@effect/sql-sqlite-node"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const sql = yield* Sqlite.client.SqliteClient
    const dump = yield* sql.export
  })
  ```

  If you need to run a different query depending on the dialect, you can use the `sql.onDialect` api:

  ```ts
  import * as Sql from "@effect/sql"
  import { Effect } from "effect"

  Effect.gen(function* () {
    const sql = yield* Sql.client.Client
    yield* sql.onDialect({
      sqlite: () => sql`SELECT * FROM sqlite_master`,
      mysql: () => sql`SHOW TABLES`,
      mssql: () => sql`SELECT * FROM sys.tables`,
      pg: () => sql`SELECT * FROM pg_catalog.pg_tables`
    })
  })
  ```

### Patch Changes

- [#2693](https://github.com/Effect-TS/effect/pull/2693) [`0724274`](https://github.com/Effect-TS/effect/commit/07242746ed8a3b0383631108360a0ad4f6e062f0) Thanks [@tim-smart](https://github.com/tim-smart)! - add .returning helper to insert and update apis

## 0.1.17

### Patch Changes

- [#2679](https://github.com/Effect-TS/effect/pull/2679) [`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all type ids are annotated with `unique symbol`

- [#2685](https://github.com/Effect-TS/effect/pull/2685) [`d3cf2d8`](https://github.com/Effect-TS/effect/commit/d3cf2d80038310ccc0a6a015d13d86291a953b41) Thanks [@giacomoran](https://github.com/giacomoran)! - fix `sql.update` default arguments

- [#2684](https://github.com/Effect-TS/effect/pull/2684) [`56ec8dd`](https://github.com/Effect-TS/effect/commit/56ec8ddc3495f11a1ca8acc59098d9a2f5ced615) Thanks [@giacomoran](https://github.com/giacomoran)! - fix placeholder count in sql helpers

- Updated dependencies [[`2e1cdf6`](https://github.com/Effect-TS/effect/commit/2e1cdf67d141281288fffe9a5c10d1379a800513)]:
  - @effect/platform@0.52.2
  - effect@3.1.2
  - @effect/schema@0.66.14

## 0.1.16

### Patch Changes

- Updated dependencies [[`e5e56d1`](https://github.com/Effect-TS/effect/commit/e5e56d138dbed3204636f605229c6685f89659fc)]:
  - effect@3.1.1
  - @effect/platform@0.52.1
  - @effect/schema@0.66.13

## 0.1.15

### Patch Changes

- Updated dependencies [[`9deab0a`](https://github.com/Effect-TS/effect/commit/9deab0aec9e99501f9441843e34df9afa10c5be9), [`7719b8a`](https://github.com/Effect-TS/effect/commit/7719b8a7350c14e952ffe685bfd5308773b3e271)]:
  - @effect/platform@0.52.0

## 0.1.14

### Patch Changes

- [#2543](https://github.com/Effect-TS/effect/pull/2543) [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85) Thanks [@github-actions](https://github.com/apps/github-actions)! - set span `kind` where applicable

- Updated dependencies [[`c3c12c6`](https://github.com/Effect-TS/effect/commit/c3c12c6625633fe80e79f9db75a3b8cf8ca8b11d), [`ba64ea6`](https://github.com/Effect-TS/effect/commit/ba64ea6757810c5e74cad3863a7d19d4d38af66b), [`b5de2d2`](https://github.com/Effect-TS/effect/commit/b5de2d2ce5b1afe8be90827bf898a95cec40eb2b), [`a1c7ab8`](https://github.com/Effect-TS/effect/commit/a1c7ab8ffedacd18c1fc784f4ff5844f79498b83), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`0ec93cb`](https://github.com/Effect-TS/effect/commit/0ec93cb4f166e7401c171c2f8e8276ce958d9a57), [`1c9454d`](https://github.com/Effect-TS/effect/commit/1c9454d532eae79b9f759aea77f59332cc6d18ed), [`a023f28`](https://github.com/Effect-TS/effect/commit/a023f28336f3865687d9a30c1883e36909906d85), [`92d56db`](https://github.com/Effect-TS/effect/commit/92d56dbb3f33e36636c2a2f1030c56492e39cf4d)]:
  - effect@3.1.0
  - @effect/platform@0.51.0
  - @effect/schema@0.66.12

## 0.1.13

### Patch Changes

- Updated dependencies [[`16039a0`](https://github.com/Effect-TS/effect/commit/16039a08f04f11545e2fdf40952788a8f9cef04f), [`557707b`](https://github.com/Effect-TS/effect/commit/557707bc9e5f230c8964d2757012075c34339b5c), [`d1d33e1`](https://github.com/Effect-TS/effect/commit/d1d33e10b25109f44b5ab1c6e4d778a59c0d3eeb), [`f4ed306`](https://github.com/Effect-TS/effect/commit/f4ed3068a70b50302d078a30d18ca3cfd2bc679c), [`661004f`](https://github.com/Effect-TS/effect/commit/661004f4bf5f8b25f5a0678c21a3a822188ce461), [`e79cb83`](https://github.com/Effect-TS/effect/commit/e79cb83d3b19098bc40a3012e2a059b8426306c2)]:
  - @effect/platform@0.50.8
  - effect@3.0.8
  - @effect/schema@0.66.11

## 0.1.12

### Patch Changes

- Updated dependencies [[`18de56b`](https://github.com/Effect-TS/effect/commit/18de56b4a6b6d1f99230dfabf9147d59ea4dd759)]:
  - effect@3.0.7
  - @effect/platform@0.50.7
  - @effect/schema@0.66.10

## 0.1.11

### Patch Changes

- [#2626](https://github.com/Effect-TS/effect/pull/2626) [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4) Thanks [@fubhy](https://github.com/fubhy)! - Reintroduce custom `NoInfer` type

- [#2621](https://github.com/Effect-TS/effect/pull/2621) [`f363af0`](https://github.com/Effect-TS/effect/commit/f363af08df9426a8bc629d80ef57d8b7e243ffa6) Thanks [@tim-smart](https://github.com/tim-smart)! - add sql transaction tracing spans

- [#2609](https://github.com/Effect-TS/effect/pull/2609) [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50) Thanks [@patroza](https://github.com/patroza)! - change: BatchedRequestResolver works with NonEmptyArray

- [#2621](https://github.com/Effect-TS/effect/pull/2621) [`f363af0`](https://github.com/Effect-TS/effect/commit/f363af08df9426a8bc629d80ef57d8b7e243ffa6) Thanks [@tim-smart](https://github.com/tim-smart)! - update sql span attributes to follow semantic conventions

- [#2621](https://github.com/Effect-TS/effect/pull/2621) [`f363af0`](https://github.com/Effect-TS/effect/commit/f363af08df9426a8bc629d80ef57d8b7e243ffa6) Thanks [@tim-smart](https://github.com/tim-smart)! - add sql`...`.unprepared, to run a query without trying to PREPARE it

- Updated dependencies [[`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`027418e`](https://github.com/Effect-TS/effect/commit/027418edaa6aa6c0ae4861b95832827b45adace4), [`ac1898e`](https://github.com/Effect-TS/effect/commit/ac1898eb7bc96880f911c276048e2ea3d6fe9c50), [`ffe4f4e`](https://github.com/Effect-TS/effect/commit/ffe4f4e95db35fff6869e360b072e3837befa0a1), [`8206529`](https://github.com/Effect-TS/effect/commit/8206529d6a7bbf3e3c6f670afb0381e83176736e)]:
  - effect@3.0.6
  - @effect/schema@0.66.9
  - @effect/platform@0.50.6

## 0.1.10

### Patch Changes

- Updated dependencies [[`6222404`](https://github.com/Effect-TS/effect/commit/62224044678751829ed2f128e05133a91c6b0569), [`868ed2a`](https://github.com/Effect-TS/effect/commit/868ed2a8fe94ee7f4206a6070f29dcf2a5ba1dc3)]:
  - effect@3.0.5
  - @effect/platform@0.50.5
  - @effect/schema@0.66.8

## 0.1.9

### Patch Changes

- Updated dependencies [[`dd41c6c`](https://github.com/Effect-TS/effect/commit/dd41c6c725b1c1c980683275d8fa69779902187e), [`9a24667`](https://github.com/Effect-TS/effect/commit/9a246672008a2b668d43fbfd2fe5508c54b2b920)]:
  - @effect/schema@0.66.7
  - effect@3.0.4
  - @effect/platform@0.50.4

## 0.1.8

### Patch Changes

- Updated dependencies [[`9dfc156`](https://github.com/Effect-TS/effect/commit/9dfc156dc13fb4da9c777aae3acece4b5ecf0064), [`80271bd`](https://github.com/Effect-TS/effect/commit/80271bdc648e9efa659ce66b2c255754a6a1a8b0), [`b3b51a2`](https://github.com/Effect-TS/effect/commit/b3b51a2ea0c6ab92a363db46ebaa7e1176d089f5), [`e4ba97d`](https://github.com/Effect-TS/effect/commit/e4ba97d060c16bdf4e3b5bd5db6777f121a6768c)]:
  - @effect/schema@0.66.6
  - @effect/platform@0.50.3

## 0.1.7

### Patch Changes

- Updated dependencies [[`b3fe829`](https://github.com/Effect-TS/effect/commit/b3fe829e8b12726afe94086b5375968f41a26411), [`a58b7de`](https://github.com/Effect-TS/effect/commit/a58b7deb8bb1d3b0dd636decf5d16f115f37eb72), [`d90e8c3`](https://github.com/Effect-TS/effect/commit/d90e8c3090cbc78e2bc7b51c974df66ffefacdfa)]:
  - @effect/schema@0.66.5
  - @effect/platform@0.50.2

## 0.1.6

### Patch Changes

- Updated dependencies [[`773b8e0`](https://github.com/Effect-TS/effect/commit/773b8e01521e8fa7c38ff15d92d21d6fd6dad56f)]:
  - @effect/schema@0.66.4
  - @effect/platform@0.50.1

## 0.1.5

### Patch Changes

- Updated dependencies [[`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6), [`a7b4b84`](https://github.com/Effect-TS/effect/commit/a7b4b84bd5a25f51aba922f9259c3a58c98c6a4e), [`a3b0e6c`](https://github.com/Effect-TS/effect/commit/a3b0e6c490772e6d44b5d98dcf2729c4d5310ecc), [`6f38dff`](https://github.com/Effect-TS/effect/commit/6f38dff41ffa34532cc2f25b90446550c5730bb6)]:
  - @effect/platform@0.50.0
  - effect@3.0.3
  - @effect/schema@0.66.3

## 0.1.4

### Patch Changes

- [#2562](https://github.com/Effect-TS/effect/pull/2562) [`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86) Thanks [@fubhy](https://github.com/fubhy)! - Added provenance publishing

- Updated dependencies [[`2cecdbd`](https://github.com/Effect-TS/effect/commit/2cecdbd1cf30befce4e84796ccd953ea55ecfb86)]:
  - @effect/platform@0.49.4
  - effect@3.0.2
  - @effect/schema@0.66.2

## 0.1.3

### Patch Changes

- Updated dependencies [[`8d39d65`](https://github.com/Effect-TS/effect/commit/8d39d6554af548228ad767112ce2e0b1f68fa8e1)]:
  - @effect/platform@0.49.3

## 0.1.2

### Patch Changes

- Updated dependencies [[`5ef0a1a`](https://github.com/Effect-TS/effect/commit/5ef0a1ae9b773fa2481550cb0d43ff7a0e03cd44)]:
  - @effect/platform@0.49.2

## 0.1.1

### Patch Changes

- [#2544](https://github.com/Effect-TS/effect/pull/2544) [`f838c15`](https://github.com/Effect-TS/effect/commit/f838c15ca83938a5ee9bfec49deb025564a570ff) Thanks [@tim-smart](https://github.com/tim-smart)! - support column names for `sql.in` helper

- [#2555](https://github.com/Effect-TS/effect/pull/2555) [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b) Thanks [@tim-smart](https://github.com/tim-smart)! - prevent use of `Array` as import name to solve bundler issues

- Updated dependencies [[`3da0cfa`](https://github.com/Effect-TS/effect/commit/3da0cfa12c407fd930dc480be1ecc9217a8058f8), [`570e8d8`](https://github.com/Effect-TS/effect/commit/570e8d87e7c0e9ad4cd2686462fdb9b4812f7716), [`b2b5d66`](https://github.com/Effect-TS/effect/commit/b2b5d6626b18eb5289f364ffab5240e84b04d085), [`87c5687`](https://github.com/Effect-TS/effect/commit/87c5687de0782dab177b7861217fa3b040046282), [`8edacca`](https://github.com/Effect-TS/effect/commit/8edacca37f8e37c01a63fec332b06d9361efaa7b)]:
  - effect@3.0.1
  - @effect/schema@0.66.1
  - @effect/platform@0.49.1

## 0.1.0

### Minor Changes

- [#2104](https://github.com/Effect-TS/effect/pull/2104) [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8) Thanks [@IMax153](https://github.com/IMax153)! - initial @effect/sql release

- [#2207](https://github.com/Effect-TS/effect/pull/2207) [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d) Thanks [@github-actions](https://github.com/apps/github-actions)! - Release Effect 3.0 🎉

### Patch Changes

- [#2529](https://github.com/Effect-TS/effect/pull/2529) [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray` and `ReadonlyRecord` modules for better discoverability.

- Updated dependencies [[`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`d50a652`](https://github.com/Effect-TS/effect/commit/d50a652479f4d1d64f48da05c79fa847e6e51548), [`9aeae46`](https://github.com/Effect-TS/effect/commit/9aeae461fdf9265389cf3dfe4e428b037215ba5f), [`9a3bd47`](https://github.com/Effect-TS/effect/commit/9a3bd47ebd0750c7e498162734f6d21895de0cb2), [`6460414`](https://github.com/Effect-TS/effect/commit/6460414351a45fb8e0a457c63f3653422efee766), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`cf69f46`](https://github.com/Effect-TS/effect/commit/cf69f46690058d71eeada03cfb40dc744573e9e4), [`e542371`](https://github.com/Effect-TS/effect/commit/e542371981f8b4b484979feaad8a25b1f45e2df0), [`be9d025`](https://github.com/Effect-TS/effect/commit/be9d025e42355260ace02dd135851a8935a4deba), [`78b767c`](https://github.com/Effect-TS/effect/commit/78b767c2b1625186e17131761a0edbac25d21850), [`aa4a3b5`](https://github.com/Effect-TS/effect/commit/aa4a3b550da1c1020265ac389ed3f309388994a2), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`5c2b561`](https://github.com/Effect-TS/effect/commit/5c2b5614f583b88784ed68126ae939832fb3c092), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`a18f594`](https://github.com/Effect-TS/effect/commit/a18f5948f1439a147232448b2c443472fda0eceb), [`1499974`](https://github.com/Effect-TS/effect/commit/14999741d2e19c1747f6a7e19d68977f6429cdb8), [`2f96d93`](https://github.com/Effect-TS/effect/commit/2f96d938b90f8c19377583279e3c7afd9b509c50), [`5a2314b`](https://github.com/Effect-TS/effect/commit/5a2314b70ec79c2c02b51cef45a5ddec8327daa1), [`25d74f8`](https://github.com/Effect-TS/effect/commit/25d74f8c4d2dd4a9e5ec57ce2f20d36dedd25343), [`6c6087a`](https://github.com/Effect-TS/effect/commit/6c6087a4a897b64252346426660782d31c13f769), [`271b79f`](https://github.com/Effect-TS/effect/commit/271b79fc0b66a6c11e07a8779ff8800493a7eac2), [`1b5f0c7`](https://github.com/Effect-TS/effect/commit/1b5f0c77e7fd477a0026071e82129a948227f4b3), [`2fb7d9c`](https://github.com/Effect-TS/effect/commit/2fb7d9ca15037ff62a578bb9fe5732da5f4f317d), [`53d1c2a`](https://github.com/Effect-TS/effect/commit/53d1c2a77559081fbb89667e343346375c6d6650), [`e7e1bbe`](https://github.com/Effect-TS/effect/commit/e7e1bbe68486fdf31c8f84b0880522d39adcaad3), [`10c169e`](https://github.com/Effect-TS/effect/commit/10c169eadc874e91b4defca3f467b4e6a50fd8f3), [`6424181`](https://github.com/Effect-TS/effect/commit/64241815fe6a939e91e6947253e7dceea1306aa8)]:
  - effect@3.0.0
  - @effect/schema@0.66.0
  - @effect/platform@0.49.0
