---
"effect": patch
---

Add a `mapError` option to `HttpApiClient.make`, `makeWith`, `group` and `endpoint`. It replaces the typed errors of every client method, and of the streams they return, with one error type; the resulting client is typed as `Client<Groups, E, R, Client.Mapped<MappedE>>`. The mapper receives the group and endpoint identifiers, and `transformResponse` now receives them as a second argument too.

A client is either mapped or unmapped. A `mapError` that may be `undefined`, including an optional property or a `make` options argument that may be `undefined`, is a type error; use `f ?? identity` to map only sometimes.

The constructors now have one overload with `mapError` and one without, so passing them point-free to a higher-order function no longer infers the client type. Use a lambda instead, as in `Effect.flatMap((api) => HttpApiClient.make(api))`.
