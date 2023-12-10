# effect

## 2.0.0-next.60

### Minor Changes

- [#1755](https://github.com/Effect-TS/effect/pull/1755) [`0200f12`](https://github.com/Effect-TS/effect/commit/0200f1263dcfd769ed6b381036207a583b34964c) Thanks [@gcanti](https://github.com/gcanti)! - Effect: remove `config` API (since `Config` now implements `Effect`)

- [#1747](https://github.com/Effect-TS/effect/pull/1747) [`83db34e`](https://github.com/Effect-TS/effect/commit/83db34eb4080909b3ae7536886d27870e77d8b7e) Thanks [@fubhy](https://github.com/fubhy)! - Generate proxy packages

### Patch Changes

- [#1756](https://github.com/Effect-TS/effect/pull/1756) [`7c1dcc7`](https://github.com/Effect-TS/effect/commit/7c1dcc732c735a6f3f64274be4b6daea6e9fdde6) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix stack filtering for first throw point

- [#1753](https://github.com/Effect-TS/effect/pull/1753) [`1727ca5`](https://github.com/Effect-TS/effect/commit/1727ca5011d62b5353ed7c53bf1867dc37a41954) Thanks [@IMax153](https://github.com/IMax153)! - expose Console service tag

- [#1749](https://github.com/Effect-TS/effect/pull/1749) [`299e8b5`](https://github.com/Effect-TS/effect/commit/299e8b5e085a624d1141b5fdaf00fc50203c57fa) Thanks [@IMax153](https://github.com/IMax153)! - fix the jsdoc for Effect.withConsoleScoped

- [#1758](https://github.com/Effect-TS/effect/pull/1758) [`88d957d`](https://github.com/Effect-TS/effect/commit/88d957d724b390e005fb245b9deadfcdbd4a55d1) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix provideSomeRuntime internals, restore context and flags properly

- [#1754](https://github.com/Effect-TS/effect/pull/1754) [`6a95cc0`](https://github.com/Effect-TS/effect/commit/6a95cc0f38914b63a3884697e410f79c75add185) Thanks [@tim-smart](https://github.com/tim-smart)! - make Config implement Effect

## 2.0.0-next.59

### Minor Changes

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - rename FiberRefs.updatedAs to FiberRef.updateAs

- [#1738](https://github.com/Effect-TS/effect/pull/1738) [`d4abb06`](https://github.com/Effect-TS/effect/commit/d4abb06a411cc088d1eb20d853c3a9da97d4f847) Thanks [@gcanti](https://github.com/gcanti)! - ReaonlyRecord: rename `fromIterable` to `fromIterableWith` and add standard `fromIterable` API

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - use native js data types for Metrics

### Patch Changes

- [#1733](https://github.com/Effect-TS/effect/pull/1733) [`8177e4c`](https://github.com/Effect-TS/effect/commit/8177e4cc50eba7534b794ddaabb7754641060e9b) Thanks [@IMax153](https://github.com/IMax153)! - add `withConsoleScoped` to `Console`/`Effect` modules

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of unzip

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - prefer Date.now() over new Date().getTime()

- [#1735](https://github.com/Effect-TS/effect/pull/1735) [`cf4c044`](https://github.com/Effect-TS/effect/commit/cf4c044d799ae1249084abfd59d7f2ecd4a7c755) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Layer MemoMap apis

- [#1724](https://github.com/Effect-TS/effect/pull/1724) [`1884fa3`](https://github.com/Effect-TS/effect/commit/1884fa3f18c0ae85f62af338f1ac5863ad24f778) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: fix the tacit use of flatten

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of reverse

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of dedupe

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - add FiberRefs.updateManyAs

- [#1737](https://github.com/Effect-TS/effect/pull/1737) [`9c26f58`](https://github.com/Effect-TS/effect/commit/9c26f58715c386885e25fa30662ad8c77576c22e) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: add splitNonEmptyAt

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - short circuit for empty patches

- [#1736](https://github.com/Effect-TS/effect/pull/1736) [`8249277`](https://github.com/Effect-TS/effect/commit/82492774087746a1174353480465c439388f88f4) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: add splitWhere

- [#1729](https://github.com/Effect-TS/effect/pull/1729) [`3c77e12`](https://github.com/Effect-TS/effect/commit/3c77e12d92030413e25f8a32ab84a4feb15c5164) Thanks [@jessekelly881](https://github.com/jessekelly881)! - updated BigDecimal.toString

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - Chunk > flatMap: fix return type

- [#1736](https://github.com/Effect-TS/effect/pull/1736) [`8249277`](https://github.com/Effect-TS/effect/commit/82492774087746a1174353480465c439388f88f4) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: add split

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix sortBy signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix chop signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - List > flatMap: fix return type

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - replace use of throw in fiber runtime

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize FiberRef.update/forkAs

- [#1724](https://github.com/Effect-TS/effect/pull/1724) [`1884fa3`](https://github.com/Effect-TS/effect/commit/1884fa3f18c0ae85f62af338f1ac5863ad24f778) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix the tacit use of flatten

- [#1727](https://github.com/Effect-TS/effect/pull/1727) [`9b5f72d`](https://github.com/Effect-TS/effect/commit/9b5f72d6bb9efd22f52c64c727b79f29d94507d3) Thanks [@photomoose](https://github.com/photomoose)! - Fix number of retries in retryN

- [#1735](https://github.com/Effect-TS/effect/pull/1735) [`cf4c044`](https://github.com/Effect-TS/effect/commit/cf4c044d799ae1249084abfd59d7f2ecd4a7c755) Thanks [@tim-smart](https://github.com/tim-smart)! - fix memoization of Layer.effect/scoped

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: fix dedupeWith signature

- [#1726](https://github.com/Effect-TS/effect/pull/1726) [`1152a2c`](https://github.com/Effect-TS/effect/commit/1152a2c900c43687876e042d1fc78570e48aebe0) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray > flatMap: fix return type

- [#1743](https://github.com/Effect-TS/effect/pull/1743) [`143ee1e`](https://github.com/Effect-TS/effect/commit/143ee1e58ff98c9b8813622d14ef67a0e7f76874) Thanks [@tim-smart](https://github.com/tim-smart)! - optimize MutableHashMap

- [#1745](https://github.com/Effect-TS/effect/pull/1745) [`c142caa`](https://github.com/Effect-TS/effect/commit/c142caa725646929d8086d8e63d7a406fd2415da) Thanks [@IMax153](https://github.com/IMax153)! - rename ConfigSecret to Secret

- [#1733](https://github.com/Effect-TS/effect/pull/1733) [`8177e4c`](https://github.com/Effect-TS/effect/commit/8177e4cc50eba7534b794ddaabb7754641060e9b) Thanks [@IMax153](https://github.com/IMax153)! - export `Console` combinators from the `Effect` module to match other default services

## 2.0.0-next.58

### Patch Changes

- [#1722](https://github.com/Effect-TS/effect/pull/1722) [`b5569e3`](https://github.com/Effect-TS/effect/commit/b5569e358534da41047a687afbc85dbe8517ddca) Thanks [@tim-smart](https://github.com/tim-smart)! - update build setup to put cjs in root directory

- [#1720](https://github.com/Effect-TS/effect/pull/1720) [`56a0334`](https://github.com/Effect-TS/effect/commit/56a033456c3285ff95fdbeeddff2bda6a1e39bec) Thanks [@tim-smart](https://github.com/tim-smart)! - fix jsdoc for Inspectable.format

## 2.0.0-next.57

### Minor Changes

- [#1701](https://github.com/Effect-TS/effect/pull/1701) [`739460b06`](https://github.com/Effect-TS/effect/commit/739460b0609cd490abbb0a8dfbe3dfe9f67a3680) Thanks [@fubhy](https://github.com/fubhy)! - Allow to set a custom description for timer metrics

- [#1704](https://github.com/Effect-TS/effect/pull/1704) [`accf8a647`](https://github.com/Effect-TS/effect/commit/accf8a647b7a869d2de445e430dab07f08aac0cc) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `ReadonlyArray.compact` and `ReadonlyRecord.compact` to `.getSomes`

- [#1716](https://github.com/Effect-TS/effect/pull/1716) [`023b512bd`](https://github.com/Effect-TS/effect/commit/023b512bd0b3d5a91bbe85b262e8762e5ce3ac21) Thanks [@gcanti](https://github.com/gcanti)! - List: merge NonEmpty APIs into base ones

- [#1717](https://github.com/Effect-TS/effect/pull/1717) [`869c9c31d`](https://github.com/Effect-TS/effect/commit/869c9c31de2d297bc2937ca6b0a417c10ed1a12f) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray: merge NonEmpty APIs into base ones

- [#1713](https://github.com/Effect-TS/effect/pull/1713) [`906343263`](https://github.com/Effect-TS/effect/commit/906343263f6306965602422508ef3c7158dd7cc8) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: rename `toString` to `format`

- [#1688](https://github.com/Effect-TS/effect/pull/1688) [`9698427fe`](https://github.com/Effect-TS/effect/commit/9698427fea446a08b702d3f820db96753efad638) Thanks [@tim-smart](https://github.com/tim-smart)! - replace Layer.provide* with Layer.use*

- [#1711](https://github.com/Effect-TS/effect/pull/1711) [`ff6fadb93`](https://github.com/Effect-TS/effect/commit/ff6fadb934fef37dec1f58eaeff40c0d027393bb) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: merge NonEmpty APIs into base ones

- [#1707](https://github.com/Effect-TS/effect/pull/1707) [`fb1a98fab`](https://github.com/Effect-TS/effect/commit/fb1a98fab613c7ec34abf35c348f3cadcc7d943d) Thanks [@gcanti](https://github.com/gcanti)! - Layer: rename `zipWithPar` to `zipWith` (standard)

### Patch Changes

- [#1690](https://github.com/Effect-TS/effect/pull/1690) [`eb6d7aada`](https://github.com/Effect-TS/effect/commit/eb6d7aada122b260b52e53ff2fd28bfe851b7f40) Thanks [@tim-smart](https://github.com/tim-smart)! - allow omission of Scope type in R of Stream.asyncScoped

- [#1704](https://github.com/Effect-TS/effect/pull/1704) [`accf8a647`](https://github.com/Effect-TS/effect/commit/accf8a647b7a869d2de445e430dab07f08aac0cc) Thanks [@fubhy](https://github.com/fubhy)! - Added `.getLefts` and `.getRights`

- [#1703](https://github.com/Effect-TS/effect/pull/1703) [`f8d27500d`](https://github.com/Effect-TS/effect/commit/f8d27500dae8eb23ff8b93e8b894a4ab4ec6ebad) Thanks [@jessekelly881](https://github.com/jessekelly881)! - improved Duration.toString

- [#1689](https://github.com/Effect-TS/effect/pull/1689) [`a0bd532e8`](https://github.com/Effect-TS/effect/commit/a0bd532e85fa603b29e58c6a2670433b0346377a) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - improve `Pool`'s `makeWithTTL` JSDoc example

- [#1715](https://github.com/Effect-TS/effect/pull/1715) [`8b1a7e8a1`](https://github.com/Effect-TS/effect/commit/8b1a7e8a1acddec126b4292fc24154f6df615f0a) Thanks [@tim-smart](https://github.com/tim-smart)! - only add onInterrupt in Effect.async if required

- [#1694](https://github.com/Effect-TS/effect/pull/1694) [`33ffa62b4`](https://github.com/Effect-TS/effect/commit/33ffa62b444db82afc0e43154eb4b3576761c583) Thanks [@extremegf](https://github.com/extremegf)! - Add Either.filterOrLeft

- [#1695](https://github.com/Effect-TS/effect/pull/1695) [`7ccd1eb0b`](https://github.com/Effect-TS/effect/commit/7ccd1eb0b71ec84033d2b106412ccfcac7753e4c) Thanks [@jessekelly881](https://github.com/jessekelly881)! - added Option.andThen

- [#1706](https://github.com/Effect-TS/effect/pull/1706) [`8a1e98ce3`](https://github.com/Effect-TS/effect/commit/8a1e98ce33344347f6edec0fc89c4c22d8393e90) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Improve consistency between request batching and fiber environment.

  In prior releases request batching required operators that act on fiber context such as `Effect.locally` to be aware of batching in order to avoid bugs where the effect executed post batching would lose the fiber environment (context, refs, and flags).

  This change restructure how batching internally works, inside the fiber we now slice up the stack and restore the exact context that was destroyed, by rewriting the internals of forEach batching is now transparent to any other function that deals with fiber state.

- [#1687](https://github.com/Effect-TS/effect/pull/1687) [`e4d90ed38`](https://github.com/Effect-TS/effect/commit/e4d90ed3896f6d00e8470e73e0d9f597504fc888) Thanks [@matheuspuel](https://github.com/matheuspuel)! - fix YieldableError.toString crashing on react-native

- [#1681](https://github.com/Effect-TS/effect/pull/1681) [`e5cd27c7d`](https://github.com/Effect-TS/effect/commit/e5cd27c7d5988902b238d568d6d13470babb8ee9) Thanks [@matheuspuel](https://github.com/matheuspuel)! - forbid excess properties when matching tags

- [#1692](https://github.com/Effect-TS/effect/pull/1692) [`37a7cfe94`](https://github.com/Effect-TS/effect/commit/37a7cfe94f3baa51fb465c1f6591f20d2aab5c7f) Thanks [@tim-smart](https://github.com/tim-smart)! - add PrimaryKey.value

- [#1679](https://github.com/Effect-TS/effect/pull/1679) [`c1146e473`](https://github.com/Effect-TS/effect/commit/c1146e47343a39e0d168f10547df43d0728df50d) Thanks [@k44](https://github.com/k44)! - fix error value of `Effect.tryPromise`

- [#1719](https://github.com/Effect-TS/effect/pull/1719) [`30893ed48`](https://github.com/Effect-TS/effect/commit/30893ed48592460b8bbef6388802893ed9f0f23f) Thanks [@tim-smart](https://github.com/tim-smart)! - add Request.failCause

- [#1712](https://github.com/Effect-TS/effect/pull/1712) [`e2ccf5120`](https://github.com/Effect-TS/effect/commit/e2ccf512088e0dfb0e3816ec259d4f6736f5cf28) Thanks [@thewilkybarkid](https://github.com/thewilkybarkid)! - fix ReadonlyArray.difference description

- [#1715](https://github.com/Effect-TS/effect/pull/1715) [`8b1a7e8a1`](https://github.com/Effect-TS/effect/commit/8b1a7e8a1acddec126b4292fc24154f6df615f0a) Thanks [@tim-smart](https://github.com/tim-smart)! - simplify Effect.tryCatch implementation

- [#1684](https://github.com/Effect-TS/effect/pull/1684) [`aeb33b158`](https://github.com/Effect-TS/effect/commit/aeb33b158b14ea1a28fb78954adb717019f913a1) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - change typo in Either documentation

- [#1699](https://github.com/Effect-TS/effect/pull/1699) [`06eb1d380`](https://github.com/Effect-TS/effect/commit/06eb1d3801ae6ef93412529af3ef37b509cba7ef) Thanks [@gcanti](https://github.com/gcanti)! - Config: standardize error messages

- [#1683](https://github.com/Effect-TS/effect/pull/1683) [`a6a78ccad`](https://github.com/Effect-TS/effect/commit/a6a78ccad976c510cf0d6a33eee5e10697b310da) Thanks [@tim-smart](https://github.com/tim-smart)! - add default type to data class props generic

- [#1718](https://github.com/Effect-TS/effect/pull/1718) [`3b0768ce6`](https://github.com/Effect-TS/effect/commit/3b0768ce68035fe8a2b017b736f24ab3bcce350b) Thanks [@KhraksMamtsov](https://github.com/KhraksMamtsov)! - get rid `absorb` mention

- [#1686](https://github.com/Effect-TS/effect/pull/1686) [`9f4d2874d`](https://github.com/Effect-TS/effect/commit/9f4d2874da7568eafd14c183d127132788f86668) Thanks [@gcanti](https://github.com/gcanti)! - Types: add variance helpers

- [#1697](https://github.com/Effect-TS/effect/pull/1697) [`e1a4b6a63`](https://github.com/Effect-TS/effect/commit/e1a4b6a63d73aa111015652bfe4584b767a53e61) Thanks [@tim-smart](https://github.com/tim-smart)! - expose currentConcurrency fiber ref

## 2.0.0-next.56

### Minor Changes

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - support Promise in Effect.andThen and .tap

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Cause.UnknownException and use it over `unknown`

- [#1678](https://github.com/Effect-TS/effect/pull/1678) [`8ed7626a4`](https://github.com/Effect-TS/effect/commit/8ed7626a49f1a4fb1b9315d97008355f1b6962ef) Thanks [@tim-smart](https://github.com/tim-smart)! - use `new` for Cause error constructors

### Patch Changes

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TDeferred: fix E, A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SynchronizedRef: fix A variance (from covariant to invariant)

- [#1661](https://github.com/Effect-TS/effect/pull/1661) [`6c32d12d7`](https://github.com/Effect-TS/effect/commit/6c32d12d7be5eb829dc5d8fe576f4fda8217ea6d) Thanks [@fubhy](https://github.com/fubhy)! - Use `sideEffects: []` in package.json

- [#1663](https://github.com/Effect-TS/effect/pull/1663) [`69bcb5b7a`](https://github.com/Effect-TS/effect/commit/69bcb5b7ab4c4faa873cf8132172e68fc8eb9b6d) Thanks [@tim-smart](https://github.com/tim-smart)! - add TaggedClass to /request

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support undefined values in TPubSub

- [#1658](https://github.com/Effect-TS/effect/pull/1658) [`396428a73`](https://github.com/Effect-TS/effect/commit/396428a73871715a6aed632c2c5b5affb2e509ac) Thanks [@wmaurer](https://github.com/wmaurer)! - ReadonlyArray: Improved refinement typings for partition

- [#1672](https://github.com/Effect-TS/effect/pull/1672) [`80bf68da5`](https://github.com/Effect-TS/effect/commit/80bf68da546fecf91e3ebcd43c8d4798841227df) Thanks [@tim-smart](https://github.com/tim-smart)! - add metric .register() for forcing addition to registry

- [#1669](https://github.com/Effect-TS/effect/pull/1669) [`541330b11`](https://github.com/Effect-TS/effect/commit/541330b110fc3d5f463f34cb48490e25b29036ae) Thanks [@tim-smart](https://github.com/tim-smart)! - add PrimaryKey module

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: make Key invariant

- [#1664](https://github.com/Effect-TS/effect/pull/1664) [`54ce5e638`](https://github.com/Effect-TS/effect/commit/54ce5e63882136d77b50ebe6613db4f349bb0195) Thanks [@gcanti](https://github.com/gcanti)! - PollingMetric: renamed to MetricPolling (standard)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Deferred: fix E and A variance (from covariant to invariant)

- [#1660](https://github.com/Effect-TS/effect/pull/1660) [`ecc334703`](https://github.com/Effect-TS/effect/commit/ecc3347037965df8f6e6e19423f4c0cfea7e04b7) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: swap findFirst > predicate arguments (standard)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TSet: fix A variance (from covariant to invariant)

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Auto-flattening Effect.tap

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - RequestResolver: fix A variance (from covariant to contravariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - ScopedRef: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Reloadable: fix A variance (from covariant to invariant)

- [#1660](https://github.com/Effect-TS/effect/pull/1660) [`ecc334703`](https://github.com/Effect-TS/effect/commit/ecc3347037965df8f6e6e19423f4c0cfea7e04b7) Thanks [@gcanti](https://github.com/gcanti)! - fix ReadonlyRecord.partition signature

- [#1670](https://github.com/Effect-TS/effect/pull/1670) [`c3bfc90e4`](https://github.com/Effect-TS/effect/commit/c3bfc90e4af20c2f2e8e3c663690779d4332f86e) Thanks [@tim-smart](https://github.com/tim-smart)! - add Request.Class

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Resource: fix E, A variance (from covariant to invariant)

- [#1674](https://github.com/Effect-TS/effect/pull/1674) [`c687a8701`](https://github.com/Effect-TS/effect/commit/c687a870157e1c212f29ddb3264db0200d03466e) Thanks [@fubhy](https://github.com/fubhy)! - Allow hrtime as `Duration` input

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support undefined values in TQueue

- [#1668](https://github.com/Effect-TS/effect/pull/1668) [`fc9bce6a2`](https://github.com/Effect-TS/effect/commit/fc9bce6a24b1fc46955d276ed0011a93378b3297) Thanks [@gcanti](https://github.com/gcanti)! - Config: propagate the path in validation, closes #1667

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - PubSub: fix A variance (from contravariant to invariant)

- [#1676](https://github.com/Effect-TS/effect/pull/1676) [`995318829`](https://github.com/Effect-TS/effect/commit/9953188299848a96adf637b5a90093b4cc8792f6) Thanks [@tim-smart](https://github.com/tim-smart)! - support null values in PubSub

- [#1655](https://github.com/Effect-TS/effect/pull/1655) [`0c6330db0`](https://github.com/Effect-TS/effect/commit/0c6330db0dac8264d9a9e2ca8babea01a054317a) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: revert changing methods to props (RE: #1644)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - FiberRef: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - StrategyVariance: fix A variance (from covariant to invariant)

- [#1678](https://github.com/Effect-TS/effect/pull/1678) [`8ed7626a4`](https://github.com/Effect-TS/effect/commit/8ed7626a49f1a4fb1b9315d97008355f1b6962ef) Thanks [@tim-smart](https://github.com/tim-smart)! - Cause.YieldableError extends Inspectable

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TMap: fix K, V variance (from covariant to invariant)

- [#1665](https://github.com/Effect-TS/effect/pull/1665) [`a00b920b8`](https://github.com/Effect-TS/effect/commit/a00b920b8910f975ff61be48c1538de527fa290b) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: fix partition signature (expose the index of the element)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Pool: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - Cache / ConsumerCache: fix Key variance (from contravariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SubscriptionRef: fix A variance (from covariant to invariant)

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce Types.NoInfer

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SortedSet: make A invariant

- [#1654](https://github.com/Effect-TS/effect/pull/1654) [`d2b7e0ef0`](https://github.com/Effect-TS/effect/commit/d2b7e0ef022234ceba0c3b77afdc3285081ece97) Thanks [@wmaurer](https://github.com/wmaurer)! - Added refinement overloads to Sink.collectAllWhile, Stream.partition and Stream.takeWhile. Added dtslint tests for Sink and Stream functions with refinement overloads

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: make K invariant

- [#1603](https://github.com/Effect-TS/effect/pull/1603) [`4e7a6912c`](https://github.com/Effect-TS/effect/commit/4e7a6912c782571f07a055eccae8aa973b4b5c6f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Introduce Effect.andThen

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TArray: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - KeyedPool: fix A variance (from covariant to invariant)

- [#1662](https://github.com/Effect-TS/effect/pull/1662) [`aa6787e16`](https://github.com/Effect-TS/effect/commit/aa6787e166ba51511de0ff96dbfd986f1c974f2d) Thanks [@gcanti](https://github.com/gcanti)! - TPubSub: make A invariant

- [#1671](https://github.com/Effect-TS/effect/pull/1671) [`c415248cd`](https://github.com/Effect-TS/effect/commit/c415248cd8e5a01144a0c9135da58cb0b0afc37d) Thanks [@tim-smart](https://github.com/tim-smart)! - move internal exceptions into core

## 2.0.0-next.55

### Patch Changes

- [#1648](https://github.com/Effect-TS/effect/pull/1648) [`b2cbb6a79`](https://github.com/Effect-TS/effect/commit/b2cbb6a7946590411ce2d48df19c1b4795415945) Thanks [@gcanti](https://github.com/gcanti)! - Cause: fix exception constructors (should respect `exactOptionalPropertyTypes: true` when creating `message` prop)

- [#1613](https://github.com/Effect-TS/effect/pull/1613) [`2dee48696`](https://github.com/Effect-TS/effect/commit/2dee48696b70abde7dffea2a52f98dd0306f3649) Thanks [@gcanti](https://github.com/gcanti)! - Types: add Mutable helper

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - SortedSet: make fromIterable dual

- [#1608](https://github.com/Effect-TS/effect/pull/1608) [`a9082c91c`](https://github.com/Effect-TS/effect/commit/a9082c91c2e64864b8e8f573362f62462490a5df) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix off-by-one in Random.shuffle

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add entries

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TSet: replace toReadonlyArray with toArray

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: rename reduceWithIndex / reduceWithIndexSTM to reduce / reduceSTM

- [#1649](https://github.com/Effect-TS/effect/pull/1649) [`a3cda801a`](https://github.com/Effect-TS/effect/commit/a3cda801a8f8491ecc5286efa1364d9169a76aa5) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: replace 0-arity functions with values

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: removeIf returns `Array<[K, V]>` instead of `Array<readonly [K, V]>`

- [#1642](https://github.com/Effect-TS/effect/pull/1642) [`b2fdff3b8`](https://github.com/Effect-TS/effect/commit/b2fdff3b83d566c37a499fa58f9f1492f8219e0f) Thanks [@gcanti](https://github.com/gcanti)! - TMap: merge removeIf / removeIfDiscard, retainIf / retainIf (`{ discard: boolean }` optional argument)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Duration: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: replace toReadonlyMap with toMap

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Duration: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1638](https://github.com/Effect-TS/effect/pull/1638) [`4eedf057b`](https://github.com/Effect-TS/effect/commit/4eedf057b38c09ea1a6bc5b85c886edb02681d54) Thanks [@gcanti](https://github.com/gcanti)! - Predicate: exclude functions from `isRecord`

- [#1645](https://github.com/Effect-TS/effect/pull/1645) [`d2e15f377`](https://github.com/Effect-TS/effect/commit/d2e15f377f55fb4a3f2114bd148f5e7eba52643a) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.withSpanAnnotations

- [#1611](https://github.com/Effect-TS/effect/pull/1611) [`8b22648aa`](https://github.com/Effect-TS/effect/commit/8b22648aa8153d31c2435c62e826e3211b2e2cd7) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure pool acquire is interruptible when allocated dynamically

- [#1642](https://github.com/Effect-TS/effect/pull/1642) [`b2fdff3b8`](https://github.com/Effect-TS/effect/commit/b2fdff3b83d566c37a499fa58f9f1492f8219e0f) Thanks [@gcanti](https://github.com/gcanti)! - TSet: merge removeIf / removeIfDiscard, retainIf / retainIf (`{ discard: boolean }` optional argument)

- [#1647](https://github.com/Effect-TS/effect/pull/1647) [`82006f69b`](https://github.com/Effect-TS/effect/commit/82006f69b9af9bc70a06ee1abfdc9c24777025c6) Thanks [@gcanti](https://github.com/gcanti)! - turn on exactOptionalPropertyTypes

- [#1626](https://github.com/Effect-TS/effect/pull/1626) [`2e99983ef`](https://github.com/Effect-TS/effect/commit/2e99983ef3e3cf5884c831e8b25d94f4846f739a) Thanks [@gcanti](https://github.com/gcanti)! - Fix Ref Variance

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: add toArray

- [#1619](https://github.com/Effect-TS/effect/pull/1619) [`66e6939ea`](https://github.com/Effect-TS/effect/commit/66e6939ea0f124c0a9c672ab5d8db7dc9d4ccaa2) Thanks [@gcanti](https://github.com/gcanti)! - remove readonly tuples from return type when possible

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Order: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: replace toArray with toChunk

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: change entries to return IterableIterator<[K, V]>

- [#1644](https://github.com/Effect-TS/effect/pull/1644) [`6e2c84d4c`](https://github.com/Effect-TS/effect/commit/6e2c84d4c3b618e355b2ef9141cef973da4768b9) Thanks [@gcanti](https://github.com/gcanti)! - interfaces: add readonly modifiers when missing and remove bivariance by changing methods to props

- [#1607](https://github.com/Effect-TS/effect/pull/1607) [`e7101ef05`](https://github.com/Effect-TS/effect/commit/e7101ef05125f3fc60ee5e3717eda30b6fa05c4d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Remove potentially offenive language

- [#1639](https://github.com/Effect-TS/effect/pull/1639) [`b27958bc5`](https://github.com/Effect-TS/effect/commit/b27958bc5206b4bdb5bcc0032041df6846f6ebbf) Thanks [@gcanti](https://github.com/gcanti)! - Match: fix record signature (remove any from the codomain)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - List: replace toReadonlyArray with toArray

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - SortedMap: make fromIterable dual

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Number: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TSet: fix toChunk (was returning an array)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Number: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigInt: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigInt: refactor `clamp` with an `options` argument for `minimum` and `maximum` (standard)

- [#1617](https://github.com/Effect-TS/effect/pull/1617) [`79719018b`](https://github.com/Effect-TS/effect/commit/79719018b327bc457a300a6b484eca58192633fb) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add toEntries

- [#1641](https://github.com/Effect-TS/effect/pull/1641) [`f0a4bf430`](https://github.com/Effect-TS/effect/commit/f0a4bf430c0d723e4d6e3f3fb48dcc7118338653) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: fix bug in Hash and Equal implementation

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: fix toChunk (was returning an array)

- [#1606](https://github.com/Effect-TS/effect/pull/1606) [`265f60842`](https://github.com/Effect-TS/effect/commit/265f608424c50d7bc9eac74e551db6d8db66cdb2) Thanks [@tim-smart](https://github.com/tim-smart)! - add Logger.mapInputOptions

- [#1632](https://github.com/Effect-TS/effect/pull/1632) [`c86f87c1b`](https://github.com/Effect-TS/effect/commit/c86f87c1b7923ae8e66bb99d9282b35f38e16774) Thanks [@gcanti](https://github.com/gcanti)! - Either: rename `reverse` to `flip` (to align with `Effect.flip`)

- [#1599](https://github.com/Effect-TS/effect/pull/1599) [`c3cb2dff7`](https://github.com/Effect-TS/effect/commit/c3cb2dff73f2e7293ab937bb6978995fb23d2547) Thanks [@gcanti](https://github.com/gcanti)! - add Refinement overloading to Effect.loop

- [#1638](https://github.com/Effect-TS/effect/pull/1638) [`4eedf057b`](https://github.com/Effect-TS/effect/commit/4eedf057b38c09ea1a6bc5b85c886edb02681d54) Thanks [@gcanti](https://github.com/gcanti)! - Match: add `symbol` predicate

- [#1640](https://github.com/Effect-TS/effect/pull/1640) [`9ea7edf77`](https://github.com/Effect-TS/effect/commit/9ea7edf775acc05b5a763310e6c4afecfda7a52c) Thanks [@gcanti](https://github.com/gcanti)! - fix link in "please report an issue..." message

- [#1597](https://github.com/Effect-TS/effect/pull/1597) [`38643141d`](https://github.com/Effect-TS/effect/commit/38643141d55cdd8f47c96904a199f218bd890037) Thanks [@gcanti](https://github.com/gcanti)! - add Refinement overloading to Effect.iterate, closes #1596

- [#1621](https://github.com/Effect-TS/effect/pull/1621) [`33c06822d`](https://github.com/Effect-TS/effect/commit/33c06822d7b415849b29c2cd04f4b96f7e001557) Thanks [@gcanti](https://github.com/gcanti)! - RedBlackTree: make fromIterable dual

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - Order: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: retainIf returns `Array<[K, V]>` instead of `Array<readonly [K, V]>`

- [#1630](https://github.com/Effect-TS/effect/pull/1630) [`67025357e`](https://github.com/Effect-TS/effect/commit/67025357e9c705cf68d9b7e8ffb942f567720e88) Thanks [@gcanti](https://github.com/gcanti)! - Tuple: rename `tuple` to `make` (standard)

- [#1628](https://github.com/Effect-TS/effect/pull/1628) [`ba1aa04a8`](https://github.com/Effect-TS/effect/commit/ba1aa04a8cf3ef98fb7444bcdff2196a22709736) Thanks [@gcanti](https://github.com/gcanti)! - TPriorityQueue: replace toReadonlyArray with toArray

- [#1625](https://github.com/Effect-TS/effect/pull/1625) [`cc9a03ac7`](https://github.com/Effect-TS/effect/commit/cc9a03ac7029b10b4fef838a3329962ad53c7936) Thanks [@gcanti](https://github.com/gcanti)! - TMap: replace toReadonlyArray with toArray

- [#1631](https://github.com/Effect-TS/effect/pull/1631) [`af2854596`](https://github.com/Effect-TS/effect/commit/af2854596854ec6bf9e1d1dbe24535ed2a772430) Thanks [@gcanti](https://github.com/gcanti)! - BigDecimal: refactor `between` with an `options` argument for `minimum` and `maximum` (standard)

## 2.0.0-next.54

### Patch Changes

- [#1594](https://github.com/Effect-TS/effect/pull/1594) [`a3a31c722`](https://github.com/Effect-TS/effect/commit/a3a31c722dbf006f612f5909ff9b1a1f2d99c050) Thanks [@tim-smart](https://github.com/tim-smart)! - fix regression in process.hrtime detection

## 2.0.0-next.53

### Minor Changes

- [#1562](https://github.com/Effect-TS/effect/pull/1562) [`0effd559e`](https://github.com/Effect-TS/effect/commit/0effd559e510a435eae98b201226515dfbc5fc2e) Thanks [@tim-smart](https://github.com/tim-smart)! - rename RequestResolver.fromFunctionEffect to fromEffect

- [#1564](https://github.com/Effect-TS/effect/pull/1564) [`0eb0605b8`](https://github.com/Effect-TS/effect/commit/0eb0605b89a095242093539e70cc91976e541f83) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate state by version and check for version correctness

### Patch Changes

- [#1586](https://github.com/Effect-TS/effect/pull/1586) [`3ed4997c6`](https://github.com/Effect-TS/effect/commit/3ed4997c667f462371f26f650ac51fe533e3c044) Thanks [@leonitousconforti](https://github.com/leonitousconforti)! - Fix List.map implementation of the index parameter and removed the index parameter from List.flatMapNonEmpty

- [#1593](https://github.com/Effect-TS/effect/pull/1593) [`92f7316a2`](https://github.com/Effect-TS/effect/commit/92f7316a2f847582146c77b2b83bf65046bf0231) Thanks [@tim-smart](https://github.com/tim-smart)! - fix timeOrigin polyfill in clock

- [#1568](https://github.com/Effect-TS/effect/pull/1568) [`a51fb6d80`](https://github.com/Effect-TS/effect/commit/a51fb6d80d22c912157b862432ee0ca5e0d14caa) Thanks [@tim-smart](https://github.com/tim-smart)! - add Stream.accumulate

- [#1592](https://github.com/Effect-TS/effect/pull/1592) [`57d8f1792`](https://github.com/Effect-TS/effect/commit/57d8f17924e91e10617753382a91a3136043b421) Thanks [@gcanti](https://github.com/gcanti)! - Predicate: add hasProperty (+ internal refactoring to leverage it)

- [#1562](https://github.com/Effect-TS/effect/pull/1562) [`0effd559e`](https://github.com/Effect-TS/effect/commit/0effd559e510a435eae98b201226515dfbc5fc2e) Thanks [@tim-smart](https://github.com/tim-smart)! - add RequestResolver.fromEffectTagged

- [#1588](https://github.com/Effect-TS/effect/pull/1588) [`7c9d15c25`](https://github.com/Effect-TS/effect/commit/7c9d15c25f23f79ab4e7777a3b656119234586f9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix fiber failure stack

- [#1568](https://github.com/Effect-TS/effect/pull/1568) [`a51fb6d80`](https://github.com/Effect-TS/effect/commit/a51fb6d80d22c912157b862432ee0ca5e0d14caa) Thanks [@tim-smart](https://github.com/tim-smart)! - add Stream.accumulateChunks

- [#1585](https://github.com/Effect-TS/effect/pull/1585) [`e0ef64102`](https://github.com/Effect-TS/effect/commit/e0ef64102b05c874e844f680f53746821609e1b6) Thanks [@gcanti](https://github.com/gcanti)! - Chunk: getEquivalence, resolve index out-of-bounds error when comparing chunks of different lengths

## 2.0.0-next.52

### Patch Changes

- [#1565](https://github.com/Effect-TS/effect/pull/1565) [`98de6fe6e`](https://github.com/Effect-TS/effect/commit/98de6fe6e0cb89750cbc4ca795a880c56488a1e8) Thanks [@tim-smart](https://github.com/tim-smart)! - fix support for optional props in Data classes

## 2.0.0-next.51

### Minor Changes

- [#1560](https://github.com/Effect-TS/effect/pull/1560) [`1395dc58c`](https://github.com/Effect-TS/effect/commit/1395dc58c9d1b384d22411722eff7aeeec129d36) Thanks [@tim-smart](https://github.com/tim-smart)! - use Proxy for TaggedEnum constructors

### Patch Changes

- [#1555](https://github.com/Effect-TS/effect/pull/1555) [`62140675c`](https://github.com/Effect-TS/effect/commit/62140675cd0b36d203b1d8fa94ea9f1732881488) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyArray / List / Chunk: merge mapNonEmpty with map

- [#1559](https://github.com/Effect-TS/effect/pull/1559) [`6114c3893`](https://github.com/Effect-TS/effect/commit/6114c38936d650238172f09358e82a4af21200cb) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Avoid relying on captureStackTrace for Data.Error

- [#1528](https://github.com/Effect-TS/effect/pull/1528) [`b45b7e452`](https://github.com/Effect-TS/effect/commit/b45b7e452681dfece0db4a85265c56cef149d721) Thanks [@fubhy](https://github.com/fubhy)! - Added BigDecimal module

- [#1554](https://github.com/Effect-TS/effect/pull/1554) [`fe7d7c28b`](https://github.com/Effect-TS/effect/commit/fe7d7c28bb6cdbffe8af5b927e95eea8fec2d4d6) Thanks [@sukovanej](https://github.com/sukovanej)! - Fix `Struct.omit` and `Struct.pick` return types.

- [#1547](https://github.com/Effect-TS/effect/pull/1547) [`c0569f8fe`](https://github.com/Effect-TS/effect/commit/c0569f8fe91707c2088adebd86562ec455a62bab) Thanks [@gcanti](https://github.com/gcanti)! - Data: improve DX (displayed types)

  Previously, the displayed types of data used the Omit type to exclude certain fields.
  This commit removes the use of Omit from the displayed types of data. This makes the types simpler and easier to understand.
  It also enforces all fields as readonly.

- [#1549](https://github.com/Effect-TS/effect/pull/1549) [`f82208687`](https://github.com/Effect-TS/effect/commit/f82208687e04fe191f8c18a56ceb10eb61376152) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix missing globalValue in Logger and Query

- [#1557](https://github.com/Effect-TS/effect/pull/1557) [`15013f707`](https://github.com/Effect-TS/effect/commit/15013f7078358ccaf10f9a89b1d36df14b758a88) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Allow optional parameters to be used in TaggedEnum

## 2.0.0-next.50

### Minor Changes

- [#1526](https://github.com/Effect-TS/effect/pull/1526) [`656955944`](https://github.com/Effect-TS/effect/commit/6569559440e8304c596edaaa21bcae4c8dba2568) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: remove useless alias toArray

- [#1539](https://github.com/Effect-TS/effect/pull/1539) [`9c7dea219`](https://github.com/Effect-TS/effect/commit/9c7dea219ded2cb86a2a33d6ab98a629a891e365) Thanks [@tim-smart](https://github.com/tim-smart)! - remove sampled from span options

- [#1530](https://github.com/Effect-TS/effect/pull/1530) [`7c3a6d59d`](https://github.com/Effect-TS/effect/commit/7c3a6d59de642a3691dff525bca981e5f6c05cd1) Thanks [@fubhy](https://github.com/fubhy)! - Change `divide` return type to `Option` and added a `unsafeDivide` operation that throws in case the divisor is `0`

- [#1535](https://github.com/Effect-TS/effect/pull/1535) [`fd296a6d5`](https://github.com/Effect-TS/effect/commit/fd296a6d5206b1e4c072bad675f2f6a70b60a7f8) Thanks [@tim-smart](https://github.com/tim-smart)! - use context for tracer spans

- [#1534](https://github.com/Effect-TS/effect/pull/1534) [`fb26bb770`](https://github.com/Effect-TS/effect/commit/fb26bb7707e7599a70892f06e485065e331b63e3) Thanks [@fubhy](https://github.com/fubhy)! - Removed optional math variants

### Patch Changes

- [#1537](https://github.com/Effect-TS/effect/pull/1537) [`9bd70154b`](https://github.com/Effect-TS/effect/commit/9bd70154b62c2f101b85a8d509e480d5281abe4b) Thanks [@patroza](https://github.com/patroza)! - fix: Either/Option gen when no yield executes, just a plain return

- [#1526](https://github.com/Effect-TS/effect/pull/1526) [`656955944`](https://github.com/Effect-TS/effect/commit/6569559440e8304c596edaaa21bcae4c8dba2568) Thanks [@gcanti](https://github.com/gcanti)! - ReadonlyRecord: add missing APIs:

  - keys
  - values
  - upsert
  - update
  - isSubrecord
  - isSubrecordBy
  - reduce
  - every
  - some
  - union
  - intersection
  - difference
  - getEquivalence
  - singleton

- [#1536](https://github.com/Effect-TS/effect/pull/1536) [`80800bfb0`](https://github.com/Effect-TS/effect/commit/80800bfb044585c836b8af585946881f2160ebb1) Thanks [@fubhy](https://github.com/fubhy)! - avoid use of bigint literals

## 2.0.0-next.49

### Patch Changes

- [#1517](https://github.com/Effect-TS/effect/pull/1517) [`685a645b9`](https://github.com/Effect-TS/effect/commit/685a645b940f7785d8c1020eeaff1591bbb19535) Thanks [@tim-smart](https://github.com/tim-smart)! - fix off-by-one bug in Stream.fromIterable

- [#1489](https://github.com/Effect-TS/effect/pull/1489) [`c2a11978f`](https://github.com/Effect-TS/effect/commit/c2a11978f9e3e7ce9df89715770a0fee564e1422) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - Add `Chunk.mapNonEmpty`

- [#1516](https://github.com/Effect-TS/effect/pull/1516) [`ccbb23ba3`](https://github.com/Effect-TS/effect/commit/ccbb23ba3b52d6920f77d69809f46cd172be98cb) Thanks [@tim-smart](https://github.com/tim-smart)! - export Channel.suspend

- [#1511](https://github.com/Effect-TS/effect/pull/1511) [`35ecb915a`](https://github.com/Effect-TS/effect/commit/35ecb915a56ff46580747f66cf69fb1b7c0c0061) Thanks [@tim-smart](https://github.com/tim-smart)! - improve Cause toJSON output

- [#1489](https://github.com/Effect-TS/effect/pull/1489) [`c2a11978f`](https://github.com/Effect-TS/effect/commit/c2a11978f9e3e7ce9df89715770a0fee564e1422) Thanks [@FedericoBiccheddu](https://github.com/FedericoBiccheddu)! - Add `List.mapNonEmpty`

- [#1519](https://github.com/Effect-TS/effect/pull/1519) [`43fdc45bf`](https://github.com/Effect-TS/effect/commit/43fdc45bfd9e81797b64e62af98fc9adc629151f) Thanks [@gcanti](https://github.com/gcanti)! - HashMap: add Key, Value type-level helpers

- [#1525](https://github.com/Effect-TS/effect/pull/1525) [`f710599df`](https://github.com/Effect-TS/effect/commit/f710599df73d10b9b73bb1890fadd300f52829de) Thanks [@ahrjarrett](https://github.com/ahrjarrett)! - removes unnecessary type parameter from TaggedEnum

- [#1521](https://github.com/Effect-TS/effect/pull/1521) [`2db755525`](https://github.com/Effect-TS/effect/commit/2db7555256e6bfd4420cb71251c386c355ded40f) Thanks [@ahrjarrett](https://github.com/ahrjarrett)! - enforce that members passed to TaggedEnum do not have a `_tag` property themselves

- [#1529](https://github.com/Effect-TS/effect/pull/1529) [`df512220e`](https://github.com/Effect-TS/effect/commit/df512220ee21876621d6c966f1732477b4eac796) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Channel.mergeAllWith unbounded concurrency

## 2.0.0-next.48

### Minor Changes

- [#1484](https://github.com/Effect-TS/effect/pull/1484) [`4cdc1ebc6`](https://github.com/Effect-TS/effect/commit/4cdc1ebc6072db7e0038473b96c596759bff7601) Thanks [@fubhy](https://github.com/fubhy)! - Renamed `Bigint` to `BigInt`

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - Allow log annotations to be any object.

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - move Effect.set\* Layer apis to the Layer module

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - add sampled flag to spans

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor Effect span apis

### Patch Changes

- [#1504](https://github.com/Effect-TS/effect/pull/1504) [`f186416b9`](https://github.com/Effect-TS/effect/commit/f186416b9108a409eae23870129b1261ef2cc41c) Thanks [@kutyel](https://github.com/kutyel)! - feat: add `ap` method to `Effect`, `ap` and `zipWith` to `Either` ⚡️

- [#1507](https://github.com/Effect-TS/effect/pull/1507) [`2397b5548`](https://github.com/Effect-TS/effect/commit/2397b5548b957b32acdb5baf091295babe5b36e9) Thanks [@tim-smart](https://github.com/tim-smart)! - allow message property on Data YieldableError

- [#1501](https://github.com/Effect-TS/effect/pull/1501) [`4ca2abd06`](https://github.com/Effect-TS/effect/commit/4ca2abd06ee5e7c51abf77b094adab871693bdd5) Thanks [@tim-smart](https://github.com/tim-smart)! - add Match module

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - allow tracing attributes to be unknown

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - add onEnd finalizer to Layer span apis

- [#1503](https://github.com/Effect-TS/effect/pull/1503) [`6a928e49f`](https://github.com/Effect-TS/effect/commit/6a928e49f18355fdd6e82dc1b9f40f29c7aab639) Thanks [@VenomAV](https://github.com/VenomAV)! - Fix Stream.groupAdjacentBy when group spans multiple chunks

- [#1500](https://github.com/Effect-TS/effect/pull/1500) [`8c81e5830`](https://github.com/Effect-TS/effect/commit/8c81e58303efeb9fe408b889da6c74e3be672053) Thanks [@sukovanej](https://github.com/sukovanej)! - add Tracer.externalSpan constructor

- [#1506](https://github.com/Effect-TS/effect/pull/1506) [`a4fbb7055`](https://github.com/Effect-TS/effect/commit/a4fbb705527aef50a27508825ceb31d69fc5f67d) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.withParentSpan api

- [#1507](https://github.com/Effect-TS/effect/pull/1507) [`2397b5548`](https://github.com/Effect-TS/effect/commit/2397b5548b957b32acdb5baf091295babe5b36e9) Thanks [@tim-smart](https://github.com/tim-smart)! - add name getter to YieldableError

## 2.0.0-next.47

### Minor Changes

- [#1495](https://github.com/Effect-TS/effect/pull/1495) [`01c479f0c`](https://github.com/Effect-TS/effect/commit/01c479f0c86d99344c0a5625bdc2c5564915d512) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Support rendezvous-like behaviour in Queue.bounded

## 2.0.0-next.46

### Minor Changes

- [#1483](https://github.com/Effect-TS/effect/pull/1483) [`e68453bf4`](https://github.com/Effect-TS/effect/commit/e68453bf457f32502e5cd47273c298fb24f2feb0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Include stack in Data.Error/Data.TaggedError

- [#1483](https://github.com/Effect-TS/effect/pull/1483) [`e68453bf4`](https://github.com/Effect-TS/effect/commit/e68453bf457f32502e5cd47273c298fb24f2feb0) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Include Error module in Data

### Patch Changes

- [#1487](https://github.com/Effect-TS/effect/pull/1487) [`bd1748406`](https://github.com/Effect-TS/effect/commit/bd17484068436d0b605c179e47ad63cdbdfb39b0) Thanks [@fubhy](https://github.com/fubhy)! - Added bigint math functions for `abs`, `sqrt`, `lcm` and `gcd`

- [#1491](https://github.com/Effect-TS/effect/pull/1491) [`6ff77385c`](https://github.com/Effect-TS/effect/commit/6ff77385c43e049fc864719574ced3691969c3f8) Thanks [@tim-smart](https://github.com/tim-smart)! - fix Layer.withSpan optional args

- [#1492](https://github.com/Effect-TS/effect/pull/1492) [`471b5172b`](https://github.com/Effect-TS/effect/commit/471b5172bda5d29c4104414b4017f36a45b431c7) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure more failures are annotated with spans

## 2.0.0-next.45

### Patch Changes

- [#1465](https://github.com/Effect-TS/effect/pull/1465) [`10a8fb9fe`](https://github.com/Effect-TS/effect/commit/10a8fb9fe513b219e678da71ebe80ce7ce61dd68) Thanks [@tim-smart](https://github.com/tim-smart)! - add incremental only counters

- [#1472](https://github.com/Effect-TS/effect/pull/1472) [`1c56aa9c1`](https://github.com/Effect-TS/effect/commit/1c56aa9c1b267faea5f48e0f126cac579c30ae24) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to build-utils prepare-v1

- [#1480](https://github.com/Effect-TS/effect/pull/1480) [`c31de5410`](https://github.com/Effect-TS/effect/commit/c31de54105a42a7d27f5db797f1993b463fd7b66) Thanks [@tim-smart](https://github.com/tim-smart)! - refactor Effectable and Streamable public api

- [#1463](https://github.com/Effect-TS/effect/pull/1463) [`8932e9b26`](https://github.com/Effect-TS/effect/commit/8932e9b264f85233069407e884b951bc87c159d4) Thanks [@gcanti](https://github.com/gcanti)! - Rename Hub to PubSub, closes #1462

- [#1455](https://github.com/Effect-TS/effect/pull/1455) [`c3e99ce56`](https://github.com/Effect-TS/effect/commit/c3e99ce5677ba0092e598624f7234d489f48e131) Thanks [@TylorS](https://github.com/TylorS)! - add Streamable for creating custom Streams

- [#1465](https://github.com/Effect-TS/effect/pull/1465) [`10a8fb9fe`](https://github.com/Effect-TS/effect/commit/10a8fb9fe513b219e678da71ebe80ce7ce61dd68) Thanks [@tim-smart](https://github.com/tim-smart)! - add bigint counter & gauge metrics

- [#1473](https://github.com/Effect-TS/effect/pull/1473) [`6c967c9bc`](https://github.com/Effect-TS/effect/commit/6c967c9bc7c6279af201ea205432d62b2a1764be) Thanks [@tim-smart](https://github.com/tim-smart)! - support records in Effect.tagMetrics

- [#1480](https://github.com/Effect-TS/effect/pull/1480) [`c31de5410`](https://github.com/Effect-TS/effect/commit/c31de54105a42a7d27f5db797f1993b463fd7b66) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Effect prototype objects in Effectable module

## 2.0.0-next.44

### Patch Changes

- [#1469](https://github.com/Effect-TS/effect/pull/1469) [`5a217ac18`](https://github.com/Effect-TS/effect/commit/5a217ac1842252636d4e529baa191ea0778e42ce) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Fix yield loop

## 2.0.0-next.43

### Patch Changes

- [#1467](https://github.com/Effect-TS/effect/pull/1467) [`7e258a9c1`](https://github.com/Effect-TS/effect/commit/7e258a9c1fabeeb9319cb50655a0221bd1e38ac8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Attempt at resolving TS issue with module discovery

## 2.0.0-next.42

### Patch Changes

- [#1466](https://github.com/Effect-TS/effect/pull/1466) [`31c4068fe`](https://github.com/Effect-TS/effect/commit/31c4068fe830797162c554a57ec3e6cec8c4a834) Thanks [@tim-smart](https://github.com/tim-smart)! - ensure all fiber refs are wrapped with globalValue

- [#1459](https://github.com/Effect-TS/effect/pull/1459) [`e8fb7f73b`](https://github.com/Effect-TS/effect/commit/e8fb7f73bd3cbdb663585de1d8d3b196a9cbec98) Thanks [@fubhy](https://github.com/fubhy)! - Fix binding issue in timeout module

- [#1466](https://github.com/Effect-TS/effect/pull/1466) [`31c4068fe`](https://github.com/Effect-TS/effect/commit/31c4068fe830797162c554a57ec3e6cec8c4a834) Thanks [@tim-smart](https://github.com/tim-smart)! - fix comparisons by reference

- [#1461](https://github.com/Effect-TS/effect/pull/1461) [`90210ba28`](https://github.com/Effect-TS/effect/commit/90210ba28a6b078087a4d4c7b26b1b578e920476) Thanks [@gcanti](https://github.com/gcanti)! - Error: rename Tagged to TaggedClass (to align with the naming convention in the Data module)

## 2.0.0-next.41

### Patch Changes

- [#1456](https://github.com/Effect-TS/effect/pull/1456) [`4bc30e5ff`](https://github.com/Effect-TS/effect/commit/4bc30e5ff0db46f7920cedeb9254bb09c50a5875) Thanks [@tim-smart](https://github.com/tim-smart)! - re-add types field to exports in package.json

## 2.0.0-next.40

### Patch Changes

- [#1454](https://github.com/Effect-TS/effect/pull/1454) [`0a9afd299`](https://github.com/Effect-TS/effect/commit/0a9afd299aeb265f09d46f203294db5d970cf903) Thanks [@tim-smart](https://github.com/tim-smart)! - add Layer.withSpan

- [#1451](https://github.com/Effect-TS/effect/pull/1451) [`44ea13d9c`](https://github.com/Effect-TS/effect/commit/44ea13d9c7dc57b94b1fe73984b0a62a05994cfe) Thanks [@fubhy](https://github.com/fubhy)! - Move types export condition to the top

## 2.0.0-next.39

### Patch Changes

- [#1446](https://github.com/Effect-TS/effect/pull/1446) [`3f6f23149`](https://github.com/Effect-TS/effect/commit/3f6f23149d50ac63b94bbf452353156899750f7c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add sideEffects to package json

- [#1445](https://github.com/Effect-TS/effect/pull/1445) [`52626a538`](https://github.com/Effect-TS/effect/commit/52626a538693be17667d9f5d28b632215d0e714f) Thanks [@gcanti](https://github.com/gcanti)! - Duration: add toSeconds

- [#1450](https://github.com/Effect-TS/effect/pull/1450) [`713337c7c`](https://github.com/Effect-TS/effect/commit/713337c7c8eb55e50dcfe538c40dace280aee3f8) Thanks [@fubhy](https://github.com/fubhy)! - Hotfix type condition in package.json exports

- [#1449](https://github.com/Effect-TS/effect/pull/1449) [`8f74d671d`](https://github.com/Effect-TS/effect/commit/8f74d671db4018156831e8305876360ec7d1ee3f) Thanks [@tim-smart](https://github.com/tim-smart)! - add preserveModules patch for preconstruct

## 2.0.0-next.38

### Patch Changes

- [#1442](https://github.com/Effect-TS/effect/pull/1442) [`c5e4a2390`](https://github.com/Effect-TS/effect/commit/c5e4a2390168b335307004a6e5623e53bd22734e) Thanks [@tim-smart](https://github.com/tim-smart)! - add top level exports from Function

## 2.0.0-next.37

### Minor Changes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Switch on \_op to allow for yieldable tagged errors

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Unify ecosystem packages

### Patch Changes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add Error module for creating error classes

- [#1434](https://github.com/Effect-TS/effect/pull/1434) [`61b95aefe`](https://github.com/Effect-TS/effect/commit/61b95aefede7c01e00aa05e56b5f65c11736a4fd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - add Effectable module for creating custom Effect's

## 2.0.0-next.36

### Patch Changes

- [#1436](https://github.com/Effect-TS/effect/pull/1436) [`f7cb1b8be`](https://github.com/Effect-TS/effect/commit/f7cb1b8be7dd961cbe7def7210bfac876c7f95db) Thanks [@fubhy](https://github.com/fubhy)! - update dependencies

## 2.0.0-next.35

### Patch Changes

- [#1435](https://github.com/Effect-TS/effect/pull/1435) [`f197821b7`](https://github.com/Effect-TS/effect/commit/f197821b7faa3796a861f4c2d14ce6605ba12234) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

- [#1432](https://github.com/Effect-TS/effect/pull/1432) [`b8b11c5a5`](https://github.com/Effect-TS/effect/commit/b8b11c5a5aee53e880d6f205fc19027b771966f0) Thanks [@gcanti](https://github.com/gcanti)! - move FiberRefsPatch from FiberRefs module to its own module

## 2.0.0-next.34

### Patch Changes

- [#1428](https://github.com/Effect-TS/effect/pull/1428) [`d77e66834`](https://github.com/Effect-TS/effect/commit/d77e668346db402374e9a28a5f00840e75679387) Thanks [@gcanti](https://github.com/gcanti)! - expose /stm THub module

## 2.0.0-next.33

### Patch Changes

- [#1426](https://github.com/Effect-TS/effect/pull/1426) [`92af22066`](https://github.com/Effect-TS/effect/commit/92af220665261946a440b62e283e3772e4c5fa72) Thanks [@tim-smart](https://github.com/tim-smart)! - expose /data GlobalValue & Types modules

## 2.0.0-next.32

### Patch Changes

- [#1422](https://github.com/Effect-TS/effect/pull/1422) [`89759cc0c`](https://github.com/Effect-TS/effect/commit/89759cc0c934248ae3ecb0c394f5b1e0917b423f) Thanks [@gcanti](https://github.com/gcanti)! - update dependencies

## 2.0.0-next.31

### Patch Changes

- [#1419](https://github.com/Effect-TS/effect/pull/1419) [`543dfb495`](https://github.com/Effect-TS/effect/commit/543dfb495c7cfd4799b27e0623d547cf0341a838) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 2.0.0-next.30

### Patch Changes

- [#1416](https://github.com/Effect-TS/effect/pull/1416) [`f464fb494`](https://github.com/Effect-TS/effect/commit/f464fb4948aec38621ca20d824d542980bc250f5) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

## 2.0.0-next.29

### Patch Changes

- [#1412](https://github.com/Effect-TS/effect/pull/1412) [`93f4c9f9a`](https://github.com/Effect-TS/effect/commit/93f4c9f9ab1da2bfe37a439383bb14d861441ea4) Thanks [@tim-smart](https://github.com/tim-smart)! - update peer deps

## 2.0.0-next.28

### Patch Changes

- [#1410](https://github.com/Effect-TS/effect/pull/1410) [`a8ffb5fb9`](https://github.com/Effect-TS/effect/commit/a8ffb5fb9a4a4decc44dce811356136542813af0) Thanks [@tim-smart](https://github.com/tim-smart)! - update @effect/match

## 2.0.0-next.27

### Patch Changes

- [#1408](https://github.com/Effect-TS/effect/pull/1408) [`a6b9f4f01`](https://github.com/Effect-TS/effect/commit/a6b9f4f01892c3cdc6ce56fa3a47c051b0064629) Thanks [@tim-smart](https://github.com/tim-smart)! - update /match

## 2.0.0-next.26

### Patch Changes

- [#1404](https://github.com/Effect-TS/effect/pull/1404) [`6441df29e`](https://github.com/Effect-TS/effect/commit/6441df29ede8a8d33398fff4ae44d141741c64f9) Thanks [@tim-smart](https://github.com/tim-smart)! - expose Console module

## 2.0.0-next.25

### Patch Changes

- [#1402](https://github.com/Effect-TS/effect/pull/1402) [`0844367c5`](https://github.com/Effect-TS/effect/commit/0844367c546184dd9105a3394fc019ed9ad0199e) Thanks [@tim-smart](https://github.com/tim-smart)! - use dependencies + peerDependencies for packages

## 2.0.0-next.24

### Minor Changes

- [#1395](https://github.com/Effect-TS/effect/pull/1395) [`aecaeb88c`](https://github.com/Effect-TS/effect/commit/aecaeb88c5cc58da18e0291cdefdf3a30a14a759) Thanks [@tim-smart](https://github.com/tim-smart)! - update dependencies

### Patch Changes

- [#1395](https://github.com/Effect-TS/effect/pull/1395) [`aecaeb88c`](https://github.com/Effect-TS/effect/commit/aecaeb88c5cc58da18e0291cdefdf3a30a14a759) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to using peerDependencies

- [#1397](https://github.com/Effect-TS/effect/pull/1397) [`9ffd45ba7`](https://github.com/Effect-TS/effect/commit/9ffd45ba78b989d704b0d23691a7afdd758a8674) Thanks [@tim-smart](https://github.com/tim-smart)! - switch to @effect/build-utils and @effect/eslint-plugin

## 2.0.0-next.23

### Patch Changes

- [#1393](https://github.com/Effect-TS/effect/pull/1393) [`db1f1e677`](https://github.com/Effect-TS/effect/commit/db1f1e677570045126c15b0a5158866f2233363a) Thanks [@tim-smart](https://github.com/tim-smart)! - update packages

## 2.0.0-next.22

### Patch Changes

- [#1389](https://github.com/Effect-TS/effect/pull/1389) [`02703a5c7`](https://github.com/Effect-TS/effect/commit/02703a5c7959692d61dbea734bb84b4e4b48c10e) Thanks [@tim-smart](https://github.com/tim-smart)! - update packages

## 2.0.0-next.21

### Patch Changes

- [#1387](https://github.com/Effect-TS/effect/pull/1387) [`83401b13a`](https://github.com/Effect-TS/effect/commit/83401b13a98b4b961a3257d21feef0b5978cbf7e) Thanks [@tim-smart](https://github.com/tim-smart)! - update /stream

## 2.0.0-next.20

### Patch Changes

- [#1385](https://github.com/Effect-TS/effect/pull/1385) [`a53697e15`](https://github.com/Effect-TS/effect/commit/a53697e1532f330d1a653332ec3fd1d74188efbf) Thanks [@tim-smart](https://github.com/tim-smart)! - add /stm, /stream and /match

## 2.0.0-next.19

### Minor Changes

- [#1383](https://github.com/Effect-TS/effect/pull/1383) [`d9c229a87`](https://github.com/Effect-TS/effect/commit/d9c229a87133847b596f3ed2871904bb8ad90fb2) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 2.0.0-next.18

### Patch Changes

- [#1381](https://github.com/Effect-TS/effect/pull/1381) [`bf5ebae41`](https://github.com/Effect-TS/effect/commit/bf5ebae41d4851bf2cd6228c6244ac268c20c92f) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io

## 2.0.0-next.17

### Patch Changes

- [#1379](https://github.com/Effect-TS/effect/pull/1379) [`2e9b54d03`](https://github.com/Effect-TS/effect/commit/2e9b54d0393c3f3c7e63ba2d6507d36074be0b51) Thanks [@tim-smart](https://github.com/tim-smart)! - update /io and /data

## 2.0.0-next.16

### Patch Changes

- [#1376](https://github.com/Effect-TS/effect/pull/1376) [`f356fa23d`](https://github.com/Effect-TS/effect/commit/f356fa23d8dc075781432ce336ea0ed748cf8131) Thanks [@gcanti](https://github.com/gcanti)! - add Config/\* modules

## 2.0.0-next.15

### Patch Changes

- [#1374](https://github.com/Effect-TS/effect/pull/1374) [`37cb95bfd`](https://github.com/Effect-TS/effect/commit/37cb95bfd33bda273d30f62b3176bf410684ae96) Thanks [@gcanti](https://github.com/gcanti)! - remove fast-check from deps

## 2.0.0-next.14

### Patch Changes

- [#1372](https://github.com/Effect-TS/effect/pull/1372) [`1322363d5`](https://github.com/Effect-TS/effect/commit/1322363d59ddca50b72758da47a1ef8b48a53bcc) Thanks [@gcanti](https://github.com/gcanti)! - upgrade to latest versions

## 2.0.0-next.13

### Patch Changes

- [#1360](https://github.com/Effect-TS/effect/pull/1360) [`fef698b15`](https://github.com/Effect-TS/effect/commit/fef698b151dba7a4f9598a452cf6acbd1bee7567) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Elect selected modules to main export

## 2.0.0-next.12

### Patch Changes

- [#1358](https://github.com/Effect-TS/effect/pull/1358) [`54152d7af`](https://github.com/Effect-TS/effect/commit/54152d7af3cf188b4e550d2e1879c0fe18ea2de7) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Restructure package

## 2.0.0-next.11

### Patch Changes

- [#1356](https://github.com/Effect-TS/effect/pull/1356) [`9fcc559d2`](https://github.com/Effect-TS/effect/commit/9fcc559d2206fed5eeb44dd604d7cb3ed7c8465c) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update release

## 2.0.0-next.10

### Patch Changes

- [#1353](https://github.com/Effect-TS/effect/pull/1353) [`6285a7712`](https://github.com/Effect-TS/effect/commit/6285a7712b0fd630f5031fec360eb42a68d9b788) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.9

### Patch Changes

- [#1352](https://github.com/Effect-TS/effect/pull/1352) [`5220362c9`](https://github.com/Effect-TS/effect/commit/5220362c993fcd655229d90fdaf2a740c216b189) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

- [#1350](https://github.com/Effect-TS/effect/pull/1350) [`b18068ebe`](https://github.com/Effect-TS/effect/commit/b18068ebe8ba1c1ceebbd0ec088bd3587c318b29) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io and remove LogLevel isolation

## 2.0.0-next.8

### Patch Changes

- [#1348](https://github.com/Effect-TS/effect/pull/1348) [`a789742bd`](https://github.com/Effect-TS/effect/commit/a789742bd5ef48e3023f3e47499ee11e9874501e) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate LogLevel export

## 2.0.0-next.7

### Patch Changes

- [#1346](https://github.com/Effect-TS/effect/pull/1346) [`2d6cdbc2a`](https://github.com/Effect-TS/effect/commit/2d6cdbc2a842b25e56136735953e32f851094d74) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Logger extensions

## 2.0.0-next.6

### Patch Changes

- [#1344](https://github.com/Effect-TS/effect/pull/1344) [`aa550d9f9`](https://github.com/Effect-TS/effect/commit/aa550d9f9eb743ce4f6f1d7902374855b57cffe8) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.5

### Patch Changes

- [#1342](https://github.com/Effect-TS/effect/pull/1342) [`2c8c14f7c`](https://github.com/Effect-TS/effect/commit/2c8c14f7c9a6ca03ed38f52e9a78774403cbf8bd) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

## 2.0.0-next.4

### Patch Changes

- [#1339](https://github.com/Effect-TS/effect/pull/1339) [`aabfb1d0f`](https://github.com/Effect-TS/effect/commit/aabfb1d0fc348ad70c83706fae8c84d8cd81017f) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update @effect/io

- [#1341](https://github.com/Effect-TS/effect/pull/1341) [`a2b0eca61`](https://github.com/Effect-TS/effect/commit/a2b0eca6118d895746bc178e83dfe8cba0ef5edb) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Optic Re-Export

## 2.0.0-next.3

### Patch Changes

- [#1337](https://github.com/Effect-TS/effect/pull/1337) [`4f805f5c1`](https://github.com/Effect-TS/effect/commit/4f805f5c1f7306c8af144a9a5d888121c0a1488d) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update docs

## 2.0.0-next.2

### Patch Changes

- [#1333](https://github.com/Effect-TS/effect/pull/1333) [`b3dac7e1b`](https://github.com/Effect-TS/effect/commit/b3dac7e1be152b0882340bc57866bc8ce0a3eb47) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update repo in package.json

- [#1335](https://github.com/Effect-TS/effect/pull/1335) [`3c7d4f2e4`](https://github.com/Effect-TS/effect/commit/3c7d4f2e440f2076b02f0dc985f598808b54b358) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update docs

## 2.0.0-next.1

### Patch Changes

- [#1330](https://github.com/Effect-TS/core/pull/1330) [`75780dea1`](https://github.com/Effect-TS/core/commit/75780dea16555c8eef8053d3cd167a60cdd2e1d9) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update dependencies

## 2.0.0-next.0

### Major Changes

- [#1321](https://github.com/Effect-TS/core/pull/1321) [`315a3ab42`](https://github.com/Effect-TS/core/commit/315a3ab42e626ef31fd0336214416cad86131654) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Bootstrap Ecosystem Package

### Patch Changes

- [#1329](https://github.com/Effect-TS/core/pull/1329) [`b015fdac5`](https://github.com/Effect-TS/core/commit/b015fdac5d9db44bae189e216a8d68b6739d8015) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Update to @effect/io@0.0.9

- [#1324](https://github.com/Effect-TS/core/pull/1324) [`74fa4086e`](https://github.com/Effect-TS/core/commit/74fa4086e5b26c5f20706a3209e6c8345e187bcc) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Isolate Debug

- [#1326](https://github.com/Effect-TS/core/pull/1326) [`edc131f65`](https://github.com/Effect-TS/core/commit/edc131f65d71b751f4f2dd4b46acd1fbef5f9804) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add Remaining Effect Re-Exports

- [#1323](https://github.com/Effect-TS/core/pull/1323) [`7f57f59de`](https://github.com/Effect-TS/core/commit/7f57f59deabfe6d2c06afd56ffc79bb22758290b) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fp-ts/data re-exports

- [#1325](https://github.com/Effect-TS/core/pull/1325) [`52dacbf72`](https://github.com/Effect-TS/core/commit/52dacbf7252f0bfcbd9ed01b93bc0b26f0440da4) Thanks [@mikearnaldi](https://github.com/mikearnaldi)! - Add fp-ts/core Re-Exports
