# effect

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
