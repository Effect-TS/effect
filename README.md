# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect) [![Known Vulnerabilities](https://snyk.io/test/github/Matechs-Garage/matechs-effect/badge.svg)](https://snyk.io/test/github/Matechs-Garage/{matechs-effect})

Matechs Effect is a Fully-fledged functional effect system for typescript with a rich standard library including modules for http server & client, logger, orm, cqrs+es, zookeeper leader election, next.js, apollo, rxjs, redux-observables and more.

Docs at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/)

## Folders
* packages : core packages
* packages_inc : projects in incubation stage
* packages_sys : system level utilities
* packages_http : http related utilities (client/server)
* packages_fe : frontend related utilities (pure client)
* packages_be : backend related utilities (pure server)

## Note on Docs
Docs are meant to be only for introduction to the architecture but are still outdated, for proper usage refer to the test & demo packages in each package

## Details

For details about the additional types and overloads please refer to documentation in `packages/effect`

## Notes

This package is a work in progress syntax and functions might change, feedback are welcome and contributions even more!

## Videos
26-03-2020 Introduction call, basic explaination of the effect library and showcase of examples:
[https://vimeo.com/401143293](https://vimeo.com/401143293)

## License
The library is released with an MIT license and the codebase is fully open-source please read: 
[LICENSE.md](https://github.com/mikearnaldi/matechs-effect/blob/master/LICENSE.md)

As with any good library there is a commercial project that support the development and maintainance, if you want to know more find us at [https://www.matechs.com/](https://www.matechs.com/) we are a digital accelerator looking for smart founders!

## Stability Grid
|      Package                  | API Stage  | Used in Prod |                            Description                            |                                 Weekly NPM                                 |
|-------------------------------|------------|--------------|-------------------------------------------------------------------|----------------------------------------------------------------------------|
| @matechs/effect               |   stable   |      yes     | Core package provides all the primitives for effect management.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/effect)              |
| @matechs/http-client          |   stable   |      yes     | Http client specification and shared utilities for http requests. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client)         |
| @matechs/http-client-fetch    |   stable   |      yes     | Http client implementation using a generic fetch instance.        |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client-fetch)   |
| @matechs/http-client-libcurl  |   stable   |      yes     | Http client implementation using libcurl, supports http2 on node. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/http-client-libcurl) |
| @matechs/browser              |   stable   |      yes     | Deals with reading and writing to browser local & sesstion store. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/browser)             |
| @matechs/console              |   stable   |      yes     | Effectified version of node & browser console.                    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/console)             |
| @matechs/rxjs                 |   stable   |      yes     | Integrates RxJS with streams, effect and rx pipe operators.       |![weekly-downloads](https://badgen.net/npm/dw/@matechs/rxjs)                |
| @matechs/epics                |   beta     |      no      | Integrate redux-observable epics in terms of effectful streams.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/epics)               |
| @matechs/rpc                  |   beta     |      yes     | Wire serializable free modules to express for remote consumption. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/rpc)                 |
| @matechs/rpc-client           |   beta     |      yes     | Implement server RPC defined free modules in terms of http client.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/rpc-client)          |
| @matechs/orm                  |   stable   |      yes     | Integrates with TypeORM allowing multi database manage smoothly.  |![weekly-downloads](https://badgen.net/npm/dw/@matechs/orm)                 |
| @matechs/cqrs                 |   beta     |      no      | Embeds feature complete CQRS+ES utility to ORM for PostgreSQL.    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/cqrs)                |
| @matechs/cqrs-es              |   beta     |      no      | Integrates cqrs aggregates with EventStore.                       |![weekly-downloads](https://badgen.net/npm/dw/@matechs/cqrs-es)             |
| @matechs/express              |   beta     |      yes     | Integrates with express and provide utilities to define routes.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/express)             |
| @matechs/tracing              |   beta     |      yes     | Integrates with opentracing-js featuring auto tracing of free mod.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/tracing)             |
| @matechs/graceful             |   beta     |      yes     | Utility to register callbacks to improve graceful exit scenarios. |![weekly-downloads](https://badgen.net/npm/dw/@matechs/graceful)            |
| @matechs/logger               |   stable   |      yes     | Define a generic logger interface and provide a console interpret.|![weekly-downloads](https://badgen.net/npm/dw/@matechs/logger)              |
| @matechs/logger-winston       |   stable   |      yes     | Integrates logger with a winston based interpreter.               |![weekly-downloads](https://badgen.net/npm/dw/@matechs/logger-winston)      |
| @matechs/logger-pino          |   stable   |      no      | Integrates logger with pino & provides pino specific utilities.   |![weekly-downloads](https://badgen.net/npm/dw/@matechs/logger-pino)         |
| @matechs/uuid                 |   beta     |      yes     | Generates v4 uuids with different encodings, classic & short.     |![weekly-downloads](https://badgen.net/npm/dw/@matechs/uuid)                |
| @matechs/zoo                  |   beta     |      yes     | Integrates zookeeper for leader elections.                        |![weekly-downloads](https://badgen.net/npm/dw/@matechs/zoo)                 |
| @matechs/fancy                |   beta     |      no      | Full blown integration with Next.js / React & Mobx.               |![weekly-downloads](https://badgen.net/npm/dw/@matechs/fancy)               |
| @matechs/apollo               |   beta     |      no      | Integrates with apollo-server with full env support in resolvers  |![weekly-downloads](https://badgen.net/npm/dw/@matechs/apollo)              |
| @matechs/test                 |   beta     |      no      | Port of ZIO Test, integrates fast-check & customizable runner.    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/test)                |
| @matechs/test-jest            |   beta     |      no      | Integrates jest as runner for `@matechs/test`.                    |![weekly-downloads](https://badgen.net/npm/dw/@matechs/test-jest)           |
| @matechs/prelude              |   stable   |      yes     | One stop shop, base effect and nice fp-ts interops.               |![weekly-downloads](https://badgen.net/npm/dw/@matechs/prelude)             |
| @matechs/aio                  |   stable   |      yes     | One stop shop, prelude plus useful defaults.                      |![weekly-downloads](https://badgen.net/npm/dw/@matechs/aio)                 |

## Performance
Currently we run only minor benchmarks in ci where we test against `@qio` and `waveguide` as they represent a similar feature-set, the benchmarks may be affected by environmental conditions and they are not necessarily a representation of the production performance where we can expect all those libraries to perform similarly.

Running on a dedicated VM (Cascade Lake CPU) free of load:
```
ma@instance-1:~/matechs-effect/packages/effect$ yarn ts-node bench/index.ts 
yarn run v1.22.4
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/index.ts
effect x 36,523 ops/sec ±0.30% (86 runs sampled)
qio x 34,568 ops/sec ±1.25% (91 runs sampled)
wave x 20,529 ops/sec ±0.29% (85 runs sampled)
promise x 7,579 ops/sec ±0.46% (87 runs sampled)
native x 39,138 ops/sec ±0.26% (90 runs sampled)
Fastest is native
Done in 33.72s.

ma@instance-1:~/matechs-effect/packages/effect$ yarn ts-node bench/nestedChain.ts 
yarn run v1.22.4
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/nestedChain.ts
effect x 1,986 ops/sec ±0.25% (88 runs sampled)
wave x 628 ops/sec ±0.38% (88 runs sampled)
qio x 1,830 ops/sec ±0.38% (88 runs sampled)
Fastest is effect
Done in 21.06s.

ma@instance-1:~/matechs-effect/packages/effect$ yarn ts-node bench/nestedMap.ts 
yarn run v1.22.4
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/nestedMap.ts
effect x 19,723 ops/sec ±0.59% (86 runs sampled)
wave x 5,328 ops/sec ±0.36% (88 runs sampled)
qio x 17,993 ops/sec ±0.68% (87 runs sampled)
Fastest is effect
Done in 21.49s.
```

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!

## Get in touch
The best place to reach out would be either in https://fpchat-invite.herokuapp.com (FP Chat, channel #matechs) or for italians https://italiajs.herokuapp.com/ (Italia JS, @Michael Arnaldi or channel #fp)
