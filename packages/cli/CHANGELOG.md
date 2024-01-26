# @effect/cli

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
