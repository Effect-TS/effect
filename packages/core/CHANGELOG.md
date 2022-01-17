# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.52.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.51.2...@effect-ts/core@0.52.0) (2022-01-16)

**Note:** Version bump only for package @effect-ts/core





## [0.51.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.51.1...@effect-ts/core@0.51.2) (2022-01-14)

**Note:** Version bump only for package @effect-ts/core





## [0.51.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.51.0...@effect-ts/core@0.51.1) (2022-01-14)


### Bug Fixes

* **option:** getApplyIdentity ([1badc59](https://github.com/Effect-TS/core/commit/1badc598461cffccafec2cd71a3c2504845de7a9))





# [0.51.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.50.0...@effect-ts/core@0.51.0) (2022-01-07)


### Bug Fixes

* **chunk:** rename collectChunk => collect ([#1021](https://github.com/Effect-TS/core/issues/1021)) ([635c877](https://github.com/Effect-TS/core/commit/635c877866ddaf6c1644a8008204e721fc16882a))





# [0.50.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.49.0...@effect-ts/core@0.50.0) (2022-01-05)

**Note:** Version bump only for package @effect-ts/core





# [0.49.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.6...@effect-ts/core@0.49.0) (2022-01-04)

**Note:** Version bump only for package @effect-ts/core





## [0.48.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.5...@effect-ts/core@0.48.6) (2021-12-21)

**Note:** Version bump only for package @effect-ts/core





## [0.48.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.4...@effect-ts/core@0.48.5) (2021-12-13)


### Features

* **exp-stream:** added sliding combinator ([#1002](https://github.com/Effect-TS/core/issues/1002)) ([a4fb5aa](https://github.com/Effect-TS/core/commit/a4fb5aa80ec615b453e2e1a2e621acfb5c7f32a8))





## [0.48.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.3...@effect-ts/core@0.48.4) (2021-12-13)

**Note:** Version bump only for package @effect-ts/core





## [0.48.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.2...@effect-ts/core@0.48.3) (2021-12-05)

**Note:** Version bump only for package @effect-ts/core





## [0.48.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.1...@effect-ts/core@0.48.2) (2021-11-29)

**Note:** Version bump only for package @effect-ts/core





## [0.48.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.48.0...@effect-ts/core@0.48.1) (2021-11-29)

**Note:** Version bump only for package @effect-ts/core





# [0.48.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.47.0...@effect-ts/core@0.48.0) (2021-11-29)


### Features

* restore optional usage of serviceId key for tag. ([031700e](https://github.com/Effect-TS/core/commit/031700ef7ecd25fef68a33bf9b74bf4fccd06ea9))





# [0.47.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.5...@effect-ts/core@0.47.0) (2021-11-26)


### Reverts

* serviceId requirement, AnyService, ServiceConstructor<T> ([#974](https://github.com/Effect-TS/core/issues/974)) ([1fd57ec](https://github.com/Effect-TS/core/commit/1fd57ecd2a7e4cc6796fd30ffb516ba99c58093e))





## [0.46.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.4...@effect-ts/core@0.46.5) (2021-11-24)


### chore

* implement state in terms of fiber-ref (following zio 2) ([197bad2](https://github.com/Effect-TS/core/commit/197bad241ac97599fcf53bc8b2135b74542c216d))


### Features

* **syncLayers:** use serviceConstructor in syncLayers ([6ff7fb2](https://github.com/Effect-TS/core/commit/6ff7fb215a9fd1c60bbbc07d77b8bec4c52a8032))


### BREAKING CHANGES

* FiberRef api now uses Tuple





## [0.46.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.3...@effect-ts/core@0.46.4) (2021-11-20)

**Note:** Version bump only for package @effect-ts/core





## [0.46.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.2...@effect-ts/core@0.46.3) (2021-11-20)

**Note:** Version bump only for package @effect-ts/core





## [0.46.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.1...@effect-ts/core@0.46.2) (2021-11-20)

**Note:** Version bump only for package @effect-ts/core





## [0.46.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.46.0...@effect-ts/core@0.46.1) (2021-11-15)


### Bug Fixes

* chainRec in Chunk, refactor Prelude ([ff9319e](https://github.com/Effect-TS/core/commit/ff9319ee495757cbae02c87065fe022b271bf84b))


### Features

* **string:** add implementation of stripMargin to string module ([8897cde](https://github.com/Effect-TS/core/commit/8897cde35041e9e78eef918af8c42677569dc265))





# [0.46.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.5...@effect-ts/core@0.46.0) (2021-11-10)


### Features

* **pool:** initial pool implementation + test ([61902c7](https://github.com/Effect-TS/core/commit/61902c759a45b7ec7ffcd460e8a917c826e6f8fa))
* **tag:** type-safe tag & has with standard services ([3e66bd0](https://github.com/Effect-TS/core/commit/3e66bd027ef78b1bea98a3ffef0c84c5d900b05d))





## [0.45.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.4...@effect-ts/core@0.45.5) (2021-10-25)

**Note:** Version bump only for package @effect-ts/core





## [0.45.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.2...@effect-ts/core@0.45.4) (2021-10-22)

**Note:** Version bump only for package @effect-ts/core





## [0.45.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.2...@effect-ts/core@0.45.3) (2021-10-22)

**Note:** Version bump only for package @effect-ts/core





## [0.45.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.1...@effect-ts/core@0.45.2) (2021-10-13)

**Note:** Version bump only for package @effect-ts/core





## [0.45.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.45.0...@effect-ts/core@0.45.1) (2021-10-11)

**Note:** Version bump only for package @effect-ts/core





# [0.45.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.15...@effect-ts/core@0.45.0) (2021-10-11)

**Note:** Version bump only for package @effect-ts/core





## [0.44.15](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.14...@effect-ts/core@0.44.15) (2021-10-09)

**Note:** Version bump only for package @effect-ts/core





## [0.44.14](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.13...@effect-ts/core@0.44.14) (2021-10-09)

**Note:** Version bump only for package @effect-ts/core





## [0.44.13](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.12...@effect-ts/core@0.44.13) (2021-10-05)

**Note:** Version bump only for package @effect-ts/core





## [0.44.12](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.11...@effect-ts/core@0.44.12) (2021-10-05)

**Note:** Version bump only for package @effect-ts/core





## [0.44.11](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.10...@effect-ts/core@0.44.11) (2021-10-04)


### Bug Fixes

* **stream:** updated zipWithLatest ([e43faa1](https://github.com/Effect-TS/core/commit/e43faa1b2edf06f8718cb0cdc468f8074563479c))





## [0.44.10](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.9...@effect-ts/core@0.44.10) (2021-09-29)

**Note:** Version bump only for package @effect-ts/core





## [0.44.9](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.8...@effect-ts/core@0.44.9) (2021-09-29)

**Note:** Version bump only for package @effect-ts/core





## [0.44.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.7...@effect-ts/core@0.44.8) (2021-09-25)

**Note:** Version bump only for package @effect-ts/core





## [0.44.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.6...@effect-ts/core@0.44.7) (2021-09-25)

**Note:** Version bump only for package @effect-ts/core





## [0.44.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.5...@effect-ts/core@0.44.6) (2021-09-24)

**Note:** Version bump only for package @effect-ts/core





## [0.44.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.4...@effect-ts/core@0.44.5) (2021-09-20)

**Note:** Version bump only for package @effect-ts/core





## [0.44.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.3...@effect-ts/core@0.44.4) (2021-09-12)


### Bug Fixes

* **chunk:** fix data first forEachF ([b14ddd2](https://github.com/Effect-TS/core/commit/b14ddd24f4d1f9542ec00c1a3fc863ef261f108a))





## [0.44.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.2...@effect-ts/core@0.44.3) (2021-09-12)


### Features

* **chunk:** fix data first ([b3e64f4](https://github.com/Effect-TS/core/commit/b3e64f47c5d13ac86f72929672b81e5027ea2d01))





## [0.44.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.1...@effect-ts/core@0.44.2) (2021-09-12)

**Note:** Version bump only for package @effect-ts/core





## [0.44.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.44.0...@effect-ts/core@0.44.1) (2021-09-12)

**Note:** Version bump only for package @effect-ts/core





# [0.44.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.9...@effect-ts/core@0.44.0) (2021-09-12)


### Features

* **chunk:** fix data-first variants ([29d20be](https://github.com/Effect-TS/core/commit/29d20bebf908c948a68659aa992dff94c96aacf5))





## [0.43.9](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.8...@effect-ts/core@0.43.9) (2021-09-09)

**Note:** Version bump only for package @effect-ts/core





## [0.43.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.7...@effect-ts/core@0.43.8) (2021-09-09)

**Note:** Version bump only for package @effect-ts/core





## [0.43.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.6...@effect-ts/core@0.43.7) (2021-09-04)

**Note:** Version bump only for package @effect-ts/core





## [0.43.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.5...@effect-ts/core@0.43.6) (2021-08-29)

**Note:** Version bump only for package @effect-ts/core





## [0.43.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.3...@effect-ts/core@0.43.5) (2021-08-25)

**Note:** Version bump only for package @effect-ts/core





## [0.43.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.3...@effect-ts/core@0.43.4) (2021-08-25)

**Note:** Version bump only for package @effect-ts/core





## [0.43.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.2...@effect-ts/core@0.43.3) (2021-08-25)

**Note:** Version bump only for package @effect-ts/core





## [0.43.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.1...@effect-ts/core@0.43.2) (2021-08-23)

**Note:** Version bump only for package @effect-ts/core





## [0.43.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.43.0...@effect-ts/core@0.43.1) (2021-08-18)

**Note:** Version bump only for package @effect-ts/core





# [0.43.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.8...@effect-ts/core@0.43.0) (2021-07-28)


### Features

* revise plugin and prefix annotations ([7390e3a](https://github.com/Effect-TS/core/commit/7390e3a1eafd6c8d37a8cbf891917c5ad5cd5ebb))





## [0.42.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.7...@effect-ts/core@0.42.8) (2021-07-05)

**Note:** Version bump only for package @effect-ts/core





## [0.42.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.6...@effect-ts/core@0.42.7) (2021-07-05)

**Note:** Version bump only for package @effect-ts/core





## [0.42.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.5...@effect-ts/core@0.42.6) (2021-07-05)

**Note:** Version bump only for package @effect-ts/core





## [0.42.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.4...@effect-ts/core@0.42.5) (2021-07-02)

**Note:** Version bump only for package @effect-ts/core





## [0.42.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.3...@effect-ts/core@0.42.4) (2021-07-02)

**Note:** Version bump only for package @effect-ts/core





## [0.42.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.2...@effect-ts/core@0.42.3) (2021-07-02)

**Note:** Version bump only for package @effect-ts/core





## [0.42.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.1...@effect-ts/core@0.42.2) (2021-07-01)

**Note:** Version bump only for package @effect-ts/core





## [0.42.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.42.0...@effect-ts/core@0.42.1) (2021-07-01)

**Note:** Version bump only for package @effect-ts/core





# [0.42.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.41.0...@effect-ts/core@0.42.0) (2021-07-01)

**Note:** Version bump only for package @effect-ts/core





# [0.41.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.17...@effect-ts/core@0.41.0) (2021-07-01)

**Note:** Version bump only for package @effect-ts/core





## [0.40.17](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.16...@effect-ts/core@0.40.17) (2021-07-01)

**Note:** Version bump only for package @effect-ts/core





## [0.40.16](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.15...@effect-ts/core@0.40.16) (2021-06-27)

**Note:** Version bump only for package @effect-ts/core





## [0.40.15](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.14...@effect-ts/core@0.40.15) (2021-06-27)


### Bug Fixes

* **core:** fixes imports ([b748bb0](https://github.com/Effect-TS/core/commit/b748bb0f8a99f6e4f7119e0423dd298498de9b36))





## [0.40.14](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.13...@effect-ts/core@0.40.14) (2021-06-27)


### Features

* **core:** add missing utils ([ad018d2](https://github.com/Effect-TS/core/commit/ad018d24eb75f7955f0a0f489d9b7b883683ba90))





## [0.40.13](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.12...@effect-ts/core@0.40.13) (2021-06-27)


### Features

* **core:** continue option ([4102ad1](https://github.com/Effect-TS/core/commit/4102ad1438ceba78c1ce1eb4a984a8bbab2a3e9e))





## [0.40.12](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.11...@effect-ts/core@0.40.12) (2021-06-27)

**Note:** Version bump only for package @effect-ts/core





## [0.40.11](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.10...@effect-ts/core@0.40.11) (2021-06-27)


### Features

* **core:** Array mapEffect ([f420cbb](https://github.com/Effect-TS/core/commit/f420cbbb5ac2a784d1d1826d9c9eea0bf9a13f7d))





## [0.40.10](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.9...@effect-ts/core@0.40.10) (2021-06-27)

**Note:** Version bump only for package @effect-ts/core





## [0.40.9](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.8...@effect-ts/core@0.40.9) (2021-06-27)


### Bug Fixes

* **core:** fix import ([9a7c739](https://github.com/Effect-TS/core/commit/9a7c73915ca0d03d0613cd82007b0726345d0673))





## [0.40.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.7...@effect-ts/core@0.40.8) (2021-06-26)

**Note:** Version bump only for package @effect-ts/core





## [0.40.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.6...@effect-ts/core@0.40.7) (2021-06-25)

**Note:** Version bump only for package @effect-ts/core





## [0.40.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.5...@effect-ts/core@0.40.6) (2021-06-25)

**Note:** Version bump only for package @effect-ts/core





## [0.40.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.4...@effect-ts/core@0.40.5) (2021-06-25)

**Note:** Version bump only for package @effect-ts/core





## [0.40.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.3...@effect-ts/core@0.40.4) (2021-06-06)

**Note:** Version bump only for package @effect-ts/core





## [0.40.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.2...@effect-ts/core@0.40.3) (2021-06-06)

**Note:** Version bump only for package @effect-ts/core





## [0.40.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.1...@effect-ts/core@0.40.2) (2021-06-06)

**Note:** Version bump only for package @effect-ts/core





## [0.40.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.40.0...@effect-ts/core@0.40.1) (2021-06-02)

**Note:** Version bump only for package @effect-ts/core





# [0.40.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.6...@effect-ts/core@0.40.0) (2021-05-30)

**Note:** Version bump only for package @effect-ts/core





## [0.39.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.5...@effect-ts/core@0.39.6) (2021-05-30)

**Note:** Version bump only for package @effect-ts/core





## [0.39.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.3...@effect-ts/core@0.39.5) (2021-05-24)

**Note:** Version bump only for package @effect-ts/core





## [0.39.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.3...@effect-ts/core@0.39.4) (2021-05-24)

**Note:** Version bump only for package @effect-ts/core





## [0.39.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.2...@effect-ts/core@0.39.3) (2021-05-18)

**Note:** Version bump only for package @effect-ts/core





## [0.39.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.1...@effect-ts/core@0.39.2) (2021-05-16)


### Bug Fixes

* **chunk:** fix forEachWithIndexF ([ca17ec5](https://github.com/Effect-TS/core/commit/ca17ec538df524ab36674e2c621a8a0fd75fb024))





## [0.39.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.39.0...@effect-ts/core@0.39.1) (2021-05-16)


### Features

* **chunk:** add missing functions ([0d357fa](https://github.com/Effect-TS/core/commit/0d357fa4f894dd1b3f02fdfa584c26ac46e7e06c))





# [0.39.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.38.1...@effect-ts/core@0.39.0) (2021-05-14)

**Note:** Version bump only for package @effect-ts/core





## [0.38.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.38.0...@effect-ts/core@0.38.1) (2021-05-11)

**Note:** Version bump only for package @effect-ts/core





# [0.38.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.9...@effect-ts/core@0.38.0) (2021-05-11)

**Note:** Version bump only for package @effect-ts/core





## [0.37.9](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.8...@effect-ts/core@0.37.9) (2021-05-11)

**Note:** Version bump only for package @effect-ts/core





## [0.37.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.7...@effect-ts/core@0.37.8) (2021-05-10)

**Note:** Version bump only for package @effect-ts/core





## [0.37.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.6...@effect-ts/core@0.37.7) (2021-05-08)


### Bug Fixes

* **core:** move transactional in effect ([c4fd4d9](https://github.com/Effect-TS/core/commit/c4fd4d98752853f07b7036350695494505fbe044))





## [0.37.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.5...@effect-ts/core@0.37.6) (2021-05-06)

**Note:** Version bump only for package @effect-ts/core





## [0.37.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.4...@effect-ts/core@0.37.5) (2021-05-03)

**Note:** Version bump only for package @effect-ts/core





## [0.37.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.3...@effect-ts/core@0.37.4) (2021-05-03)

**Note:** Version bump only for package @effect-ts/core





## [0.37.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.2...@effect-ts/core@0.37.3) (2021-04-29)

**Note:** Version bump only for package @effect-ts/core





## [0.37.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.1...@effect-ts/core@0.37.2) (2021-04-29)

**Note:** Version bump only for package @effect-ts/core





## [0.37.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.37.0...@effect-ts/core@0.37.1) (2021-04-29)

**Note:** Version bump only for package @effect-ts/core





# [0.37.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.5...@effect-ts/core@0.37.0) (2021-04-29)

**Note:** Version bump only for package @effect-ts/core





## [0.36.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.4...@effect-ts/core@0.36.5) (2021-04-29)

**Note:** Version bump only for package @effect-ts/core





## [0.36.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.3...@effect-ts/core@0.36.4) (2021-04-27)

**Note:** Version bump only for package @effect-ts/core





## [0.36.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.2...@effect-ts/core@0.36.3) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.36.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.1...@effect-ts/core@0.36.2) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.36.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.36.0...@effect-ts/core@0.36.1) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





# [0.36.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.7...@effect-ts/core@0.36.0) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.35.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.6...@effect-ts/core@0.35.7) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.35.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.5...@effect-ts/core@0.35.6) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.35.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.4...@effect-ts/core@0.35.5) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.35.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.3...@effect-ts/core@0.35.4) (2021-04-21)

**Note:** Version bump only for package @effect-ts/core





## [0.35.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.2...@effect-ts/core@0.35.3) (2021-04-20)

**Note:** Version bump only for package @effect-ts/core





## [0.35.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.1...@effect-ts/core@0.35.2) (2021-04-20)

**Note:** Version bump only for package @effect-ts/core





## [0.35.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.35.0...@effect-ts/core@0.35.1) (2021-04-20)

**Note:** Version bump only for package @effect-ts/core





# [0.35.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.34.1...@effect-ts/core@0.35.0) (2021-04-20)


### Bug Fixes

* **tuple:** fix tests and improve mapN ([b3be972](https://github.com/Effect-TS/core/commit/b3be9722f1b5a79e6b11539c9616e59816451953))


### Features

* **tuples:** use tuple everywhere while fixing bugs ([793427b](https://github.com/Effect-TS/core/commit/793427ba590b7fd499d7c4cd4f7364642601314f))





## [0.34.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.34.0...@effect-ts/core@0.34.1) (2021-04-20)

**Note:** Version bump only for package @effect-ts/core





# [0.34.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.7...@effect-ts/core@0.34.0) (2021-04-20)

**Note:** Version bump only for package @effect-ts/core





## [0.33.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.6...@effect-ts/core@0.33.7) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.5...@effect-ts/core@0.33.6) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.4...@effect-ts/core@0.33.5) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.3...@effect-ts/core@0.33.4) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.2...@effect-ts/core@0.33.3) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.1...@effect-ts/core@0.33.2) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.33.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.33.0...@effect-ts/core@0.33.1) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





# [0.33.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.7...@effect-ts/core@0.33.0) (2021-04-19)


### Features

* **equals:** change default to be referential ([d5befe1](https://github.com/Effect-TS/core/commit/d5befe10f5885529f8d9ac048e397db8cca3d938))





## [0.32.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.6...@effect-ts/core@0.32.7) (2021-04-19)


### Bug Fixes

* **core:** remove circular dependency ([c3d8aa1](https://github.com/Effect-TS/core/commit/c3d8aa159fb0132ab1229677e4018772c06fcf8a))





## [0.32.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.5...@effect-ts/core@0.32.6) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.32.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.4...@effect-ts/core@0.32.5) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.32.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.3...@effect-ts/core@0.32.4) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.32.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.2...@effect-ts/core@0.32.3) (2021-04-19)

**Note:** Version bump only for package @effect-ts/core





## [0.32.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.1...@effect-ts/core@0.32.2) (2021-04-18)

**Note:** Version bump only for package @effect-ts/core





## [0.32.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.32.0...@effect-ts/core@0.32.1) (2021-04-18)

**Note:** Version bump only for package @effect-ts/core





# [0.32.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.31.0...@effect-ts/core@0.32.0) (2021-04-18)


### Features

* **parseq:** begin implementation of ParSeq ([8726d38](https://github.com/Effect-TS/core/commit/8726d38023d37662a0b4b51d812bbcb34bfc7743))
* **xpure:** add log primitive and parameter ([46349c3](https://github.com/Effect-TS/core/commit/46349c32883dff60a09777c992ba61febc02fc5a))





# [0.31.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.30.3...@effect-ts/core@0.31.0) (2021-04-14)


### Features

* **various:** rename effectTotal to succeedWith and a few others renames ([3386196](https://github.com/Effect-TS/core/commit/33861965ddd521d01e649a0f9b911e2cca895d76))





## [0.30.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.30.2...@effect-ts/core@0.30.3) (2021-04-13)

**Note:** Version bump only for package @effect-ts/core





## [0.30.2](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.30.1...@effect-ts/core@0.30.2) (2021-04-13)

**Note:** Version bump only for package @effect-ts/core





## [0.30.1](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.30.0...@effect-ts/core@0.30.1) (2021-04-12)


### Features

* **structural:** generalize structural implementations of equals & hash, improve random generator ([da7f3ac](https://github.com/Effect-TS/core/commit/da7f3ac0fb9049baf5aaca8f9c4661901652ddb1))





# [0.30.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.29.0...@effect-ts/core@0.30.0) (2021-04-11)


### Features

* **effect:** add forEach variants ([1ac303b](https://github.com/Effect-TS/core/commit/1ac303b2e935db380b2f58a1f926c30360bad6bc))
* **effect:** type preserving forEach via collection typeclass ([d9295cd](https://github.com/Effect-TS/core/commit/d9295cd44c1efa67f3aa906af094ab56a195f682))
* **streams:** refactor streams to use the new chunk module ([2977d75](https://github.com/Effect-TS/core/commit/2977d755440b34cda2dd73da4d75801a0cc57c00))
* **streams:** remove conduit port from experiments in favour of zio 2.0 variant ([6856144](https://github.com/Effect-TS/core/commit/6856144417607c0a6912aefc75c0dbdc1fb5f6da))





# [0.29.0](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.13...@effect-ts/core@0.29.0) (2021-04-09)


### Features

* **collections:** restructure collections, begin mutable hashmap ([801be17](https://github.com/Effect-TS/core/commit/801be17cb90a7ca06a2e724c4406d7eed2440318))
* **hub:** initial port ([8dfd937](https://github.com/Effect-TS/core/commit/8dfd937ffc9c1c1e2e706bf0a0cf709fb1c0d595))


### BREAKING CHANGES

* **collections:** The import path for collection is changed





## [0.28.13](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.12...@effect-ts/core@0.28.13) (2021-04-06)

**Note:** Version bump only for package @effect-ts/core





## [0.28.12](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.11...@effect-ts/core@0.28.12) (2021-04-06)

**Note:** Version bump only for package @effect-ts/core





## [0.28.11](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.10...@effect-ts/core@0.28.11) (2021-04-06)


### Features

* **system:** embed tracing utils into system ([0cf1cfb](https://github.com/Effect-TS/core/commit/0cf1cfb79392ec3d53b01e21e5826763c6ea4d9a))
* **tracing-plugin:** add exceptions for system and core ([83736c9](https://github.com/Effect-TS/core/commit/83736c978863ade8b6c3fd2e46069ff5d452b92f))





## [0.28.10](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.9...@effect-ts/core@0.28.10) (2021-04-05)


### Features

* **build-tools:** write build-tools in terms of effect ([b2c6dbb](https://github.com/Effect-TS/core/commit/b2c6dbb401dc647050bc8b736722e113783cae19))





## [0.28.9](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.8...@effect-ts/core@0.28.9) (2021-04-05)


### Features

* **build-utils:** publish build utils ([6ae5788](https://github.com/Effect-TS/core/commit/6ae5788bfbef1ed8f1e59603798cced8b2aac55a))





## [0.28.8](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.7...@effect-ts/core@0.28.8) (2021-04-05)

**Note:** Version bump only for package @effect-ts/core





## [0.28.7](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.6...@effect-ts/core@0.28.7) (2021-04-04)

**Note:** Version bump only for package @effect-ts/core





## [0.28.6](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.5...@effect-ts/core@0.28.6) (2021-04-04)

**Note:** Version bump only for package @effect-ts/core





## [0.28.5](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.4...@effect-ts/core@0.28.5) (2021-04-04)

**Note:** Version bump only for package @effect-ts/core





## [0.28.4](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.3...@effect-ts/core@0.28.4) (2021-04-04)


### Bug Fixes

* project repository and changelogs ([0788729](https://github.com/Effect-TS/core/commit/07887297c4ca1facdddd9065cd8c42d0e28613a2))





## [0.28.3](https://github.com/Effect-TS/core/compare/@effect-ts/core@0.28.3-alpha.1...@effect-ts/core@0.28.3) (2021-04-04)

**Note:** Version bump only for package @effect-ts/core
