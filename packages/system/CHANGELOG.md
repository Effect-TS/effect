# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.29.0](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.28.0...@effect-ts/system@0.29.0) (2021-04-18)


### Bug Fixes

* **cause:** fix cause equals and contains ([fff7ef0](https://github.com/Effect-TS/core/commit/fff7ef0c006546ec290d343da0455ac2e0a64fb6))
* **cause:** fix containsM ([75cb6bc](https://github.com/Effect-TS/core/commit/75cb6bce657a077489b36f24b1f18725c3ef3f00))
* **cause:** fix equals ([1204f0e](https://github.com/Effect-TS/core/commit/1204f0e984e01656e7ed72d107957efbe48a1a68))
* **cause:** fix isEmpty check in then & both ([04353fc](https://github.com/Effect-TS/core/commit/04353fc9ae1343a80fba2d93d937d7f3fe24d7ef))
* **equals:** fix equality in subscription & improve ([5a0024b](https://github.com/Effect-TS/core/commit/5a0024bc5864503061e740926c534c3fb04a6e04))
* **fiber:** reserved word ([755a5d9](https://github.com/Effect-TS/core/commit/755a5d9aa27bacdfa8bf3ad2638ad2045cfd3555))
* **stm:** backport https://github.com/zio/zio/commit/65fcf00806eab0b106d4d9fa0aaa9d0572440d17 ([d306fbb](https://github.com/Effect-TS/core/commit/d306fbb5cb236d4f9a20864da57ef271e6afcf6f))


### Features

* **cause:** cause structure equality ([df78aab](https://github.com/Effect-TS/core/commit/df78aab9a06535df821ed32f90f7e05ed209fad6))
* **chunk:** implemet hash ([4237771](https://github.com/Effect-TS/core/commit/42377710f75f1ffbbd16d5a3b6fdf77fb538412b))
* **chunks:** implement toJSON on chunk ([9b8262a](https://github.com/Effect-TS/core/commit/9b8262a0e45049555862025103978b0b17b3fdd3))
* **collections:** use structural equality ([7955838](https://github.com/Effect-TS/core/commit/79558386cfadeaaa348f9cbf14d50280261759ba))
* **equals:** implement HasHash and HasEquals on the standard lib ([b2722e8](https://github.com/Effect-TS/core/commit/b2722e8a5acc61113fe8223d519a8667bf057d54))
* **parseq:** begin implementation of ParSeq ([8726d38](https://github.com/Effect-TS/core/commit/8726d38023d37662a0b4b51d812bbcb34bfc7743))
* **parseq:** implement chain, map, zip, zipWith, isEmpty ([d58f875](https://github.com/Effect-TS/core/commit/d58f875f5a09ade89bcbd862a0822c211ca28bfc))
* **streams:** implement channel concatAllWith, managedOut and unwrapManaged ([3b37509](https://github.com/Effect-TS/core/commit/3b37509a40b3d0a543074b84051ed692796d1678))
* **streams:** implement channel toPull and stream toPull ([033b4d8](https://github.com/Effect-TS/core/commit/033b4d86da91d1f2586bb660c0d2940f88aa614c))
* **streams:** implement combineChunks, zipWith, zip ([b6bc6d0](https://github.com/Effect-TS/core/commit/b6bc6d03697ebd8c35d4d3c4bce334d4c2b3707e))
* **streams:** implement low level loopOn variants ([a7d1379](https://github.com/Effect-TS/core/commit/a7d1379c57b41c5be8b170e693c12be2b288328a))
* **streams:** implement mapM ([b8287f1](https://github.com/Effect-TS/core/commit/b8287f12082d5e64f1f15b4c02c3ef3af6c73b4a))
* **streams:** implement stream managed, unwrap, unwrapManaged, effectOption, flatten ([12418a5](https://github.com/Effect-TS/core/commit/12418a5c860ba8b2a010f6e697744943e090e363))
* **xpure:** add log primitive and parameter ([46349c3](https://github.com/Effect-TS/core/commit/46349c32883dff60a09777c992ba61febc02fc5a))





# [0.28.0](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.27.3...@effect-ts/system@0.28.0) (2021-04-14)


### Bug Fixes

* **chunks:** fix invalid references ([d7be179](https://github.com/Effect-TS/core/commit/d7be1794087200d9d16382992385742036573cba))


### Features

* **effect:** rectify andThen method ([c697237](https://github.com/Effect-TS/core/commit/c697237734069fba064f0abe7e83ccd33b6696d5))
* **managed:** dataFirst comments ([35952fd](https://github.com/Effect-TS/core/commit/35952fdde682c1499d0845ded1a7fa835c3c1296))
* **stm:** port some combinators, rename effect left ([9664bd0](https://github.com/Effect-TS/core/commit/9664bd0aaa1832b87a0c861ce864f8998f389ca3))
* **streams:** improve channel readWithCause and implement readWithError ([55588ad](https://github.com/Effect-TS/core/commit/55588ad89e6e8d3b5cc23d115f6f049026ca90a4))
* **various:** rename effectTotal to succeedWith and a few others renames ([3386196](https://github.com/Effect-TS/core/commit/33861965ddd521d01e649a0f9b911e2cca895d76))


### Performance Improvements

* **stm:** TRef reduce closure allocations ([7f480b2](https://github.com/Effect-TS/core/commit/7f480b2a4e4ab0375dffafd61754a00067ac4016))


### BREAKING CHANGES

* **effect:** the implementation is now in line with zio meaning where andThen provides
environment to the next effect





## [0.27.3](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.27.2...@effect-ts/system@0.27.3) (2021-04-13)


### Features

* **stm:** upgrade encoding following zio series/2.x model ([e180c0a](https://github.com/Effect-TS/core/commit/e180c0a0e300cd4ce1c15316feb17a386d463d20))
* **streams:** implement fail, die, take, forever ([3432824](https://github.com/Effect-TS/core/commit/3432824100a909a19cb043292b3bcb19fff3f27b))


### Performance Improvements

* **stm:** use linked stack to lower memory allocation ([5fc50b4](https://github.com/Effect-TS/core/commit/5fc50b42ef1a0e4196c761adffa1be41c23b387b))





## [0.27.2](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.27.1...@effect-ts/system@0.27.2) (2021-04-13)


### Bug Fixes

* **random:** nextIntBetween ([4c3b64a](https://github.com/Effect-TS/core/commit/4c3b64a254071be6f9786dcfb9d0f83317f81752))





## [0.27.1](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.27.0...@effect-ts/system@0.27.1) (2021-04-12)


### Features

* **structural:** generalize structural implementations of equals & hash, improve random generator ([da7f3ac](https://github.com/Effect-TS/core/commit/da7f3ac0fb9049baf5aaca8f9c4661901652ddb1))





# [0.27.0](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.26.0...@effect-ts/system@0.27.0) (2021-04-11)


### Bug Fixes

* **chunk:** fix chunk mapMPar, mapMParN. Improve forEach ([a00ce3b](https://github.com/Effect-TS/core/commit/a00ce3b432ea59d47c2e8f647b99132d2167cb35))
* **chunk:** fix comments ([e7cb390](https://github.com/Effect-TS/core/commit/e7cb3908b9a1884dc59c14677058f15fdaff0a5b))
* **chunk:** fix prepend ([73c2427](https://github.com/Effect-TS/core/commit/73c2427d37bcb56159c176791843b3606906ab81))
* **chunk:** fix prepend position ([144cfc1](https://github.com/Effect-TS/core/commit/144cfc1cc4ab1a5920ec8c225760cb4f7ad82d71))
* **chunk:** get signature ([36e3c85](https://github.com/Effect-TS/core/commit/36e3c85eb63dc586bb59b7835601cd43dd00c0a7))
* **chunk:** remove concat single -> append rewrite ([ee8f4f1](https://github.com/Effect-TS/core/commit/ee8f4f184f5f5ecf7b3e9ea7481fc1acf762f73e))
* **chunks:** fix isByte check ([2b557b0](https://github.com/Effect-TS/core/commit/2b557b0721d5480718af0533e02ccad476e41ecd))


### Features

* **chunk:** begin port of chunk ([36af9b6](https://github.com/Effect-TS/core/commit/36af9b6b5a3624534eff7dec04c64be70e95450f))
* **chunk:** change get to return A instead of A | undefined, document fromArray ([9caea0e](https://github.com/Effect-TS/core/commit/9caea0ef6df8c6c05e5615f69597165fa053cf3a))
* **chunk:** enable buffers to be used in the array-backed primitive ([acbcb8d](https://github.com/Effect-TS/core/commit/acbcb8dcb37c1ba10f0d5abcece5ad7e96f6b8c6))
* **chunk:** enable preservation of buffer in concat/slice ([4ee02e5](https://github.com/Effect-TS/core/commit/4ee02e5ae0b57f2b2e7454a0b29166f114ae756d))
* **chunk:** enable preservation of buffers in prepend/append ([c0ff86c](https://github.com/Effect-TS/core/commit/c0ff86cb762f73efc80b0e8840b74153bd4fc5a1))
* **chunk:** implement chain, improve map ([9a94f73](https://github.com/Effect-TS/core/commit/9a94f73afdb1e02558453fa197d43330730074f3))
* **chunk:** implement corresponds, collectWhile, collectWhileM, arrayLikeIterator ([1de2ae0](https://github.com/Effect-TS/core/commit/1de2ae0f3d92f602e273ea4c3a6b7a731e4604fb))
* **chunk:** implement dropWhile/dropWhileM ([d32252d](https://github.com/Effect-TS/core/commit/d32252d0631fd0c29a5111f0f314de048b93d955))
* **chunk:** implement equals ([4085b1b](https://github.com/Effect-TS/core/commit/4085b1b11ce686c8889c7ac43a16e136a234ab4b))
* **chunk:** implement every, indexWhere, mapAccum, mapAccumM, mapM* ([07b90dc](https://github.com/Effect-TS/core/commit/07b90dc900e1793d45ce605fa52bf1d08c7d7848))
* **chunk:** implement exists, filter, filterM ([6807d53](https://github.com/Effect-TS/core/commit/6807d5302ab706c46a1f0b905a79340987c0116e))
* **chunk:** implement flatten, find ([bc67b2d](https://github.com/Effect-TS/core/commit/bc67b2dcad46029272cacf38e91db18307034499))
* **chunk:** implement forEach, partitionMap ([d4cb688](https://github.com/Effect-TS/core/commit/d4cb6885e051aabefc8db93b5ac2d5a3709380de))
* **chunk:** implement get/unsafeGet ([9fe923c](https://github.com/Effect-TS/core/commit/9fe923c0d327d14817fc7bae9491c82a2d297b6c))
* **chunk:** implement map ([531307e](https://github.com/Effect-TS/core/commit/531307e53343d6ada9bcc71e0d250971527646b4))
* **chunk:** implement materialize and collectM ([3c34df2](https://github.com/Effect-TS/core/commit/3c34df2644089643d8a67a9b4334d89704486a79))
* **chunk:** implement reduce/reduceRight ([e9c862f](https://github.com/Effect-TS/core/commit/e9c862fefd13f85c3c2d3bce8c0b47557bc9c594))
* **chunk:** implement reduceWhile, reduceWhileM ([a133c34](https://github.com/Effect-TS/core/commit/a133c345be1d8798db90cd167e9a8cc5f38a4a48))
* **chunk:** implement split/splitAt ([d9fbb09](https://github.com/Effect-TS/core/commit/d9fbb0969c4cdc9ebf4260a80ff6d49ee9a5fd64))
* **chunk:** implement splitWhere, improve iterations ([516e580](https://github.com/Effect-TS/core/commit/516e580a98e2c11fad79329a75c5135dc50cc7ea))
* **chunk:** implement take and drop ([439a612](https://github.com/Effect-TS/core/commit/439a612950cbb455ddab95bdedef004a922bf195))
* **chunk:** implement takeWhile, takeWhileM, zipWith, zip ([c98d1c4](https://github.com/Effect-TS/core/commit/c98d1c481d37ebbaa31649b536fd7c052c658750))
* **chunk:** implement zip, zipWith, zipAll, zipAllWith ([58cad49](https://github.com/Effect-TS/core/commit/58cad49993fc17e127161506118cada8bc3822db))
* **chunk:** implement zipWithIndex, zipWithIndexOffset, unfold, unfoldM, filterMap, optimize array ([30dc6cb](https://github.com/Effect-TS/core/commit/30dc6cb9fcf64d76e72f1c3648869ce51b2b4f31))
* **chunk:** improve constructors ([bf456da](https://github.com/Effect-TS/core/commit/bf456da8bad22189819481ef7530b1ae2b870057))
* **chunk:** unify byte append-prepend-single ([ff06272](https://github.com/Effect-TS/core/commit/ff06272c0bf5ec2c3abc3a29de43b8f4a3bec0dd))
* **chunks:** optimize some functions for single value chunks ([15cfe09](https://github.com/Effect-TS/core/commit/15cfe09dc6f1d17585d59c9fe60943a9ab0cba1d))
* **effect:** type preserving forEach via collection typeclass ([d9295cd](https://github.com/Effect-TS/core/commit/d9295cd44c1efa67f3aa906af094ab56a195f682))
* **hub:** add tracing off comments and default operator import ([75e2f36](https://github.com/Effect-TS/core/commit/75e2f361eb95cb1d5a1b85d9c1c5f004e2532698))
* **streams:** begin stream and sink module ([16b1dba](https://github.com/Effect-TS/core/commit/16b1dba457d480be7e5cec0526211aaa3a861209))
* **streams:** channel chain_ ([1687003](https://github.com/Effect-TS/core/commit/16870032b0057430eb044c6b97cd3383c515aade))
* **streams:** channel primitives and executor ([8d4af93](https://github.com/Effect-TS/core/commit/8d4af9331af88d88edb4636d13af6c093b6bd4eb))
* **streams:** implement SingleProducerAsyncInput and fix variance in primitive constructors ([78cf950](https://github.com/Effect-TS/core/commit/78cf9500feb6866f924798d7aa39a124db41ddf0))
* **streams:** refactor streams to use the new chunk module ([2977d75](https://github.com/Effect-TS/core/commit/2977d755440b34cda2dd73da4d75801a0cc57c00))
* **streams:** remove conduit port from experiments in favour of zio 2.0 variant ([6856144](https://github.com/Effect-TS/core/commit/6856144417607c0a6912aefc75c0dbdc1fb5f6da))
* **streams:** variance on readWithCause ([67985bf](https://github.com/Effect-TS/core/commit/67985bf3e066761fd4906434e05e1635fb6a97ca))
* **streams:** zio 2.x primitives ([26976d5](https://github.com/Effect-TS/core/commit/26976d580daa15ef18a859f9ab624b0a232ef0f0))


### Performance Improvements

* **chunk:** avoid re-computing depth, length, left, right, empty and use array for cache locality ([ec5a3ef](https://github.com/Effect-TS/core/commit/ec5a3ef0192083ffefa4e520d4dba4b23b1bd6a3))
* **chunk:** optimise concat with single as append/prepend ([eca4568](https://github.com/Effect-TS/core/commit/eca45682c35d61003e8b9e814502e4d3b80133a8))
* **chunk:** optimize iterator avoid boxing to array ([6e1e7c3](https://github.com/Effect-TS/core/commit/6e1e7c3d8e1dc97e38d44f043bdc2b04973225b6))
* **chunk:** override toArray & iterator in Arr ([a5d46dd](https://github.com/Effect-TS/core/commit/a5d46ddf725da921bd299681d3a7594919c0c2cf))
* **streams:** extract loop in chunkN ([c1e67d2](https://github.com/Effect-TS/core/commit/c1e67d23453a9772ce07002a93938865cf0a8785))





# [0.26.0](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.13...@effect-ts/system@0.26.0) (2021-04-09)


### Bug Fixes

* **collections:** avoid fromNullable in mutable hash-set get ([99e8b66](https://github.com/Effect-TS/core/commit/99e8b660d06b9ee224f740edbe086c0b2942578b))
* **mutable-queue:** fix imports ([9ae22a2](https://github.com/Effect-TS/core/commit/9ae22a2c29dc8327295f46e9770131f67336417c))


### Features

* **collections:** remove, update, modify on mutable HashMap ([03a8f49](https://github.com/Effect-TS/core/commit/03a8f49a4c8a0360895f275fd2966a03fdd360d1))
* **collections:** restructure collections, begin mutable hashmap ([801be17](https://github.com/Effect-TS/core/commit/801be17cb90a7ca06a2e724c4406d7eed2440318))
* **hub:** added unsafe constructors for hubs ([9d2db9d](https://github.com/Effect-TS/core/commit/9d2db9d96202ae806ce4600dcbc51e5da4cbabe1))
* **hub:** initial port ([8dfd937](https://github.com/Effect-TS/core/commit/8dfd937ffc9c1c1e2e706bf0a0cf709fb1c0d595))
* **mutable-queue:** add hashCode ([6e248c5](https://github.com/Effect-TS/core/commit/6e248c598fac4bbf170fbd1c8d5ed451c6b35bc1))
* **mutable-queue:** use structural HasHash ([5a36753](https://github.com/Effect-TS/core/commit/5a367532b549e9aa8322b24896dc07bf79d05331))
* **stream:** added hub-related combinators and converted broadcast* functions to use hub ([1459ccb](https://github.com/Effect-TS/core/commit/1459ccb4a7d7067b95dbce5d92305ea8317a74f8))


### BREAKING CHANGES

* **collections:** The import path for collection is changed





## [0.25.13](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.12...@effect-ts/system@0.25.13) (2021-04-06)


### Features

* **streams:** port some functions, reorg alphabetically ([bd6e36a](https://github.com/Effect-TS/core/commit/bd6e36aaf9f8808fad1b85a4854be89968fce6a7))





## [0.25.12](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.11...@effect-ts/system@0.25.12) (2021-04-06)

**Note:** Version bump only for package @effect-ts/system





## [0.25.11](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.10...@effect-ts/system@0.25.11) (2021-04-06)


### Features

* **system:** embed tracing utils into system ([0cf1cfb](https://github.com/Effect-TS/core/commit/0cf1cfb79392ec3d53b01e21e5826763c6ea4d9a))
* **tracing-plugin:** add exceptions for system and core ([83736c9](https://github.com/Effect-TS/core/commit/83736c978863ade8b6c3fd2e46069ff5d452b92f))





## [0.25.10](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.9...@effect-ts/system@0.25.10) (2021-04-05)


### Features

* **build-tools:** write build-tools in terms of effect ([b2c6dbb](https://github.com/Effect-TS/core/commit/b2c6dbb401dc647050bc8b736722e113783cae19))





## [0.25.9](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.8...@effect-ts/system@0.25.9) (2021-04-05)


### Features

* **build-utils:** publish build utils ([6ae5788](https://github.com/Effect-TS/core/commit/6ae5788bfbef1ed8f1e59603798cced8b2aac55a))





## [0.25.8](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.7...@effect-ts/system@0.25.8) (2021-04-05)


### Features

* **layers:** unsafeMainProvider ([eae30ed](https://github.com/Effect-TS/core/commit/eae30edfdc8e8f0cb18d5b05658d7053551f0c0a))
* **managed:** allocate ([baf018d](https://github.com/Effect-TS/core/commit/baf018d1af12c0711753fc41a0bfa8488403c092))
* **streams:** effectAsync/effectAsyncStream/range ([960dac8](https://github.com/Effect-TS/core/commit/960dac84aa1de82ea56f1bf6649c3dd82481b7f3))
* **streams:** unify effectAsyc variants in streamAsync ([5a1b1ee](https://github.com/Effect-TS/core/commit/5a1b1ee28e380e13933950157ddf7cff2eced2d9))


### Performance Improvements

* **streams:** avoid wrapping stream in streamAsync ([b5604b5](https://github.com/Effect-TS/core/commit/b5604b5201ac03484836c35c35acc945043d68ec))





## [0.25.7](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.6...@effect-ts/system@0.25.7) (2021-04-04)


### Bug Fixes

* **streams:** use type for stream ([3b7e76b](https://github.com/Effect-TS/core/commit/3b7e76bb64abbca205cc4e0c88c95c9389221d17))


### Features

* **streams:** mergeT / mergeBufferT ([3afff80](https://github.com/Effect-TS/core/commit/3afff8095a702a7a4be0c44ab59ffbe5edf67fb5))
* **streams:** repeact/repeatM/repeatManaged ([ab0ea92](https://github.com/Effect-TS/core/commit/ab0ea92850410f8faafb2fe8223e000cd34c76fc))
* **streams:** zip/zipWith ([1dc0bd8](https://github.com/Effect-TS/core/commit/1dc0bd88c81609a71e3c8cfa5f78854725ad852d))
* **streams:** zipPar/zipParWith/zipParWithBuffer ([7f8eff9](https://github.com/Effect-TS/core/commit/7f8eff98af727e0e441953f0611fedc07ca351a2))


### Performance Improvements

* **streams:** avoid non necessary do ([dcaad64](https://github.com/Effect-TS/core/commit/dcaad648a0d3338930cea5b9503ad9a148dab0d4))
* **streams:** improve zipWith ([e828c2e](https://github.com/Effect-TS/core/commit/e828c2e556b97e39f80fb08ee7eb591755a5d0a1))
* **streams:** use forEachUnitPar in mergeBuffer ([56913ab](https://github.com/Effect-TS/core/commit/56913abc93159a9850d61da248f100cb12ad5b67))





## [0.25.6](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.5...@effect-ts/system@0.25.6) (2021-04-04)


### Bug Fixes

* **stream:** drain return type ([de1d915](https://github.com/Effect-TS/core/commit/de1d91559b848bfb4b414aa77d009fef4185ca5c))
* **streams:** merge should fork ([7c6e16b](https://github.com/Effect-TS/core/commit/7c6e16bdda3bbac7d837d52746cb830be5c0d30c))


### Features

* **streams:** mapAccumM / scanM ([c792ae0](https://github.com/Effect-TS/core/commit/c792ae0bf9e743266437df6c1ea92eb632b093e1))
* **streams:** mergeBuffer / merge / fromQueue ([eb4c55a](https://github.com/Effect-TS/core/commit/eb4c55ac92f6d783102a97f2bb68cceca49fd6ba))


### Performance Improvements

* **streams:** use primitives in pipeline ([dd6a2e3](https://github.com/Effect-TS/core/commit/dd6a2e3162c0ad92997cd086ea8ebd5eca040292))





## [0.25.5](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.4...@effect-ts/system@0.25.5) (2021-04-04)


### Bug Fixes

* trace mapAccum ([2bfa9ea](https://github.com/Effect-TS/core/commit/2bfa9eaf2acd883a463b47ef49b1a6bfd31a6501))


### Features

* **streams:** scan ([61888ed](https://github.com/Effect-TS/core/commit/61888ed170a8ee42bc659e26db045f76bd53207e))


### Performance Improvements

* extract loop from mapAccum ([8531235](https://github.com/Effect-TS/core/commit/85312359387e137ebd003c8724af0286c1cd456c))





## [0.25.4](https://github.com/Effect-TS/core/compare/@effect-ts/system@0.25.3...@effect-ts/system@0.25.4) (2021-04-04)


### Bug Fixes

* project repository and changelogs ([0788729](https://github.com/Effect-TS/core/commit/07887297c4ca1facdddd9065cd8c42d0e28613a2))





## [0.25.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.25.3-alpha.1...@effect-ts/core@0.25.3) (2021-04-04)

**Note:** Version bump only for package @effect-ts/core
