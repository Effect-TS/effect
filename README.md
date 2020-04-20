# Introduction

[![codecov.io](http://codecov.io/github/mikearnaldi/matechs-effect/coverage.svg?branch=master)](http://codecov.io/github/mikearnaldi/matechs-effect) [![Greenkeeper badge](https://badges.greenkeeper.io/mikearnaldi/matechs-effect.svg)](https://greenkeeper.io/)

Matechs Effect is a Fully-fledged functional effect system for typescript with a rich standard library including modules for http server & client, logger, orm, cqrs+es, zookeeper leader election, next.js, apollo, rxjs, redux-observables and more.

Docs at [https://arnaldimichael.gitbook.io/matechs-effect/](https://arnaldimichael.gitbook.io/matechs-effect/)

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
| @matechs/prelude              |   beta     |      no      | One stop shop, base effect and nice fp-ts interops.               |![weekly-downloads](https://badgen.net/npm/dw/@matechs/prelude)             |

## Performance
Currently we run only minor benchmarks in ci where we test against `@qio` and `waveguide` as they represent a similar feature-set, the benchmarks may be affected by environmental conditions and they are not necessarily a representation of the production performance where we can expect all those libraries to perform similarly.

Running on a dedicated VM free of load:
```
ma@instance-1:~/matechs-effect/packages/effect$ yarn bench
yarn run v1.22.4
$ yarn ts-node bench/index.ts && yarn ts-node bench/nestedMap.ts && yarn ts-node bench/nestedChain.ts
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/index.ts
effect x 36,044 ops/sec ±0.55% (90 runs sampled)
effect-fluent x 35,726 ops/sec ±0.21% (91 runs sampled)
qio x 34,867 ops/sec ±1.33% (88 runs sampled)
wave x 20,479 ops/sec ±0.46% (85 runs sampled)
promise x 7,519 ops/sec ±0.48% (88 runs sampled)
native x 39,450 ops/sec ±0.28% (89 runs sampled)
Fastest is native
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/nestedMap.ts
effect x 18,364 ops/sec ±0.74% (84 runs sampled)
effect-fluent x 18,586 ops/sec ±0.32% (84 runs sampled)
wave x 5,181 ops/sec ±0.41% (85 runs sampled)
qio x 17,870 ops/sec ±0.87% (87 runs sampled)
Fastest is effect-fluent,effect
$ /home/ma/matechs-effect/node_modules/.bin/ts-node bench/nestedChain.ts
effect x 1,851 ops/sec ±0.26% (89 runs sampled)
effect-fluent x 1,856 ops/sec ±0.20% (90 runs sampled)
wave x 629 ops/sec ±0.37% (88 runs sampled)
qio x 1,813 ops/sec ±0.61% (86 runs sampled)
Fastest is effect-fluent,effect
Done in 94.45s.
ma@instance-1:~/matechs-effect/packages/effect$ 
```

## Thanks

This library would have not been feasibly possible without the strong foundations of [fp-ts](https://github.com/gcanti/fp-ts) and [Waveguide](https://github.com/rzeigler/waveguide) from which we have forked the base bifunctor and execution runtime, huge thanks to the Authors.

This library was initially based on Fluture, huge thanks to the Authors.

Another huge thanks goes to both the scala community (ZIO in specific) and the haskell community (RIO & Polysemy) from which inspiration is taken.

All of the above projects are advised!

## Get in touch
The best place to reach out would be either in https://fpchat-invite.herokuapp.com (FP Chat, channel #matechs) or for italians https://italiajs.herokuapp.com/ (Italia JS, @Michael Arnaldi or channel #fp)
