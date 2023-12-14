# @effect/cli

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
