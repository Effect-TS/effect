# @effect/schema

## 0.7.0

### Minor Changes

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - getPropertySignatures: cannot compute property signatures for transformations

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest @effect/data @effect/io

- [#188](https://github.com/Effect-TS/schema/pull/188) [`bb31acb`](https://github.com/Effect-TS/schema/commit/bb31acbfad0bd994914937bcd9da44fe0990df9a) Thanks [@gcanti](https://github.com/gcanti)! - `partial` cannot handle refinement or transformations

## 0.6.0

### Minor Changes

- [#180](https://github.com/Effect-TS/schema/pull/180) [`25cbf46`](https://github.com/Effect-TS/schema/commit/25cbf46d62f97981534ec5c384618bc6b7af43b2) Thanks [@gcanti](https://github.com/gcanti)! - Allow symbols in Brand

### Patch Changes

- [#184](https://github.com/Effect-TS/schema/pull/184) [`b0b6423`](https://github.com/Effect-TS/schema/commit/b0b6423ae9368de246a6c0982cad8c4bbcbab2da) Thanks [@gcanti](https://github.com/gcanti)! - make optionsFromOptionals composable

- [#182](https://github.com/Effect-TS/schema/pull/182) [`f7899b7`](https://github.com/Effect-TS/schema/commit/f7899b7cbe930c133e1f764b4722df46998dfc07) Thanks [@gcanti](https://github.com/gcanti)! - optionsFromOptionals: ensure non overlapping property signatures

- [#181](https://github.com/Effect-TS/schema/pull/181) [`0062b25`](https://github.com/Effect-TS/schema/commit/0062b251cd20e4a29d75aca2287b0206c6e302a7) Thanks [@gcanti](https://github.com/gcanti)! - fix optionsFromOptionals implementation

## 0.5.0

### Minor Changes

- [#178](https://github.com/Effect-TS/schema/pull/178) [`f60341f`](https://github.com/Effect-TS/schema/commit/f60341f1c626145455c3ccd89c34b42905853bb5) Thanks [@gcanti](https://github.com/gcanti)! - merge transformEither and transformEffect into transformResult

## 0.4.0

### Minor Changes

- [#174](https://github.com/Effect-TS/schema/pull/174) [`c3a1230`](https://github.com/Effect-TS/schema/commit/c3a1230d9bd42b5779f8986e48571735b666b7a9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Only run effects when allowed

### Patch Changes

- [#172](https://github.com/Effect-TS/schema/pull/172) [`6277f5a`](https://github.com/Effect-TS/schema/commit/6277f5ac91422a3fe9584b80a184ebecc92ad610) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Optimize ParseResult conditional functions

- [#176](https://github.com/Effect-TS/schema/pull/176) [`dbb0a59`](https://github.com/Effect-TS/schema/commit/dbb0a5976bbf16e89006d435bed44cd671168215) Thanks [@gcanti](https://github.com/gcanti)! - Optimize internal validations

## 0.3.1

### Patch Changes

- [#169](https://github.com/Effect-TS/schema/pull/169) [`6b0a45f`](https://github.com/Effect-TS/schema/commit/6b0a45f5fb33bbc9db7175573544903ab65d2e07) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add back missing commits from wrong rebase.

## 0.3.0

### Minor Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - AST: remove isReversed from Transform

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - make ParseError tagged

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - ParseResult: add optional message to Type error

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - remove useless options argument from is

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Integrate Effect into Parser

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - simplify dateFromString

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Schema: add reverse API

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - rename decodeFromInput to decode and decode to parse

### Patch Changes

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add parse, parseOption, parseEither

- [#165](https://github.com/Effect-TS/schema/pull/165) [`3704121`](https://github.com/Effect-TS/schema/commit/3704121eea6fe6415d260bafb24b0afa20981b94) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - fix trim, clamp, clampBigint definition

## 0.2.1

### Patch Changes

- [#155](https://github.com/Effect-TS/schema/pull/155) [`0b86081`](https://github.com/Effect-TS/schema/commit/0b860818820d9b22ca17946175379c2334ec6a5a) Thanks [@gcanti](https://github.com/gcanti)! - fix attachPropertySignature bug ref #153

## 0.2.0

### Minor Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encodeOrThrow -> encode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: rename typeAlis to Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename `transformOrFail` to `transformEither`

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename encode -> encodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: change Refinement definition form predicate to decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - move /formatter/Tree up and rename to TreeFormatter

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/Hook module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf as Declaration

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decodeOrThrow -> decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - AST: refactor typeAlias adding decode

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename getOption -> decodeOption

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /data folder

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /annotation/AST module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - remove /index module

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - rename decode -> decodeEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - formatErrors/ should collapse trees that have a branching factor of 1

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - simplify Arbitrary implementation

### Patch Changes

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add validate, validateOption, validateEither

- [#144](https://github.com/Effect-TS/schema/pull/144) [`df9ea09`](https://github.com/Effect-TS/schema/commit/df9ea093623640a0e06cdd0147e8e7522ee05110) Thanks [@gcanti](https://github.com/gcanti)! - add encodeOption

## 0.1.0

### Minor Changes

- [#145](https://github.com/Effect-TS/schema/pull/145) [`cc05ffe`](https://github.com/Effect-TS/schema/commit/cc05ffea0f9844b58e7d3bf2e05fed6f827679e7) Thanks [@tim-smart](https://github.com/tim-smart)! - update /data to 0.4.1

### Patch Changes

- [#142](https://github.com/Effect-TS/schema/pull/142) [`bc30196`](https://github.com/Effect-TS/schema/commit/bc3019642d1c0620d82de9462d8dbd134a58c59f) Thanks [@gcanti](https://github.com/gcanti)! - add /data/Option/parseOptionals

## 0.0.5

### Patch Changes

- [#131](https://github.com/Effect-TS/schema/pull/131) [`d07b0f1`](https://github.com/Effect-TS/schema/commit/d07b0f1945d2153610e4ca2572113758af950de3) Thanks [@gcanti](https://github.com/gcanti)! - Pretty: use formatActual as default formatter

- [#134](https://github.com/Effect-TS/schema/pull/134) [`c935ff2`](https://github.com/Effect-TS/schema/commit/c935ff20d415c0baae92e113f64ac0cbb77f7d11) Thanks [@gcanti](https://github.com/gcanti)! - add BrandSchema, getOption

## 0.0.4

### Patch Changes

- [#115](https://github.com/Effect-TS/schema/pull/115) [`1555a81`](https://github.com/Effect-TS/schema/commit/1555a81fb814f612f7ad973add6e29c68f5635dc) Thanks [@gcanti](https://github.com/gcanti)! - Optimize decoding of unions using a heuristic based on literals

## 0.0.3

### Patch Changes

- [#127](https://github.com/Effect-TS/schema/pull/127) [`fd87ac6`](https://github.com/Effect-TS/schema/commit/fd87ac600e98b60da8de6d5792727e2ec8acb6dc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix release for github

## 0.0.2

### Patch Changes

- [#125](https://github.com/Effect-TS/schema/pull/125) [`41841a3`](https://github.com/Effect-TS/schema/commit/41841a379a97a80e298312d23a1985cc31336834) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - update release

## 0.0.1

### Patch Changes

- [#119](https://github.com/Effect-TS/schema/pull/119) [`62ed1b0`](https://github.com/Effect-TS/schema/commit/62ed1b0b5e7a3e91c62a40f258dbe185a8354b20) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Move to the @effect org

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor custom types

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseNumber to /data/Number

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest effect/data

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - /data/Option rename fromNullable to parseNullable

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - move parseDate to /data/Date

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - refactor instanceOf (to a constructor)

- [#120](https://github.com/Effect-TS/schema/pull/120) [`6ddb736`](https://github.com/Effect-TS/schema/commit/6ddb736161a1cadc851ac51eb5457ee8534a4ea6) Thanks [@gcanti](https://github.com/gcanti)! - Added clamp transform to Number and Bigint
