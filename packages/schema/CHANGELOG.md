# @fp-ts/schema

## 0.1.0

### Minor Changes

- [#50](https://github.com/fp-ts/schema/pull/50) [`880fdc1`](https://github.com/fp-ts/schema/commit/880fdc158fa58aaaeab54ff96f8d00472db6c858) Thanks [@gcanti](https://github.com/gcanti)! - refactor index exports

- [#50](https://github.com/fp-ts/schema/pull/50) [`dbc158a`](https://github.com/fp-ts/schema/commit/dbc158a4965407b7cadc5c14c883e897b9d75731) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to @fp-ts/core@0.1.1

- [#50](https://github.com/fp-ts/schema/pull/50) [`68f18e9`](https://github.com/fp-ts/schema/commit/68f18e917609a2f50ba4275a7207e7725b871952) Thanks [@gcanti](https://github.com/gcanti)! - rename ParseError module to ParseResult

- [#50](https://github.com/fp-ts/schema/pull/50) [`9161174`](https://github.com/fp-ts/schema/commit/91611741bdc45dee25aa173a76ba6cf06f12072b) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to @fp-ts/data@0.1.0

- [#50](https://github.com/fp-ts/schema/pull/50) [`71461a7`](https://github.com/fp-ts/schema/commit/71461a7ed573cc6430cb5a1957441dc0c34f0d68) Thanks [@gcanti](https://github.com/gcanti)! - move ParseOptions to AST and remove the `I` type parameter from Parser

- [#50](https://github.com/fp-ts/schema/pull/50) [`b51e2a4`](https://github.com/fp-ts/schema/commit/b51e2a45e860c8102625e4cb019adb2d90a540ce) Thanks [@gcanti](https://github.com/gcanti)! - AST: added the `create` prefix to the APIs in order to conform to the style of TypeScript's AST

## 0.0.8

### Patch Changes

- [#30](https://github.com/fp-ts/schema/pull/30) [`fe8667e`](https://github.com/fp-ts/schema/commit/fe8667e588c4f0538aeee2f46f6959d27e7f0b39) Thanks [@gcanti](https://github.com/gcanti)! - allow encoders to possibly fail

- [#30](https://github.com/fp-ts/schema/pull/30) [`de00b9c`](https://github.com/fp-ts/schema/commit/de00b9ca69091be413b80944981226d1fc5e40b8) Thanks [@gcanti](https://github.com/gcanti)! - DecodeError: remove UnexpectedKey, UnexpectedIndex in favour of Unexpected

- [#30](https://github.com/fp-ts/schema/pull/30) [`ff15a08`](https://github.com/fp-ts/schema/commit/ff15a08fe5f3382a801515811a8f75541ecc2b2e) Thanks [@gcanti](https://github.com/gcanti)! - The `allErrors` option is a feature that allows you to receive all decoding errors when attempting to decode a value using a schema

- [#30](https://github.com/fp-ts/schema/pull/30) [`a7ac861`](https://github.com/fp-ts/schema/commit/a7ac861d803b3a15e59e6a008e86dc515fdb693a) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename LiteralType to Literal

- [#30](https://github.com/fp-ts/schema/pull/30) [`1dd0988`](https://github.com/fp-ts/schema/commit/1dd09889c1267ef59b1c86cce8192ac06445906e) Thanks [@gcanti](https://github.com/gcanti)! - rename parseString to parseNumber

- [#30](https://github.com/fp-ts/schema/pull/30) [`245aea7`](https://github.com/fp-ts/schema/commit/245aea7d3286d6e9c96250d0a43212ae5ba1c2a9) Thanks [@gcanti](https://github.com/gcanti)! - ditch These in favour of Either

- [#30](https://github.com/fp-ts/schema/pull/30) [`ce6bbea`](https://github.com/fp-ts/schema/commit/ce6bbea7e9fa9d9e3ce88fee79ff9e7308d59cad) Thanks [@gcanti](https://github.com/gcanti)! - remove Codec module

- [#30](https://github.com/fp-ts/schema/pull/30) [`8f984af`](https://github.com/fp-ts/schema/commit/8f984af3c589c5c4304441baaa19be4abc586519) Thanks [@gcanti](https://github.com/gcanti)! - remove Encoder module

- [#30](https://github.com/fp-ts/schema/pull/30) [`f94ca4c`](https://github.com/fp-ts/schema/commit/f94ca4c3ef15c6d6c005e73d925ee0089efd7797) Thanks [@gcanti](https://github.com/gcanti)! - rename regex to pattern

- [#30](https://github.com/fp-ts/schema/pull/30) [`3f641e8`](https://github.com/fp-ts/schema/commit/3f641e8aba5e837cb03651704c6b1615719efb37) Thanks [@gcanti](https://github.com/gcanti)! - unify type alias hooks

- [#30](https://github.com/fp-ts/schema/pull/30) [`7373473`](https://github.com/fp-ts/schema/commit/7373473d74f2d9069a43f84138272322960aa0c6) Thanks [@gcanti](https://github.com/gcanti)! - refactor annotations

- [#30](https://github.com/fp-ts/schema/pull/30) [`af3b3be`](https://github.com/fp-ts/schema/commit/af3b3be7aa7fee7d7107aa6b11b31bef7e90b58a) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename Struct to TypeLiteral

- [#30](https://github.com/fp-ts/schema/pull/30) [`a70747a`](https://github.com/fp-ts/schema/commit/a70747a8bad53912e4cabed011c3a063971eaf12) Thanks [@gcanti](https://github.com/gcanti)! - record: add support for refinements

- [#30](https://github.com/fp-ts/schema/pull/30) [`2387312`](https://github.com/fp-ts/schema/commit/23873120c1c736569f5e19ffef99184e765d4767) Thanks [@gcanti](https://github.com/gcanti)! - AST: add Transform node

- [#30](https://github.com/fp-ts/schema/pull/30) [`ae5a6e8`](https://github.com/fp-ts/schema/commit/ae5a6e87ada9cb97e9c46924415ad4599d062e57) Thanks [@gcanti](https://github.com/gcanti)! - rename Decoder to Parser, DecodeError to ParseError, DecodeResult to ParseResult

- [#30](https://github.com/fp-ts/schema/pull/30) [`05635d9`](https://github.com/fp-ts/schema/commit/05635d9378eab156d2a6765cd955157b669b5a64) Thanks [@gcanti](https://github.com/gcanti)! - refactor /data using transform: Chunk.fromArray, ReadonlyMap.fromEntries, ReadonlySet.fromArray

- [#30](https://github.com/fp-ts/schema/pull/30) [`2f431e4`](https://github.com/fp-ts/schema/commit/2f431e4c1a757030c91bc3fa75cc34833eeba6a7) Thanks [@gcanti](https://github.com/gcanti)! - AST: change IndexSignature key to AST

- [#30](https://github.com/fp-ts/schema/pull/30) [`c720816`](https://github.com/fp-ts/schema/commit/c7208167c9a1c1d9a86d8a2b5ebb31aa4e47d71e) Thanks [@gcanti](https://github.com/gcanti)! - IndexSignature: add support for TemplateLiteral as parameter

- [#30](https://github.com/fp-ts/schema/pull/30) [`632450d`](https://github.com/fp-ts/schema/commit/632450d3d79342f1c4ec646d80624ab863cc8839) Thanks [@gcanti](https://github.com/gcanti)! - add includes string filter

- [#30](https://github.com/fp-ts/schema/pull/30) [`9cdd60e`](https://github.com/fp-ts/schema/commit/9cdd60e580eef96999a9d1eb214198551709f592) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename Field to PropertySignature

- [#30](https://github.com/fp-ts/schema/pull/30) [`29c3597`](https://github.com/fp-ts/schema/commit/29c359776a7fa5444eef3ad19cd8d81e2fd5f9b1) Thanks [@gcanti](https://github.com/gcanti)! - add support for template literals

- [#30](https://github.com/fp-ts/schema/pull/30) [`92b4069`](https://github.com/fp-ts/schema/commit/92b4069e373456f5d0918d54464ae14ee13d88a6) Thanks [@gcanti](https://github.com/gcanti)! - ParseError: remove Equal error

## 0.0.7

### Patch Changes

- [#28](https://github.com/fp-ts/schema/pull/28) [`bd8e00c`](https://github.com/fp-ts/schema/commit/bd8e00c2a9c2a82b84b093506a33f6e4c62aaada) Thanks [@gcanti](https://github.com/gcanti)! - add NonNaN filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`9179bfb`](https://github.com/fp-ts/schema/commit/9179bfb4b9aea27992ac5712decc411d414633cb) Thanks [@gcanti](https://github.com/gcanti)! - remove arbitrary and pretty from Codec

- [#28](https://github.com/fp-ts/schema/pull/28) [`d7edabc`](https://github.com/fp-ts/schema/commit/d7edabc848424f3cd10ea637b22802b4d997c39c) Thanks [@gcanti](https://github.com/gcanti)! - add Regex filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`6cb83d8`](https://github.com/fp-ts/schema/commit/6cb83d88d5fb2b7461af99e718c4e78396f5194e) Thanks [@gcanti](https://github.com/gcanti)! - DecodeError: renaming and add Parse

- [#28](https://github.com/fp-ts/schema/pull/28) [`3b20bf5`](https://github.com/fp-ts/schema/commit/3b20bf5ae1643ffad94f5df9f1b09d6fab151e75) Thanks [@gcanti](https://github.com/gcanti)! - add InstanceOf filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`dfa50b3`](https://github.com/fp-ts/schema/commit/dfa50b36a9ca97c6fd0dfced61fba1b010efa529) Thanks [@gcanti](https://github.com/gcanti)! - add StartsWith filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`a118fb8`](https://github.com/fp-ts/schema/commit/a118fb845c5cc267cb1edfa0c53c6675aaf1c02b) Thanks [@gcanti](https://github.com/gcanti)! - add NumberBuilder

- [#28](https://github.com/fp-ts/schema/pull/28) [`88d6c1c`](https://github.com/fp-ts/schema/commit/88d6c1ca6758b2041dbb4edfb097f4043999df4e) Thanks [@gcanti](https://github.com/gcanti)! - merge stringIndexSignature, symbolIndexSignature into record

- [#28](https://github.com/fp-ts/schema/pull/28) [`3245918`](https://github.com/fp-ts/schema/commit/3245918d5a8d0b22b1063397f149d800caaf2f3f) Thanks [@gcanti](https://github.com/gcanti)! - bug fix: adding a post rest element makes all optional elements required but also adds `undefined` to their type

- [#28](https://github.com/fp-ts/schema/pull/28) [`bc6744b`](https://github.com/fp-ts/schema/commit/bc6744bd9e7a0e63cbf38cf90a4496ad0b5e2dfe) Thanks [@gcanti](https://github.com/gcanti)! - add EndsWith filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`48f5c7f`](https://github.com/fp-ts/schema/commit/48f5c7ff479da3e136e57f514d10944c60631bfe) Thanks [@gcanti](https://github.com/gcanti)! - add Finite filter

- [#28](https://github.com/fp-ts/schema/pull/28) [`5e348f7`](https://github.com/fp-ts/schema/commit/5e348f7a3156b17dfe27d59652aaecbd07da6a74) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor Refinement

## 0.0.6

### Patch Changes

- [#26](https://github.com/fp-ts/schema/pull/26) [`ad6b0f2`](https://github.com/fp-ts/schema/commit/ad6b0f228b4741a20b81fee00935210b8b3d23bc) Thanks [@gcanti](https://github.com/gcanti)! - AST: add UndefinedKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`2627797`](https://github.com/fp-ts/schema/commit/2627797447654748848fbba2c28f0e6c7b7ceb35) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest @fp-ts/data

- [#26](https://github.com/fp-ts/schema/pull/26) [`ed431fc`](https://github.com/fp-ts/schema/commit/ed431fcef6ef6410fcf5fca5e2f0920ec9069d13) Thanks [@gcanti](https://github.com/gcanti)! - remove /data/JsonArray, /data/JsonObject

- [#26](https://github.com/fp-ts/schema/pull/26) [`13cd7b3`](https://github.com/fp-ts/schema/commit/13cd7b32ffcfbd9f050ade6fc7e9d67572eeb501) Thanks [@gcanti](https://github.com/gcanti)! - AST: add BigIntKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`6c68055`](https://github.com/fp-ts/schema/commit/6c68055384e5aff67adc74fb38237af0e2839af3) Thanks [@gcanti](https://github.com/gcanti)! - DecodeError: make NotType's expected field a string

- [#26](https://github.com/fp-ts/schema/pull/26) [`39b16d5`](https://github.com/fp-ts/schema/commit/39b16d5344bb93308804c851ba71eb7b7b487be8) Thanks [@gcanti](https://github.com/gcanti)! - rename restElement to rest

- [#26](https://github.com/fp-ts/schema/pull/26) [`eb29477`](https://github.com/fp-ts/schema/commit/eb294777d45c701d2ec1a29f349685312eb272fa) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest fp-ts/data

- [#26](https://github.com/fp-ts/schema/pull/26) [`b26b6ac`](https://github.com/fp-ts/schema/commit/b26b6ac7d9df4050786fcebe9072d983edb61096) Thanks [@gcanti](https://github.com/gcanti)! - AST: add NumberKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`4e53571`](https://github.com/fp-ts/schema/commit/4e535716bdd8d54ad4017978028feaff30f7b6f9) Thanks [@gcanti](https://github.com/gcanti)! - AST: add BooleanKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`aacc8b1`](https://github.com/fp-ts/schema/commit/aacc8b191d68fd02872c265993b4d9fb7e4fa2b8) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor Of to LiteralType

- [#26](https://github.com/fp-ts/schema/pull/26) [`430307b`](https://github.com/fp-ts/schema/commit/430307b3614e33c45b4116e03158303bc288143f) Thanks [@gcanti](https://github.com/gcanti)! - AST: add SymbolKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`b5c02ad`](https://github.com/fp-ts/schema/commit/b5c02ad20d67b0009015387247b621bf2f00d064) Thanks [@gcanti](https://github.com/gcanti)! - AST: add TypeAliasDeclaration

- [#26](https://github.com/fp-ts/schema/pull/26) [`59c0627`](https://github.com/fp-ts/schema/commit/59c062742907b242fe5ee761826f7949b57cd034) Thanks [@gcanti](https://github.com/gcanti)! - remove /data/UnknownArray, /data/UnknownObject

- [#26](https://github.com/fp-ts/schema/pull/26) [`ca88e4f`](https://github.com/fp-ts/schema/commit/ca88e4f462ca4eace633e52e9278a2b6c63195d3) Thanks [@gcanti](https://github.com/gcanti)! - remove /data/Option in favour of option combinator in Schema.ts

- [#26](https://github.com/fp-ts/schema/pull/26) [`aa98a60`](https://github.com/fp-ts/schema/commit/aa98a6077ea10a7d2fa02ca2bb9143e8847d2974) Thanks [@gcanti](https://github.com/gcanti)! - remove chunk, list and readonlySet from Schema and Codec

- [#26](https://github.com/fp-ts/schema/pull/26) [`f4b5b59`](https://github.com/fp-ts/schema/commit/f4b5b592e8d436cb1af6a5b8c8e676697573381d) Thanks [@gcanti](https://github.com/gcanti)! - AST: add AnyKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`e9699ac`](https://github.com/fp-ts/schema/commit/e9699ac8ba8372ebdfff2bd5a7da024308b8a4a4) Thanks [@gcanti](https://github.com/gcanti)! - AST: add UnknownKeyword

- [#26](https://github.com/fp-ts/schema/pull/26) [`2520ce9`](https://github.com/fp-ts/schema/commit/2520ce9550bdc5216d72220e3b740416640c8575) Thanks [@gcanti](https://github.com/gcanti)! - AST: add NeverKeyword

## 0.0.5

### Patch Changes

- [#22](https://github.com/fp-ts/schema/pull/22) [`b75083c`](https://github.com/fp-ts/schema/commit/b75083c03a22a397317953b461bfb197696de9a8) Thanks [@gcanti](https://github.com/gcanti)! - parseOrThrow: add support for custom formatters

- [#22](https://github.com/fp-ts/schema/pull/22) [`3b053d6`](https://github.com/fp-ts/schema/commit/3b053d60e4c6330484d7225b05d3996ed9777b3f) Thanks [@gcanti](https://github.com/gcanti)! - DecodeError: refactor NotType error

- [#22](https://github.com/fp-ts/schema/pull/22) [`fb85dfd`](https://github.com/fp-ts/schema/commit/fb85dfd9be5a68fabeec6b0532c841fd759be7f6) Thanks [@gcanti](https://github.com/gcanti)! - partial: add support for unions

- [#22](https://github.com/fp-ts/schema/pull/22) [`5575c59`](https://github.com/fp-ts/schema/commit/5575c591e2e5780765ee454ba3de6b53254b6aa8) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor index signatures model

- [#22](https://github.com/fp-ts/schema/pull/22) [`bf04615`](https://github.com/fp-ts/schema/commit/bf04615ffee56b51874f364a662e4395cba15a00) Thanks [@gcanti](https://github.com/gcanti)! - partial: add support for arrays

- [#22](https://github.com/fp-ts/schema/pull/22) [`0ead379`](https://github.com/fp-ts/schema/commit/0ead3790e83c12ce36e07b648be8464aa2322b1e) Thanks [@gcanti](https://github.com/gcanti)! - Schema: rename withRest to restElement

- [#22](https://github.com/fp-ts/schema/pull/22) [`974eef6`](https://github.com/fp-ts/schema/commit/974eef6f108845a5d002605f512bc59a45986370) Thanks [@gcanti](https://github.com/gcanti)! - add support for optional tuple components

## 0.0.4

### Patch Changes

- [#20](https://github.com/fp-ts/schema/pull/20) [`07e7530`](https://github.com/fp-ts/schema/commit/07e7530559f63915f1a4f54e05d0bafd070a348a) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve dependencies semver ranges

## 0.0.3

### Patch Changes

- [#18](https://github.com/fp-ts/schema/pull/18) [`45f720f`](https://github.com/fp-ts/schema/commit/45f720f1f84732850da64513d56d2d97970df6d0) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest @fp-ts/data

- [#15](https://github.com/fp-ts/schema/pull/15) [`3900a51`](https://github.com/fp-ts/schema/commit/3900a51ed0f008a36809a9378ab4555b20db958a) Thanks [@gcanti](https://github.com/gcanti)! - fix no exported members

## 0.0.2

### Patch Changes

- [#13](https://github.com/fp-ts/schema/pull/13) [`b14b23b`](https://github.com/fp-ts/schema/commit/b14b23bdc3f89404054fdb28d5ec817849cc1abb) Thanks [@gcanti](https://github.com/gcanti)! - Ditch JsonDecoder, JsonEncoder, JsonCodec, UnknownDecoder, UnknownEncoder, UnknownCodec in favour of Codec

- [#13](https://github.com/fp-ts/schema/pull/13) [`4e3e4c0`](https://github.com/fp-ts/schema/commit/4e3e4c0f63a832453779ab75543d9750e367ce02) Thanks [@gcanti](https://github.com/gcanti)! - align UnknownCodec to JsonCodec

- [#13](https://github.com/fp-ts/schema/pull/13) [`c61e688`](https://github.com/fp-ts/schema/commit/c61e688552909e2c610fc9b876135c5f1b6d9354) Thanks [@gcanti](https://github.com/gcanti)! - filters: add GreaterThan, GreaterThanOrEqualTo, LessThan, LessThanOrEqualTo

- [#13](https://github.com/fp-ts/schema/pull/13) [`c0c429a`](https://github.com/fp-ts/schema/commit/c0c429a69dd9f5a7b021bdf45f29b16417085230) Thanks [@gcanti](https://github.com/gcanti)! - add fast-check to dependencies

## 0.0.1

### Patch Changes

- [#1](https://github.com/fp-ts/schema/pull/1) [`a0dce39`](https://github.com/fp-ts/schema/commit/a0dce3915cfe00dd78c2f27b983df93fc528588d) Thanks [@gcanti](https://github.com/gcanti)! - Bootstrap

- [#10](https://github.com/fp-ts/schema/pull/10) [`a4d2860`](https://github.com/fp-ts/schema/commit/a4d28607ee7fc5819ac087b341901f4e0ab01972) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve JsonCodec API
